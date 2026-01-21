#!/bin/bash
set -euo pipefail
cd "$(dirname "$0")"

export FILE_PATH="${PWD}/.npm"
export DATA_PATH="${PWD}/singbox_data"
mkdir -p "$FILE_PATH" "$DATA_PATH"

# ------------------ 固定 UUID ------------------
UUID_FILE="${FILE_PATH}/uuid.txt"
if [ -f "$UUID_FILE" ]; then
  export UUID="$(cat "$UUID_FILE")"
  echo "[UUID] 复用固定 UUID: $UUID"
else
  export UUID="$(cat /proc/sys/kernel/random/uuid)"
  printf "%s" "$UUID" > "$UUID_FILE"
  chmod 600 "$UUID_FILE" 2>/dev/null || true
  echo "[UUID] 首次生成并永久保存: $UUID"
fi

# ------------------ 下载 sing-box ------------------
ARCH="$(uname -m)"
BASE_URL=""
if [[ "$ARCH" == arm* ]] || [[ "$ARCH" == aarch64 ]]; then
  BASE_URL="https://arm64.ssss.nyc.mn"
elif [[ "$ARCH" == amd64* ]] || [[ "$ARCH" == x86_64 ]]; then
  BASE_URL="https://amd64.ssss.nyc.mn"
elif [[ "$ARCH" == s390x ]]; then
  BASE_URL="https://s390x.ssss.nyc.mn"
else
  echo "不支持的架构: $ARCH"
  exit 1
fi

download_file() {
  local url="$1"
  local out="$2"
  if command -v curl >/dev/null 2>&1; then
    curl -L -sS -o "$out" "$url"
    echo "[下载] $out (curl)"
  elif command -v wget >/dev/null 2>&1; then
    wget -q -O "$out" "$url"
    echo "[下载] $out (wget)"
  else
    echo "未找到 curl 或 wget"
    exit 1
  fi
}

SB_REAL="${FILE_PATH}/$(head /dev/urandom | tr -dc a-z0-9 | head -c 6)"
download_file "${BASE_URL}/sb" "$SB_REAL"
chmod +x "$SB_REAL"
ln -sf "$SB_REAL" "${FILE_PATH}/sing-box"
export SB_BIN="${FILE_PATH}/sing-box"
echo "[OK] sing-box 已准备: $SB_BIN"

# ------------------ Reality 密钥固定保存 ------------------
KEY_FILE="${FILE_PATH}/key.txt"
if [ -f "$KEY_FILE" ]; then
  echo "[密钥] 检测到已有密钥，复用..."
  export private_key="$(awk '/PrivateKey:/ {print $2}' "$KEY_FILE" | head -n1)"
  export public_key="$(awk '/PublicKey:/ {print $2}' "$KEY_FILE" | head -n1)"
else
  echo "[密钥] 首次生成 Reality 密钥对..."
  output="$("$SB_BIN" generate reality-keypair)"
  printf "%s\n" "$output" > "$KEY_FILE"
  chmod 600 "$KEY_FILE" 2>/dev/null || true
  export private_key="$(printf "%s\n" "$output" | awk '/PrivateKey:/ {print $2}' | head -n1)"
  export public_key="$(printf "%s\n" "$output" | awk '/PublicKey:/ {print $2}' | head -n1)"
  echo "[密钥] 密钥已保存，重启后保持不变"
fi

# ------------------ TLS 证书（TUIC/HY2 用）------------------
if command -v openssl >/dev/null 2>&1; then
  openssl ecparam -genkey -name prime256v1 -out "${FILE_PATH}/private.key" 2>/dev/null
  openssl req -new -x509 -days 3650 -key "${FILE_PATH}/private.key" -out "${FILE_PATH}/cert.pem" -subj "/CN=bing.com" 2>/dev/null
else
  echo "[WARN] 未检测到 openssl：TUIC/HY2 可能无法 TLS；Reality 不受影响"
fi

# ------------------ 让 Node 做自动识别（地址/端口/输出链接）------------------
node ./gen-config.js

echo "[INFO] 节点信息已写入: ${FILE_PATH}/share_links.txt"
echo "------------------------------------------------------------"

# ------------------ 启动 ------------------
exec "$SB_BIN" run -c "${FILE_PATH}/config.json"
