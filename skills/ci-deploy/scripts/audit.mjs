#!/usr/bin/env node
// audit.mjs: read-only audit of a Cloudflare Workers repo against the Worker Previews model.
// No dependencies (Node 18+). Never writes to the repo, GitHub, or Cloudflare. Never reads
// .env or .dev.vars. Reads only wrangler configs, package.json, AGENTS.md, workflows, migrations.
//
// Usage: node audit.mjs [project-path] [--remote] [--json]
//   --remote  also run READ-ONLY `gh` and `wrangler` commands (repo settings, ruleset, secret
//             NAMES, resource lists). Anything that cannot be checked is reported UNKNOWN.
//   --json    machine-readable output
// Exit code: 1 when any FAIL, 2 on bad input, else 0.

import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const args = process.argv.slice(2);
const root = path.resolve(args.find((a) => !a.startsWith('--')) || process.cwd());
const remote = args.includes('--remote');
const asJson = args.includes('--json');
if (!fs.existsSync(root) || !fs.statSync(root).isDirectory()) {
  console.error('Project folder not found: ' + root);
  process.exit(2);
}

// The Previews docs state 4.135.0; the wrangler-action README states 4.136.3. Use the higher.
const MIN_WRANGLER = [4, 136, 3];
const SKIP_DIRS = new Set(['node_modules', '.git', '.wrangler', 'dist', 'build', '.next', '.output', '.svelte-kit', 'coverage']);
const RESOURCE_BINDINGS = {
  kv_namespaces: ['id', 'KV'],
  d1_databases: ['database_id', 'D1'],
  r2_buckets: ['bucket_name', 'R2'],
  hyperdrive: ['id', 'Hyperdrive'],
  vectorize: ['index_name', 'Vectorize'],
  analytics_engine_datasets: ['dataset', 'Analytics Engine'],
  pipelines: ['pipeline', 'Pipelines'],
  secrets_store_secrets: ['secret_name', 'Secrets Store'],
};

const findings = [];
const add = (level, area, message, fix = '', unsafe = false) => findings.push({ level, area, message, fix, unsafe });

const read = (f) => { try { return fs.readFileSync(f, 'utf8'); } catch { return null; } };
const exists = (f) => { try { fs.accessSync(f); return true; } catch { return false; } };
const rel = (f) => path.relative(root, f).split(path.sep).join('/') || '.';

function walk(dir, test, out = [], depth = 0) {
  if (depth > 8) return out;
  let entries = [];
  try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return out; }
  for (const e of entries) {
    if (SKIP_DIRS.has(e.name)) continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, test, out, depth + 1);
    else if (test(e.name, p)) out.push(p);
  }
  return out.sort();
}

// JSONC to JSON: drop comments and trailing commas without touching string contents.
function stripJsonc(text) {
  let out = '', i = 0, inStr = false, esc = false;
  const n = text.length;
  while (i < n) {
    const c = text[i];
    if (inStr) {
      out += c;
      if (esc) esc = false; else if (c === '\\') esc = true; else if (c === '"') inStr = false;
      i++; continue;
    }
    if (c === '"') { inStr = true; out += c; i++; }
    else if (text.startsWith('//', i)) { while (i < n && text[i] !== '\n') i++; }
    else if (text.startsWith('/*', i)) { const j = text.indexOf('*/', i + 2); i = j === -1 ? n : j + 2; }
    else { out += c; i++; }
  }
  return out.replace(/,(\s*[}\]])/g, '$1');
}

// True when any workflow already runs `wrangler preview`: then a missing previews block is a blocker.
const wfDir = path.join(root, '.github', 'workflows');
const wfUsePreview = (exists(wfDir) ? fs.readdirSync(wfDir).filter((n) => /\.ya?ml$/.test(n)) : [])
  .some((n) => /wrangler\s+preview(?!\s+(delete|secret|base-config))/.test(read(path.join(wfDir, n)) || ''));

