const { spawnSync } = require("child_process");
const fs = require("fs");

function run(cmd, args, cwd = "/home/container") {
  const r = spawnSync(cmd, args, { stdio: "inherit", cwd });
  if (r.error) throw r.error;
  if (typeof r.status === "number" && r.status !== 0) {
    throw new Error(`Command failed: ${cmd} ${args.join(" ")} (exit ${r.status})`);
  }
}

function main() {
  const repo = process.env.GIT_ADDRESS || "https://github.com/sykcore/singbox-pterodactyl-deploy-template.git";
  const branch = process.env.GIT_BRANCH || "main";
  const hasGit = fs.existsSync("/home/container/.git");

  // require git in image
  run("git", ["--version"]);

  if (!hasGit) {
    console.log(`[deploy] No .git found, cloning ${repo} (${branch}) into /home/container ...`);
    // clone into an empty-ish dir; if not empty, git will refuse.
    run("git", ["clone", "--depth", "1", "--branch", branch, repo, "/home/container"]);
  } else {
    console.log("[deploy] Updating existing repo...");
    run("git", ["pull", "--rebase"], "/home/container");
  }

  console.log("[deploy] Starting start.sh ...");
  run("chmod", ["+x", "./start.sh"]);
  // run start.sh (bash first, fallback sh)
  let r = spawnSync("bash", ["./start.sh"], { stdio: "inherit", cwd: "/home/container" });
  if (r.error) r = spawnSync("sh", ["./start.sh"], { stdio: "inherit", cwd: "/home/container" });
  process.exit(r.status ?? 1);
}

main();  }
  process.exit(r.status ?? 1);
}

main();
