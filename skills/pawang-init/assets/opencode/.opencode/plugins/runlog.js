/**
 * Run log: one JSON line per completed tool call.
 *
 * Purpose: measure a workflow run without reading the transcript by hand.
 * Records the tool name, the call id, the session id, a timestamp, the duration
 * in milliseconds, and a coarse status. It never records arguments, prompts,
 * file contents, or model output, so secrets cannot leak into the log.
 *
 * The log is append-only and rotates by UTC date:
 *   .agents/runlog/YYYY-MM-DD.jsonl
 *
 * Enforcement of permissions stays in `permissions.js`. This plugin only
 * observes. Every failure is swallowed so a broken log never blocks a session.
 */

import { appendFile, mkdir } from "node:fs/promises";
import { join } from "node:path";

const DURATION = new Map();

const status = (metadata) => {
  const code = metadata?.exitCode ?? metadata?.exit_code;
  if (code === undefined || code === null) return "ok";
  return code === 0 ? "ok" : "error";
};

/** @type {import("@opencode-ai/plugin").Plugin} */
export const RunLogPlugin = async ({ directory }) => {
  const dir = directory ? join(directory, ".agents", "runlog") : null;

  const append = async (entry) => {
    if (!dir) return;
    try {
      await mkdir(dir, { recursive: true });
      const day = new Date().toISOString().slice(0, 10);
      await appendFile(
        join(dir, `${day}.jsonl`),
        `${JSON.stringify(entry)}\n`,
        "utf8",
      );
    } catch {
      // measurement must never break the session
    }
  };

  return {
    "tool.execute.before": async (input) => {
      try {
        DURATION.set(input.callID, Date.now());
      } catch {
        // ignore
      }
    },
    "tool.execute.after": async (input, output) => {
      try {
        const started = DURATION.get(input.callID);
        DURATION.delete(input.callID);
        await append({
          ts: new Date().toISOString(),
          session: input.sessionID,
          call: input.callID,
          tool: input.tool,
          ms: started ? Date.now() - started : null,
          status: status(output?.metadata),
        });
      } catch {
        // ignore
      }
    },
  };
};
