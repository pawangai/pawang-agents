/**
 * Lapisan kedua (defense in depth) untuk file rahasia dan git destruktif.
 *
 * Penegakan UTAMA ada di izin native OpenCode:
 *   - opencode.json  -> permission.read / permission.edit (berlaku untuk semua agent,
 *     karena izin global digabung ke tiap agent sebelum aturan agent itu sendiri)
 *   - .opencode/agents/*.md -> permission.bash (deny di akhir blok, aturan terakhir menang)
 *
 * Plugin ini hanya jaring pengaman tambahan lewat hook `tool.execute.before`
 * (melempar Error membatalkan eksekusi; pesannya dikembalikan ke model).
 * JANGAN diandalkan sendirian: ada laporan di repo OpenCode bahwa hook plugin
 * tidak selalu menjangkau subagent (issue #5894) atau tool MCP (#2319), dan
 * pola shell (glob seperti `cat .e*`, variabel, base64) tidak bisa ditangkap
 * oleh pemeriksaan teks.
 *
 * Yang diblokir:
 *   1. File rahasia (.env*, .dev.vars*) lewat argumen tool file dan lewat bash.
 *      Berkas *.example dikecualikan untuk tool file (bash: pakai tool read).
 *   2. Git destruktif di mana pun dalam perintah (termasuk di dalam `bash -c`,
 *      `xargs`, `sudo`, `env`): opsi --force*, reset --hard. `git push` biasa TIDAK
 *      diblokir di sini: agent build memintanya lewat izin native ("ask"), dan
 *      subagent menolaknya lewat izin agent masing-masing.
 *   3. Pesan commit atau deskripsi PR (`git commit`, `gh pr create|edit`) yang memuat
 *      em dash atau atribusi AI (Generated with, Assisted-by, Co-Authored-By dari
 *      nama AI). Co-Authored-By manusia tetap boleh.
 */

// Nama berkas rahasia murni: diawali titik (.env, .env.local, .dev.vars, .dev.vars.prod),
// termasuk pola glob seperti .env* atau .env.?
const SECRET_DOT = /^(\.env|\.dev\.vars)([.*?][^/\\]*)?$/
// Untuk argumen tool file, tambah berkas seperti prod.env / staging.env.
const SECRET_SUFFIX = /\.env$/

const baseName = (p) => p.split(/[\\/]/).pop() ?? ""

const isSecretFileArg = (p) => {
  const name = baseName(p)
  if (name.endsWith(".example")) return false
  return SECRET_DOT.test(name) || SECRET_SUFFIX.test(name)
}

// Untuk token bash hanya bentuk berawalan titik, supaya `process.env` tidak ikut terblokir.
const isSecretBashToken = (t) => {
  const name = baseName(t)
  return SECRET_DOT.test(name)
}

const blockSecret = (what) => {
  throw new Error(
    `Ditolak: ${what} menyentuh file rahasia (.env*, .dev.vars*). Hanya file *.example yang boleh dibaca dengan tool read.`,
  )
}

// Tool file-based dan nama argumennya yang berisi path/pola.
const PATH_ARGS = ["filePath", "path", "file", "pattern", "include"]

const checkFileTool = (args) => {
  for (const key of PATH_ARGS) {
    const v = args[key]
    if (typeof v === "string" && isSecretFileArg(v)) blockSecret(`argumen "${key}"`)
  }
  // apply_patch: path ada di dalam teks patch.
  const patch = args.patchText
  if (typeof patch === "string") {
    for (const line of patch.split("\n")) {
      const m = line.match(/^\*\*\* (?:Add|Update|Delete) File:\s*(.+)$/)
      if (m && isSecretFileArg(m[1].trim())) blockSecret("patch")
    }
  }
}

// Opsi global git sebelum subcommand: -C <dir>, -c <k=v>, --opsi.
const GIT = String.raw`\bgit(?:\s+(?:-C\s+\S+|-c\s+\S+|--[\w-]+(?:=\S+)?))*`
// Batas satu perintah sederhana, supaya tidak menyeberang ke perintah lain.
const REST = String.raw`[^;&|\n]*`

