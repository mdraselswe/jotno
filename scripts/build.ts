/**
 * `pnpm build`: generate-assets → next build → postbuild.
 *
 * With BUILD_CPUS set (shared hosting such as Hostinger), `next build` runs
 * pinned to that many CPUs with `taskset`. Turbopack and SWC size their thread
 * pools from the CPUs they see (64 on a shared server), which uses up the
 * account's thread limit; then starting any process fails with EAGAIN and the
 * build hangs. Every Node it starts also gets a smaller libuv pool.
 * next.config.ts reads the same variable for the rest of the small-machine
 * settings. Unset: a normal build, nothing pinned.
 */
import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import { buildEnv } from "../src/config/env.ts";

const cpus = buildEnv.BUILD_CPUS;
const env = cpus === undefined ? process.env : { ...process.env, UV_THREADPOOL_SIZE: String(cpus) };

function run(command: string, args: string[]): void {
  const result = spawnSync(command, args, { stdio: "inherit", env });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}

const node = process.execPath;
const nextBin = createRequire(import.meta.url).resolve("next/dist/bin/next");
const nextArgs = [nextBin, "build", ...process.argv.slice(2)];

run(node, ["scripts/generate-assets.ts"]);

const canPin = cpus !== undefined && process.platform === "linux" && !spawnSync("taskset", ["-V"]).error;
if (cpus !== undefined && !canPin)
  process.stdout.write(`build: BUILD_CPUS=${cpus} but taskset is unavailable; not pinned\n`);
if (canPin) {
  process.stdout.write(`build: pinned to ${cpus} CPU(s) (BUILD_CPUS)\n`);
  run("taskset", ["-c", `0-${cpus - 1}`, node, ...nextArgs]);
} else {
  run(node, nextArgs);
}

run(node, ["scripts/postbuild.ts"]);
