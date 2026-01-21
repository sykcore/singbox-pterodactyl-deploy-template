// index.js (Panel main entry)
// This file is required by the panel.
// It delegates everything to start.sh and keeps the process in foreground.

const { spawn } = require("child_process");

function main() {
  // Prefer bash. If bash not available, fallback to sh.
  const tryBash = spawn("bash", ["./start.sh"], { stdio: "inherit" });

  tryBash.on("error", (err) => {
    console.error("[index] bash failed:", err?.message || err);
    console.error("[index] fallback to sh ./start.sh ...");

    const trySh = spawn("sh", ["./start.sh"], { stdio: "inherit" });
    trySh.on("exit", (code) => process.exit(code ?? 1));
  });

  tryBash.on("exit", (code) => {
    process.exit(code ?? 1);
  });
}

main();  process.exit(1);
} catch (e) {
  console.error("[BOOT] 启动失败，退出码：", e.status ?? "unknown");
  process.exit(e.status ?? 1);
}
