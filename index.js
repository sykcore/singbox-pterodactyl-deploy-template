// index.js - required by panel, delegates to start.sh
const { spawnSync } = require("child_process");

function run(cmd, args) {
  const r = spawnSync(cmd, args, { stdio: "inherit" });
  if (r.error) return { ok: false, err: r.error };
  return { ok: true, code: r.status ?? 1 };
}

let r = run("bash", ["./start.sh"]);
if (!r.ok) {
  console.error("[index] bash failed:", r.err?.message || r.err);
  console.error("[index] fallback to sh ./start.sh ...");
  const r2 = run("sh", ["./start.sh"]);
  process.exit(r2.code);
}
process.exit(r.code);
  if (!hasGit(appDir)) {
    console.log(`[deploy] Cloning ${repo} (${branch}) -> ${appDir}`);
    // clone into empty dir: use parent then move, easiest is clone directly if dir empty
    // If dir not empty, you should clear it yourself.
    run("git", ["clone", "--depth", "1", "--branch", branch, repoUrl, appDir], { cwd: path.dirname(appDir) });
  } else {
    console.log(`[deploy] Updating repo in ${appDir}`);
    run("git", ["fetch", "--all", "--prune"], { cwd: appDir });
    run("git", ["reset", "--hard", `origin/${branch}`], { cwd: appDir });
  }

  console.log("[deploy] Running start.sh...");
  // Ensure executable; ignore errors if chmod not available.
  try { run("chmod", ["+x", "start.sh"], { cwd: appDir }); } catch {}
  // Run with bash first; fallback to sh.
  let r = spawnSync("bash", ["./start.sh"], { stdio: "inherit", cwd: appDir });
  if (r.error) {
    console.log("[deploy] bash not available, fallback to sh");
    r = spawnSync("sh", ["./start.sh"], { stdio: "inherit", cwd: appDir });
  }
  process.exit(r.status ?? 1);
}

main();
