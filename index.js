// index.js - Zampto/Pterodactyl main entry (auto deploy from GitHub on start)
const { spawnSync } = require("child_process");
const fs = require("fs");
const path = require("path");

function run(cmd, args, opts = {}) {
  const r = spawnSync(cmd, args, { stdio: "inherit", ...opts });
  if (r.error) throw r.error;
  if (typeof r.status === "number" && r.status !== 0) {
    throw new Error(`Command failed: ${cmd} ${args.join(" ")} (exit ${r.status})`);
  }
}

function hasGit(dir) {
  return fs.existsSync(path.join(dir, ".git"));
}

function main() {
  const repo = process.env.GIT_REPO;
  if (!repo) {
    console.error("[deploy] Missing env GIT_REPO (e.g. https://github.com/user/repo.git)");
    process.exit(1);
  }

  const branch = process.env.GIT_BRANCH || "main";
  const appDir = path.resolve(process.env.APP_DIR || "app");

  // Build authenticated URL if token provided (for private repos).
  // Note: token in URL may appear in logs depending on git output; keep repo public if possible.
  let repoUrl = repo;
  const token = process.env.GIT_TOKEN;
  if (token && repo.startsWith("https://")) {
    repoUrl = repo.replace("https://", `https://${token}@`);
  }

  if (!fs.existsSync(appDir)) fs.mkdirSync(appDir, { recursive: true });

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
