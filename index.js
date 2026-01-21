#!/usr/bin/env node
const fs = require("fs");
const { execSync } = require("child_process");

function run(cmd) {
  console.log(`[BOOT] ${cmd}`);
  execSync(cmd, { stdio: "inherit" });
}

try {
  console.log("[BOOT] cwd =", process.cwd());
  console.log("[BOOT] node =", process.version);

  // 优先跑 start.sh（适合你这种 singbox 脚本项目）
  if (fs.existsSync("./start.sh")) {
    run("bash ./start.sh");
    process.exit(0);
  }

  // 备用：编译产物 dist
  if (fs.existsSync("./dist/index.js")) {
    run("node ./dist/index.js");
    process.exit(0);
  }

  // 备用：源码 src
  if (fs.existsSync("./src/index.js")) {
    run("node ./src/index.js");
    process.exit(0);
  }

  console.error("[BOOT] 未找到可启动入口文件：");
  console.error("  - ./start.sh");
  console.error("  - ./dist/index.js");
  console.error("  - ./src/index.js");
  console.error("请检查是否上传完整项目到 /home/container 根目录");
  process.exit(1);
} catch (e) {
  console.error("[BOOT] 启动失败，退出码：", e.status ?? "unknown");
  process.exit(e.status ?? 1);
}
