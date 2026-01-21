// gen-config.js (CommonJS)
// Generates a minimal sing-box config (Reality TCP only) for stability on Pterodactyl/Zampto.

const fs = require("fs");
const path = require("path");

function mustGetEnv(name) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing required env: ${name}`);
  return v;
}

function getEnv(name, def) {
  const v = process.env[name];
  return (v === undefined || v === "") ? def : v;
}

function isValidPort(p) {
  const n = Number(p);
  return Number.isInteger(n) && n >= 1 && n <= 65535;
}

function main() {
  const pwd = process.cwd();

  // start.sh exports FILE_PATH and DATA_PATH; fallback for safety.
  const FILE_PATH = getEnv("FILE_PATH", path.join(pwd, ".npm"));
  const DATA_PATH = getEnv("DATA_PATH", path.join(pwd, "singbox_data"));

  fs.mkdirSync(FILE_PATH, { recursive: true });
  fs.mkdirSync(DATA_PATH, { recursive: true });

  const UUID = mustGetEnv("UUID");
  const private_key = mustGetEnv("private_key");
  const public_key = mustGetEnv("public_key");

  // Ports: prefer panel-provided env vars; else defaults.
  const REALITY_PORT = getEnv("REALITY_PORT", "40735");
  if (!isValidPort(REALITY_PORT)) throw new Error(`Invalid REALITY_PORT: ${REALITY_PORT}`);

  // Host for share link output (domain or public IP). Optional but recommended.
  const SERVER_HOST = getEnv("SERVER_HOST", "");

  // Reality needs "server_name" and "short_id".
  // Use a common SNI; user can override via env if they want.
  const SERVER_NAME = getEnv("REALITY_SERVER_NAME", "www.bing.com");

  // short_id must be 8 bytes hex (16 hex chars) typically; we generate stable-ish one from UUID if missing.
  let SHORT_ID = getEnv("REALITY_SHORT_ID", "");
  if (!/^[0-9a-fA-F]{16}$/.test(SHORT_ID)) {
    // derive 16 hex chars from uuid (remove dashes, take first 16)
    SHORT_ID = UUID.replace(/-/g, "").slice(0, 16).toLowerCase();
  }

  // sing-box config (Reality inbound + a simple direct outbound)
  const config = {
    log: {
      level: getEnv("LOG_LEVEL", "info"),
      timestamp: true
    },
    inbounds: [
      {
        type: "vless",
        tag: "in-reality-vless",
        listen: "::",
        listen_port: Number(REALITY_PORT),
        users: [
          { uuid: UUID, flow: "xtls-rprx-vision" }
        ],
        tls: {
          enabled: true,
          server_name: SERVER_NAME,
          reality: {
            enabled: true,
            handshake: {
              server: SERVER_NAME,
              server_port: 443
            },
            private_key: private_key,
            short_id: [SHORT_ID]
          }
        }
      }
    ],
    outbounds: [
      { type: "direct", tag: "direct" },
      { type: "block", tag: "block" }
    ],
    route: {
      rules: [
        { protocol: "dns", outbound: "direct" }
      ],
      final: "direct"
    }
  };

  const configPath = path.join(FILE_PATH, "config.json");
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2), "utf8");

  // Share info (not a full client profile; just essentials)
  const lines = [];
  lines.push("=== Sing-box Reality (VLESS) Info ===");
  lines.push(`UUID: ${UUID}`);
  lines.push(`PublicKey: ${public_key}`);
  lines.push(`ServerName(SNI): ${SERVER_NAME}`);
  lines.push(`ShortID: ${SHORT_ID}`);
  lines.push(`RealityPort: ${REALITY_PORT}`);
  if (SERVER_HOST) {
    lines.push(`ServerHost: ${SERVER_HOST}`);
    // A helpful vless reality URI (basic form)
    const uri =
      `vless://${UUID}@${SERVER_HOST}:${REALITY_PORT}` +
      `?encryption=none&security=reality&sni=${encodeURIComponent(SERVER_NAME)}` +
      `&fp=chrome&pbk=${encodeURIComponent(public_key)}` +
      `&sid=${encodeURIComponent(SHORT_ID)}` +
      `&type=tcp&flow=xtls-rprx-vision` +
      `#singbox-reality`;
    lines.push("");
    lines.push("URI:");
    lines.push(uri);
  } else {
    lines.push("WARN: SERVER_HOST not set, URI not generated.");
  }

  const sharePath = path.join(FILE_PATH, "share_links.txt");
  fs.writeFileSync(sharePath, lines.join("\n") + "\n", "utf8");

  console.log(`[gen-config] Wrote config: ${configPath}`);
  console.log(`[gen-config] Wrote share:  ${sharePath}`);
}

try {
  main();
} catch (e) {
  console.error(`[gen-config] ERROR: ${e && e.message ? e.message : e}`);
  process.exit(1);
       }  // 去重但保持顺序
  return [...new Set(out)];
}

function must(name) {
  const v = process.env[name];
  if (!v) {
    console.error(`[CONFIG] 缺少环境变量: ${name}`);
    process.exit(2);
  }
  return v;
}