const parseVer = (v) => { const m = /(\d+)\.(\d+)\.(\d+)/.exec(v || ''); return m ? [+m[1], +m[2], +m[3]] : null; };
const lessThan = (a, b) => { for (let i = 0; i < 3; i++) { if (a[i] !== b[i]) return a[i] < b[i]; } return false; };
const MIN_TXT = MIN_WRANGLER.join('.');

function run(cmd, cmdArgs, timeout = 30000) {
  const r = spawnSync(cmd, cmdArgs, { cwd: root, encoding: 'utf8', timeout });
  if (r.error) return { rc: 127, out: String(r.error.message) };
  return { rc: r.status ?? 1, out: (r.stdout || '') + (r.stderr || '') };
}

// ---------- local checks ----------
function checkPackage() {
  const info = { scripts: {}, wranglerSpec: null, wranglerInstalled: null };
  const text = read(path.join(root, 'package.json'));
  if (!text) { add('WARN', 'package', 'No package.json at the project root (monorepo? run the audit per Worker folder).'); return info; }
  let pkg;
  try { pkg = JSON.parse(text); } catch (e) { add('WARN', 'package', 'package.json is not valid JSON: ' + e.message); return info; }
  const deps = { ...(pkg.dependencies || {}), ...(pkg.devDependencies || {}) };
  info.scripts = pkg.scripts || {};
  info.wranglerSpec = deps.wrangler || null;
  const installedPkg = read(path.join(root, 'node_modules', 'wrangler', 'package.json'));
  if (installedPkg) { try { info.wranglerInstalled = JSON.parse(installedPkg).version; } catch { /* ignore */ } }

  if (!info.wranglerSpec) {
    add('FAIL', 'wrangler', 'wrangler is not a project dependency. Workers Builds and Actions use the version in package.json.',
      `Add it as a devDependency at ${MIN_TXT} or newer (a dependency change: needs approval).`);
  } else {
    const installed = parseVer(info.wranglerInstalled);
    const spec = parseVer(info.wranglerSpec);
    if (installed) {
      if (lessThan(installed, MIN_WRANGLER)) add('FAIL', 'wrangler', `Installed wrangler ${info.wranglerInstalled} is older than ${MIN_TXT} (Worker Previews minimum).`, 'Raise the version (a dependency change: needs approval).');
    } else if (spec) {
      if (lessThan(spec, MIN_WRANGLER)) add(/^[\^~]/.test(info.wranglerSpec) ? 'WARN' : 'FAIL', 'wrangler', `wrangler spec ${info.wranglerSpec} has a lower bound below ${MIN_TXT}; node_modules is not installed so the resolved version is unknown.`, 'Install dependencies, then re-run, or raise the version with approval.');
    } else {
      add('INFO', 'wrangler', `wrangler spec '${info.wranglerSpec}': confirm the resolved version is ${MIN_TXT} or newer.`);
    }
  }
  if (typeof info.scripts.build === 'string' && /migrat/i.test(info.scripts.build)) {
    add('WARN', 'migrations', 'The `build` script contains a migration. Workers Builds runs the build command on every branch, so Previews would migrate too.',
      'Move migrations into the deploy command (production) and the Preview command only.');
  }
  return info;
}

function checkAgentsVerify() {
  const t = read(path.join(root, 'AGENTS.md'));
  if (t === null) { add('INFO', 'verify', 'No AGENTS.md found; cannot read the Verify command.'); return; }
  if (!/^\s*[-*]?\s*\**Verify\**\s*:/im.test(t)) {
    add('WARN', 'verify', 'No Verify command documented under Commands in AGENTS.md. Deploy and preview workflows gate on it.', 'Run /ci first.');
  }
}