const GIT_RULES = [
  [new RegExp(`${GIT}\\s+push\\b${REST}\\s-[A-Za-z]*f[A-Za-z]*(?:\\s|$)`), "git push -f tidak diizinkan."],
  [new RegExp(`${GIT}\\s+reset\\b${REST}--hard\\b`), "git reset --hard tidak diizinkan."],
  [new RegExp(`${GIT}\\b${REST}\\s--force\\S*`), "git dengan --force* tidak diizinkan."],
]

// Perintah yang menulis teks untuk riwayat: pesan commit dan deskripsi PR.
const MESSAGE_CMD = new RegExp(`${GIT}\\s+commit\\b|\\bgh\\s+pr\\s+(?:create|edit)\\b`)
const AI_NAME = String.raw`(?:claude|anthropic|gpt|openai|chatgpt|copilot|gemini|codex|opencode|cursor|deepseek|\bai\b|\bllm\b)`
const MESSAGE_RULES = [
  [/\u2014/, "em dash (U+2014) tidak boleh ada di pesan commit atau deskripsi PR."],
  [/generated\s+(?:with|by)\b/i, "tanda 'Generated with/by' (atribusi AI) tidak boleh ada di pesan commit atau PR."],
  [/assisted-by\s*:/i, "trailer Assisted-by tidak boleh ada di pesan commit atau PR."],
  [new RegExp(`co-authored-by\\s*:[^\\n]*${AI_NAME}`, "i"), "Co-Authored-By atas nama AI tidak boleh ada. Co-Authored-By manusia tetap boleh."],
]

const checkMessage = (command) => {
  if (!MESSAGE_CMD.test(command)) return
  for (const [re, msg] of MESSAGE_RULES) {
    if (re.test(command)) throw new Error(`Ditolak: ${msg}`)
  }
}

// Isi argumen -m / --message hanya teks, bukan perintah, jadi dikeluarkan dari
// pemeriksaan git destruktif (commit "docs: jelaskan git push" tidak boleh ditolak).
// Bentuk dengan substitusi perintah dibiarkan (kecuali `$(cat <<'EOF' ...)` untuk heredoc),
// supaya `-m "$(git push --force)"` tetap tertangkap.
const stripCommitMessages = (command) => {
  if (!new RegExp(`${GIT}\\s+commit\\b`).test(command)) return command
  const safe = (body) => {
    const inner = body.replace(/^\$\(\s*cat\s*<<-?\s*(['"]?)\w+\1[\s\S]*\)$/, "")
    return !/`|\$\(|\$\{/.test(inner)
  }
  return command
    .replace(/(\s(?:-m|--message(?:=|\s))\s*)"((?:[^"\\]|\\.)*)"/g, (m, pre, body) => (safe(body) ? `${pre}""` : m))
    .replace(/(\s(?:-m|--message(?:=|\s))\s*)'[^']*'/g, "$1''")
}

const checkBash = (command) => {
  // 0) Teks riwayat (commit, PR): tanpa em dash dan tanpa atribusi AI.
  checkMessage(command)

  // 1) Git destruktif: dicari di seluruh string, jadi `bash -c "git push --force"`,
  //    `xargs git reset --hard`, `sudo git ...` ikut tertangkap. Isi pesan commit dikecualikan.
  const scanned = stripCommitMessages(command)
  for (const [re, msg] of GIT_RULES) {
    if (re.test(scanned)) throw new Error(`Ditolak: ${msg}`)
  }

  // 2) Token yang menunjuk file rahasia.
  for (const token of command.split(/[\s"'`|;&<>()=]+/)) {
    if (token && !token.endsWith(".example") && isSecretBashToken(token)) {
      blockSecret(`perintah bash (${token})`)
    }
  }
}

/** @type {import("@opencode-ai/plugin").Plugin} */
export const PermissionsPlugin = async () => {
  return {
    "tool.execute.before": async (input, output) => {
      const args = output.args ?? {}
      if (input.tool === "bash") {
        if (typeof args.command === "string") checkBash(args.command)
        return
      }
      checkFileTool(args)
    },
  }
}

// Catatan: semua ekspor fungsi dari file ini dianggap plugin oleh OpenCode,
// jadi jangan tambah ekspor lain yang bukan Plugin.
