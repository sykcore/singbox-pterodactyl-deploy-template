#!/usr/bin/env node
const fs = require("fs");
const path = require("path");

function pickFirstEnv(names) {
  for (const n of names) {
    const v = process.env[n];
    if (v && String(v).trim()) return String(v).trim();
  }
  return "";
}

function parsePort(v) {
  const n = Number(String(v).trim());
  if (Number.isInteger(n) && n > 0 && n < 65536) return n;
  return null;
}

function collectPortCandidates() {
  // 常见面板/应用端口变量名（尽量多兜底）
  const keys = [
    "TUIC_PORT", "HY2_PORT", "REALITY_PORT",
    "SERVER_PORT", "PORT", "APP_PORT",
    "PORT0", "PORT1", "PORT2", "PORT3",
    "SERVER_PORT_0", "SERVER_PORT_1", "SERVER_PORT_2", "SERVER_PORT_3",
    "P_SERVER_PORT", "P_SERVER_PRIMARY_PORT",
  ];

  const out = [];
  for (const k of keys) {
    if (process.env[k]) {
      const p = parsePort(process.env[k]);
      if (p) out.push(p);
    }
  }

  // 去重但保持顺序
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