function checkConfigs(pkgInfo) {
  const files = walk(root, (n) => /^wrangler\.(jsonc|json|toml)$/.test(n));
  const workers = [];
  if (!files.length) { add('FAIL', 'wrangler', 'No wrangler.jsonc, wrangler.json, or wrangler.toml found.', 'Config ownership is /release (cloudflare config).'); return workers; }
  if (files.length > 1) add('INFO', 'monorepo', `${files.length} Worker configs found; each Worker is audited separately.`);
  for (const f of files) {
    const where = rel(f);
    if (f.endsWith('.toml')) { add('UNKNOWN', where, 'wrangler.toml is not parsed by this script (no TOML parser). Review its [previews] tables by hand.'); continue; }
    let cfg;
    try { cfg = JSON.parse(stripJsonc(read(f) || '')); } catch (e) { add('WARN', where, 'Cannot parse config: ' + e.message); continue; }
    const previews = cfg.previews && typeof cfg.previews === 'object' ? cfg.previews : {};
    const hasPreviews = 'previews' in cfg;
    const entry = { path: where, name: cfg.name || null, hasPreviews };
    workers.push(entry);
    const prodResources = Object.keys(RESOURCE_BINDINGS).filter((k) => Array.isArray(cfg[k]) && cfg[k].length);
    const prodProducers = cfg.queues && Array.isArray(cfg.queues.producers) ? cfg.queues.producers : [];

    if (!hasPreviews) {
      if (prodResources.length || prodProducers.length) {
        add(wfUsePreview ? 'FAIL' : 'WARN', where, 'No `previews` block while the Worker has resource bindings. A Preview does not inherit production bindings, so it would fail or, if wired by hand, reach production.' + (wfUsePreview ? '' : ' A workflow does not run Previews yet, but Workers Builds Preview Builds would hit this.'),
          'Add a `previews` block with preview-safe resources before any Preview (config ownership: /release).');
      } else {
        add('INFO', where, 'No `previews` block. Fine for deploy-only use; `preview workers` needs one (it may be empty).');
      }
    }
    for (const key of prodResources) {
      const [idField, label] = RESOURCE_BINDINGS[key];
      const prevList = Array.isArray(previews[key]) ? previews[key] : [];
      const byName = new Map(prevList.map((b) => [b.binding || b.name, b]));
      for (const b of cfg[key]) {
        const bname = b.binding || b.name;
        const pb = byName.get(bname);
        if (!hasPreviews) continue;
        if (!pb) add('FAIL', where, `${label} binding \`${bname}\` has no entry in previews.${key}: the Preview will not have it (UNSAFE to wire to production; error 1101 if the code reads it).`, `Create a preview-safe ${label} resource and declare it under previews.${key}.`);
        else if (pb[idField] != null && pb[idField] === b[idField]) add('FAIL', where, `${label} binding \`${bname}\` in previews points at the SAME resource as production (${idField}=${b[idField]}). Previews would write production data.`, `Point previews.${key} at a separate ${label} resource.`, true);
      }
    }
    // Queue producers: a Preview needs its own queue; consumers cannot target a Preview.
    const prevProducers = previews.queues && Array.isArray(previews.queues.producers) ? previews.queues.producers : [];
    for (const p of prodProducers) {
      const pp = prevProducers.find((x) => x.binding === p.binding);
      if (hasPreviews && !pp) add('WARN', where, `Queue producer \`${p.binding}\` has no entry in previews.queues.producers.`, 'Declare a separate queue for Previews.');
      else if (pp && pp.queue && pp.queue === p.queue) add('FAIL', where, `Queue producer \`${p.binding}\` in previews uses the production queue (${p.queue}); production consumes those messages.`, 'Use a separate queue in previews.queues.producers.', true);
    }
    if (cfg.queues && Array.isArray(cfg.queues.consumers) && cfg.queues.consumers.length) add('WARN', where, 'Queue consumers cannot target a Preview. Messages a Preview sends to a production queue are consumed by production.', 'Point previews.queues.producers at a separate queue.');
    if (cfg.containers && !previews.containers) add('FAIL', where, 'Containers are declared at the top level but not in previews.containers (not inherited).', 'Declare previews.containers.');
    if (cfg.durable_objects && !previews.durable_objects) add('INFO', where, 'Durable Objects get a namespace per Preview automatically. If the code reads env.<DO binding>, also declare previews.durable_objects.bindings or it can fail with error 1101.');
    if (Array.isArray(cfg.services) && cfg.services.length) add('WARN', where, "Service bindings from a Preview call the bound Worker's PRODUCTION deployment.", 'Accept that, or avoid cross-Worker calls in Previews.');
    if (Array.isArray(cfg.workflows) && cfg.workflows.length) add('WARN', where, 'Workflow bindings in a Preview use an existing Workflow (shared instances).', 'Bind the Preview to a dedicated non-production Workflow if isolation matters.');
    if (cfg.triggers && Array.isArray(cfg.triggers.crons) && cfg.triggers.crons.length) add('INFO', where, 'Cron Triggers and routes target production only. Test scheduled logic through a route on the Preview URL.');
    if (Array.isArray(cfg.d1_databases) && cfg.d1_databases.length && hasPreviews) {
      const dir = path.dirname(f);
      const hasMig = fs.readdirSync(dir).some((n) => /^wrangler\.preview-migrations\./.test(n));
      if (!hasMig) add('WARN', where, 'D1 is bound but no wrangler.preview-migrations.jsonc sits next to this config, so preview migrations have no config that targets the preview database.', 'Create it with the same database as previews.d1_databases (apply is a remote action: /data).');
    }
  }
  return workers;
}

