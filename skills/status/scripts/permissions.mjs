/**
 * permissions.mjs: print the effective permission matrix and any drift.
 *
 * Reads four sources and never writes anything:
 *   .agents/pawang.json        declared policy (permissions + git)
 *   opencode.json              client gate (read, edit, bash, skill)
 *   .opencode/agents/*.md      per-agent bash rules
 *   .opencode/plugins/*.js     hard denies (checked by name only)
 *
 * Exit code 0 when there is no drift, 1 when a declared value contradicts the
 * client gate or a fixed rule was loosened.
 */

import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const read = (p) => readFileSync(join(root, p), "utf8");
const readJson = (p) => JSON.parse(read(p));

const problems = [];
const notes = [];

// Berkas hilang berarti sehat dan memakai default; JSON rusak berarti peringatan.
// Keduanya tidak boleh membuat skrip ini berhenti, karena /status justru dipakai saat ada yang tidak beres.
function load(file) {
  if (!existsSync(join(root, file))) {
    if (file === ".agents/pawang.json") notes.push(`${file} is missing; using built-in defaults`);
    return null;
  }
  try {
    return readJson(file);
  } catch (err) {
    problems.push(`${file} is not valid JSON (${err.message.split("\n")[0]}); tell the user to fix it`);
    return null;
  }
}

const pawang = load(".agents/pawang.json") ?? {};
const opencode = load("opencode.json") ?? {};
const perms = pawang.permissions ?? {};
const git = pawang.git ?? {};
const client = opencode.permission ?? {};

const oneOf = (value, allowed, name) => {
  if (!allowed.includes(value)) problems.push(`${name} is ${value}, expected one of ${allowed.join(", ")}`);
};

oneOf(perms.fileEdit ?? "allow", ["allow", "ask", "deny"], "permissions.fileEdit");
oneOf(perms.network ?? "ask", ["allow", "ask", "deny"], "permissions.network");
oneOf(perms.installDependency ?? "ask", ["allow", "ask", "deny"], "permissions.installDependency");
oneOf(perms.deploy ?? "ask", ["allow", "ask", "deny"], "permissions.deploy");

if ((perms.secrets ?? "deny") !== "deny") {
  problems.push("permissions.secrets must stay deny; it is a fixed rule, not a preference");
}
if ((perms.destructiveGit ?? "deny") !== "deny") {
  problems.push("permissions.destructiveGit must stay deny; it is a fixed rule, not a preference");
}

const editDefault = client.edit?.["*"] ?? "allow";
if ((perms.fileEdit ?? "allow") !== editDefault) {
  problems.push(`permissions.fileEdit is ${perms.fileEdit ?? "allow"}, but opencode.json edit "*" is ${editDefault}`);
}

const secretReadDenied = ["*.env", "*.dev.vars"].every((k) => client.read?.[k] === "deny");
if (!secretReadDenied) {
  problems.push("opencode.json read must deny *.env and *.dev.vars; secrets are a fixed rule");
}

const clientPush = client.bash?.["git push*"] ?? "allow";
const push = git.push ?? "ask";
oneOf(push, ["ask", "auto"], "git.push");
oneOf(git.commit ?? "ask", ["ask", "auto"], "git.commit");
oneOf(git.merge ?? "ask", ["ask", "auto"], "git.merge");
oneOf(git.branchCleanup ?? "ask", ["ask", "auto", "keep"], "git.branchCleanup");
if (push === "auto" && clientPush === "deny") {
  problems.push("git.push is auto but the client denies git push, so it can never run");
}
if (push === "ask" && clientPush === "allow") {
  notes.push("git.push is ask but the client will not prompt; the Pawang question is the only gate");
}

function frontmatter(text) {
  const m = text.match(/^---\n([\s\S]*?)\n---/);
  return m ? m[1] : "";
}

function bashRules(file) {
  const lines = frontmatter(read(file)).split("\n");
  let inside = false;
  let base = 0;
  const rules = {};
  let fallback = null;
  for (const line of lines) {
    if (/^\s*bash:\s*$/.test(line)) {
      inside = true;
      base = line.match(/^\s*/)[0].length;
      continue;
    }
    if (!inside) continue;
    if (line.trim() === "") continue;
    const indent = line.match(/^\s*/)[0].length;
    if (indent <= base) break;
    const i = line.lastIndexOf(":");
    if (i < 0) continue;
    const key = line.slice(0, i).trim().replace(/^"|"$/g, "");
    const value = line.slice(i + 1).trim();
    if (key === "*") fallback = value;
    else rules[key] = value;
  }
  return { fallback, rules };
}

const agentsDir = join(root, ".opencode/agents");
const agents = existsSync(agentsDir)
  ? readdirSync(agentsDir)
      .filter((f) => f.endsWith(".md"))
      .sort()
      .map((f) => {
        const { fallback, rules } = bashRules(join(".opencode/agents", f));
        return { name: f.replace(/\.md$/, ""), fallback, rules };
      })
  : [];

if (!agents.length) notes.push("no agent frontmatter found; client per-agent rules unknown");

const build = agents.find((a) => a.name === "build");
if (build && build.fallback === "allow") {
  problems.push('build agent bash fallback is allow; it should be ask or deny');
}

const pluginDir = join(root, ".opencode/plugins");
const pluginFiles = existsSync(pluginDir) ? readdirSync(pluginDir).filter((f) => f.endsWith(".js")) : [];

const line = [
  `edit ${perms.fileEdit ?? "allow"}`,
  `secrets ${perms.secrets ?? "deny"} (fixed)`,
  `network ${perms.network ?? "ask"}`,
  `install ${perms.installDependency ?? "ask"}`,
  `deploy ${perms.deploy ?? "ask"}`,
  `destructive git ${perms.destructiveGit ?? "deny"} (fixed)`,
].join("; ");

const gitLine = [
  `commit ${git.commit ?? "ask"}`,
  `merge ${git.merge ?? "ask"}`,
  `push ${push}`,
  `cleanup ${git.branchCleanup ?? "ask"}`,
].join(", ");

const agentLine = agents
  .map((a) => `${a.name} ${a.fallback ?? "unset"}`)
  .join("; ");

console.log(`Permissions: ${line}.`);
console.log(`Git: ${gitLine}.`);
console.log(`Client: opencode push ${clientPush}; agents ${agentLine}.`);
console.log(`Declared only (no client mapping): network, installDependency, deploy; plugins ${pluginFiles.length ? pluginFiles.join(", ") : "none"}.`);
if (notes.length) notes.forEach((n) => console.log(`NOTE: ${n}`));
if (problems.length) {
  problems.forEach((p) => console.log(`DRIFT: ${p}`));
  process.exit(1);
}
console.log("Drift: none.");