// ---------- 必需 ----------
const FILE_PATH = must("FILE_PATH");
const UUID = must("UUID");
const privateKey = must("private_key");
const publicKey = must("public_key");

// ---------- 自动识别：面板地址/域名 ----------
const host = pickFirstEnv([
  // 你也可以在面板 Startup 自己指定 SERVER_HOST，优先级最高
  "SERVER_HOST",
  "PANEL_HOST",
  "PUBLIC_HOST",
  "DOMAIN",
  "HOST",
  "HOSTNAME_PUBLIC",
  "SERVER_IP",
  "PUBLIC_IP",
  "IP",
  "P_SERVER_IP",
]) || "127.0.0.1";

// ---------- 自动识别：端口 ----------
// 优先用 TUIC_PORT/HY2_PORT/REALITY_PORT（如果面板有注入）
let tuic = parsePort(process.env.TUIC_PORT || "");
let hy2 = parsePort(process.env.HY2_PORT || "");
let reality = parsePort(process.env.REALITY_PORT || "");

// 如果没有，则从候选端口池里“按顺序分配”
// （很多面板会给一组端口，但变量名不固定）
const pool = collectPortCandidates();

// 兜底默认（你之前那三个）
const fallback = [21621, 40366, 40735];

function fillPorts() {
  const used = new Set();
  function takeFromPool() {
    for (const p of pool) {
      if (!used.has(p)) {
        used.add(p);
        return p;
      }
    }
    return null;
  }
  function takeFallback(i) {
    const p = fallback[i];
    if (!used.has(p)) used.add(p);
    return p;
  }

  // 如果用户/面板显式给了，先占用
  if (tuic) used.add(tuic);
  if (hy2) used.add(hy2);
  if (reality) used.add(reality);

  if (!tuic) tuic = takeFromPool() ?? takeFallback(0);
  if (!hy2) hy2 = takeFromPool() ?? takeFallback(1);
  if (!reality) reality = takeFromPool() ?? takeFallback(2);
}
fillPorts();

// ---------- Reality 相关 ----------
const REALITY_SNI = pickFirstEnv(["REALITY_SNI", "SNI", "SERVER_NAME"]) || "www.bing.com";
const shortId = pickFirstEnv(["REALITY_SHORT_ID", "SHORT_ID"]) || "0123456789abcdef";

// ---------- 证书路径 ----------
const certPath = path.join(FILE_PATH, "cert.pem");
const keyPath = path.join(FILE_PATH, "private.key");
const configPath = path.join(FILE_PATH, "config.json");

// ---------- 生成 sing-box config ----------
const config = {
  log: { disabled: true },
  inbounds: [
    {
      type: "tuic",
      listen: "::",
      listen_port: tuic,
      users: [{ uuid: UUID, password: "admin" }],
      congestion_control: "bbr",
      tls: {
        enabled: true,
        alpn: ["h3"],
        certificate_path: certPath,
        key_path: keyPath,
      },
    },
    {
      type: "hysteria2",
      listen: "::",
      listen_port: hy2,
      users: [{ password: UUID }],
      masquerade: "https://bing.com",
      tls: {
        enabled: true,
        alpn: ["h3"],
        certificate_path: certPath,
        key_path: keyPath,
      },
    },
    {
      type: "vless",
      listen: "::",
      listen_port: reality,
      users: [{ uuid: UUID }],
      tls: {
        enabled: true,
        server_name: REALITY_SNI,
        reality: {
          enabled: true,
          handshake: { server: REALITY_SNI, server_port: 443 },
          private_key: privateKey,
          short_id: [shortId],
        },
      },
    },
  ],
  outbounds: [{ type: "direct", tag: "direct" }],
};

fs.mkdirSync(FILE_PATH, { recursive: true });
fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
console.log("[OK] 已生成配置:", configPath);

// ---------- 生成分享链接（v2rayN 常用）----------
// Reality
const realityLink =
  `vless://${UUID}@${host}:${reality}` +
  `?encryption=none&security=reality&type=tcp` +
  `&sni=${encodeURIComponent(REALITY_SNI)}` +
  `&fp=chrome&pbk=${encodeURIComponent(publicKey)}` +
  `&sid=${encodeURIComponent(shortId)}` +
  `#${encodeURIComponent("Reality")}`;

// TUIC / HY2（自签证书常需要 allow insecure / insecure）
const tuicLink =
  `tuic://${UUID}:admin@${host}:${tuic}` +
  `?alpn=h3&sni=bing.com&allow_insecure=1&congestion_control=bbr` +
  `#${encodeURIComponent("TUIC")}`;

const hy2Link =
  `hysteria2://${UUID}@${host}:${hy2}` +
  `?alpn=h3&sni=bing.com&insecure=1` +
  `#${encodeURIComponent("HY2")}`;

// ---------- 输出节点信息 ----------
const lines = [
  "==================== 节点信息（自动识别）====================",
  `识别到的地址/域名: ${host}`,
  `UUID:          