function checkWorkflows(workers) {
  const dir = path.join(root, '.github', 'workflows');
  const files = exists(dir) ? fs.readdirSync(dir).filter((n) => /\.ya?ml$/.test(n)).sort() : [];
  const previewsInUse = workers.some((w) => w.hasPreviews);
  if (!files.length) {
    add(previewsInUse ? 'WARN' : 'INFO', 'github-actions', 'No GitHub Actions workflows found.', 'Run /ci for Verify, then /ci-deploy for deploy or preview workflows.');
    return { text: '', files: [], cleanup: false };
  }
  let all = '', cleanup = false, usesPreviewCmd = false;
  for (const n of files) {
    const t = read(path.join(dir, n)) || '';
    all += '\n' + t;
    const where = '.github/workflows/' + n;
    if (/\bpull_request_target\b/.test(t)) add('FAIL', where, '`pull_request_target` is used. It runs with secrets and must never build pull-request code.', 'Use `pull_request` with a fork guard.');
    if (/wrangler\s+preview\s+delete/.test(t)) cleanup = true;
    if (/wrangler\s+preview(?!\s+(delete|secret|base-config))/.test(t)) usesPreviewCmd = true;
    if (/wrangler\s+versions\s+upload/.test(t) || t.includes('--preview-alias')) add('WARN', where, '`wrangler versions upload` / `--preview-alias` makes Version URLs that only reach PRODUCTION resources.', 'Use `wrangler preview` for pull-request previews.');
    if (/CLOUDFLARE_API_TOKEN/.test(t) && !/head\.repo\.full_name/.test(t) && /\bpull_request\b/.test(t)) add('WARN', where, 'Cloudflare credentials are used on pull_request without a fork guard (github.event.pull_request.head.repo.full_name == github.repository).', 'Add the guard to every job that uses Cloudflare credentials.');
    const unpinned = [...t.matchAll(/uses:\s*([^\s@]+)@(main|master|latest)\b/g)];
    if (unpinned.length) add('WARN', where, `Unpinned action reference: ${unpinned.map((m) => m[1] + '@' + m[2]).join(', ')}.`, 'Pin to an exact release tag or full commit SHA.');
  }
  if ((previewsInUse || usesPreviewCmd) && !cleanup) add('WARN', 'cleanup', 'No workflow runs `wrangler preview delete`. Previews pile up after pull requests close (Cloudflare only removes the least recently used Preview at the plan limit).', 'Add the cleanup job through `/ci-deploy preview workers`.');
  return { text: all, files, cleanup };
}

function checkMigrations() {
  if (exists(path.join(root, 'supabase'))) add('INFO', 'supabase', 'supabase/ found: a Preview must use a SEPARATE Supabase project and a separate Hyperdrive config, and its migrations run in the Preview command, not the build command.');
  const sql = walk(root, (n, p) => n.endsWith('.sql') && /(^|\/)(migrations|drizzle)\//.test(rel(p)));
  if (!sql.length) return;
  add('INFO', 'migrations', `${sql.length} migration file(s). Migrations must stay backward compatible (expand, deploy, contract) so \`wrangler rollback\` of code remains safe.`);
  let reported = 0;
  for (const f of sql) {
    const stmts = (read(f) || '').split(';');
    const hits = new Set();
    for (const s of stmts) {
      if (/\bDROP\s+(TABLE|COLUMN)\b/i.test(s)) hits.add('DROP');
      if (/\bRENAME\b/i.test(s)) hits.add('RENAME');
      if (/ALTER\s+COLUMN[^;]*\bTYPE\b/i.test(s)) hits.add('type change');
      if (/ALTER\s+TABLE[^;]*\bADD\b[^;]*NOT\s+NULL/i.test(s) && !/DEFAULT/i.test(s)) hits.add('NOT NULL without default');
    }
    if (hits.size && reported < 10) { reported++; add('WARN', rel(f), `Not backward compatible: ${[...hits].join(', ')}.`, 'Report only; suggest splitting into expand and contract releases. Do not edit the migration.'); }
  }
}

// ---------- remote checks (read-only) ----------
function checkRemote(workers, wf) {
  const gh = run('gh', ['--version']);
  if (gh.rc !== 0) add('UNKNOWN', 'github', 'gh CLI is not installed; GitHub side not checked.');
  else if (run('gh', ['auth', 'status']).rc !== 0) add('UNKNOWN', 'github', 'gh is not authenticated; ruleset and secret names not checked.', 'Run `gh auth login` yourself.');
  else {
    const repo = run('gh', ['repo', 'view', '--json', 'nameWithOwner,deleteBranchOnMerge']);
    let nwo = null, r = null;
    try { r = JSON.parse(repo.out); nwo = r.nameWithOwner; } catch { /* handled below */ }
    if (repo.rc !== 0 || !nwo) add('UNKNOWN', 'github', 'gh repo view failed: not a GitHub repo, or no remote.');
    else {
      if (!r.deleteBranchOnMerge) add('INFO', 'github', 'Automatically delete head branches is OFF.', `Repository setting; offer it, do not change it. Command for the user: gh api -X PATCH repos/${nwo} -f delete_branch_on_merge=true`);
      const rs = run('gh', ['api', `repos/${nwo}/rulesets`]);
      if (rs.rc !== 0) add('UNKNOWN', 'github', 'Could not read rulesets (permissions or plan).');
      else {
        let list = []; try { list = JSON.parse(rs.out || '[]'); } catch { /* keep empty */ }
        if (!list.length) add('WARN', 'github', 'No repository ruleset: nothing forces Verify to pass before merge, and Workers Builds deploys the default branch independently of GitHub Actions.', 'Optional remote choice; see the ruleset reference. Never applied by Pawang.');
        else {
          let requiresChecks = false; const names = [];
          for (const x of list) {
            const d = run('gh', ['api', `repos/${nwo}/rulesets/${x.id}`]);
            try {
              const rules = (JSON.parse(d.out).rules || []);
              const rsc = rules.find((q) => q.type === 'required_status_checks');
              if (rsc) { requiresChecks = true; for (const c of (rsc.parameters?.required_status_checks || [])) names.push(c.context); }
            } catch { /* ignore one ruleset */ }
          }
          if (!requiresChecks) add('WARN', 'github', 'Rulesets exist but none requires status checks.', 'Add required checks (Verify, E2E) in a ruleset the user applies.');
          else add('INFO', 'github', 'Required checks: ' + (names.join(', ') || '(none listed)') + '. Each name must match a workflow job name exactly.');
        }
      }
      if (/secrets\.CLOUDFLARE_API_TOKEN/.test(wf.text)) {
        const s = run('gh', ['api', `repos/${nwo}/actions/secrets`]);
        if (s.rc !== 0) add('UNKNOWN', 'github', 'Could not list Actions secret names.');
        else {
          let have = []; try { have = (JSON.parse(s.out).secrets || []).map((x) => x.name); } catch { /* ignore */ }
          for (const need of ['CLOUDFLARE_API_TOKEN', 'CLOUDFLARE_ACCOUNT_ID']) if (!have.includes(need)) add('FAIL', 'github', `Actions secret ${need} is missing but a workflow uses it.`, `Remote step for the user: gh secret set ${need} (the user types the value).`);
        }
      }
    }
  }

  const bin = path.join(root, 'node_modules', '.bin', 'wrangler');
  if (!exists(bin)) { add('UNKNOWN', 'cloudflare', 'wrangler is not installed locally; install dependencies first. Cloudflare side not checked.'); return; }
  const who = run(bin, ['whoami']);
  if (who.rc !== 0 || /not authenticated/i.test(who.out)) { add('UNKNOWN', 'cloudflare', 'wrangler is not logged in; preview resource IDs not checked.', 'Run `wrangler login` yourself.'); return; }
  const listers = { d1_databases: ['D1', ['d1', 'list', '--json']], kv_namespaces: ['KV', ['kv', 'namespace', 'list']], r2_buckets: ['R2', ['r2', 'bucket', 'list']], hyperdrive: ['Hyperdrive', ['hyperdrive', 'list']] };
  const cache = {};
  for (const w of workers) {
    const cfgText = read(path.join(root, w.path));
    if (!cfgText || w.path.endsWith('.toml')) continue;
    let cfg; try { cfg = JSON.parse(stripJsonc(cfgText)); } catch { continue; }
    for (const [key, [label, cmd]] of Object.entries(listers)) {
      const prev = cfg.previews && Array.isArray(cfg.previews[key]) ? cfg.previews[key] : [];
      if (!prev.length) continue;
      if (!(key in cache)) { const o = run(bin, cmd); cache[key] = o.rc === 0 ? o.out : null; }
      if (cache[key] === null) { add('UNKNOWN', w.path, `Could not list ${label} resources.`); continue; }
      const idField = RESOURCE_BINDINGS[key][0];
      for (const b of prev) {
        if (b[idField] && !cache[key].includes(b[idField])) add('WARN', w.path, `previews.${key} \`${b.binding || b.name}\` (${idField}=${b[idField]}) was not found in this account's ${label} list. Wrong account, placeholder ID, or deleted.`, 'Create the preview resource with /data (a remote action that needs approval).');
      }
    }
  }
}

// ---------- run ----------
const pkgInfo = checkPackage();
checkAgentsVerify();
const workers = checkConfigs(pkgInfo) || [];
const wf = checkWorkflows(workers);
checkMigrations();
if (remote) checkRemote(workers, wf);
else add('INFO', 'remote', 'Remote checks skipped. Re-run with --remote to check the ruleset, secret names, and preview resource IDs (read-only).');

const ORDER = { FAIL: 0, WARN: 1, UNKNOWN: 2, INFO: 3 };
findings.sort((a, b) => ORDER[a.level] - ORDER[b.level]);
const summary = Object.fromEntries(Object.keys(ORDER).map((l) => [l, findings.filter((f) => f.level === l).length]));
const verdict = findings.some((f) => f.unsafe) ? 'UNSAFE' : (summary.FAIL || summary.WARN) ? 'NEEDS WORK' : 'READY';

if (asJson) {
  console.log(JSON.stringify({ root, verdict, workers, summary, findings }, null, 2));
} else {
  console.log(`Project: ${root}`);
  console.log('Workers: ' + (workers.map((w) => `${w.name || '(unnamed)'} (${w.path})`).join(', ') || 'none'));
  console.log('Verdict: ' + verdict + (verdict === 'READY' && summary.UNKNOWN ? ` (${summary.UNKNOWN} item(s) could not be checked)` : ''));
  console.log('Summary: ' + Object.entries(summary).map(([k, v]) => `${k}=${v}`).join(', ') + '\n');
  for (const f of findings) {
    console.log(`[${f.level}] (${f.area}) ${f.message}`);
    if (f.fix) console.log('        fix: ' + f.fix);
  }
}
process.exit(summary.FAIL ? 1 : 0);
