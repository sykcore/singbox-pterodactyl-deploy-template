# sing-box Panel Universal Template (Reality / TUIC / HY2)

一个适配 **Zampto / Pterodactyl / 大多数 Node 面板**的通用部署模板：  
上传后面板直接启动即可运行 sing-box，并且自动生成：

- ✅ VLESS Reality
- ✅ TUIC
- ✅ Hysteria2 (HY2)

启动时会在控制台打印 **节点信息与分享链接**，同时写入文件：  
`/.npm/share_links.txt`

---

## ✅ 特性

- **通用面板启动**：面板只需要运行 `node index.js`
- **自动识别面板地址/端口**（尽最大可能从环境变量推断）
- **UUID 固定保存**（重启不变）
- **Reality 密钥固定保存**（重启不变）
- 自动生成 `config.json`
- 控制台输出节点分享链接，方便 v2rayN 导入

---

## 📦 目录结构
.
├─ package.json
├─ index.js
├─ start.sh
└─ gen-config.js
---

## 🚀 部署方式（推荐）

### 方式 A：直接上传仓库文件
1. 把本仓库 4 个文件上传到面板服务器的 `/home/` 根目录
2. 确保根目录存在：
   - `index.js`
   - `package.json`
   - `start.sh`
   - `gen-config.js`
3. 面板点击 **Start / Restart**

> 面板通常会自动执行 `npm install`，但此项目无依赖，安装很快。

---

## ✅ 面板启动命令

如果面板允许设置启动命令，建议用：

```bash
node /home/index.js
---

## 🚀 部署方式（推荐）

### 方式 A：直接上传仓库文件
1. 把本仓库 4 个文件上传到面板服务器的 `/home/` 根目录
2. 确保根目录存在：
   - `index.js`
   - `package.json`
   - `start.sh`
   - `gen-config.js`
3. 面板点击 **Start / Restart**

> 面板通常会自动执行 `npm install`，但此项目无依赖，安装很快。

---

## ✅ 面板启动命令

如果面板允许设置启动命令，建议用：

```bash
node /home/index.js
如果面板不允许修改启动命令，只要最终能运行 /home/index.js 即可。

⚙️ 环境变量（可选，强烈建议设置）

此项目支持自动识别地址/端口，但不同面板注入的变量名不统一，
为了迁移稳定，建议至少设置一个变量：

✅ 必填推荐（迁移时只改这一个即可）
变量名	示例	说明
SERVER_HOST	node14.example.com	你的服务器域名/IP（用于生成分享链接）
端口设置（可选）

如果不设置，会尝试自动识别，最后兜底使用默认端口：

变量名	默认值	用途
TUIC_PORT	21621	TUIC 端口（UDP）
HY2_PORT	40366	HY2 端口（UDP）
REALITY_PORT	40735	Reality 端口（TCP）
Reality 相关（可选）
变量名	默认值	说明
REALITY_SNI	www.bing.com	Reality 的 SNI（伪装域名）
REALITY_SHORT_ID	0123456789abcdef	Reality short_id
🔥 端口放行（必须）

Reality / TUIC / HY2 对端口要求不同：

协议	端口	协议栈
Reality (VLESS)	REALITY_PORT	TCP
TUIC	TUIC_PORT	UDP/QUIC
HY2	HY2_PORT	UDP/QUIC

✅ 请在面板 Network/Firewall 中确认以下端口已开放：

REALITY_PORT / TCP

TUIC_PORT / UDP

HY2_PORT / UDP

📌 启动后节点信息在哪里看？

启动成功后控制台会打印类似：

UUID

Reality PublicKey

端口信息

3 条分享链接（Reality / TUIC / HY2）

同时会生成文件：

/home/.npm/share_links.txt


你可以从文件面板直接打开复制。

✅ v2rayN 导入使用
Reality（推荐主用）

直接复制控制台输出的 vless://... 链接，在 v2rayN 里：

从剪贴板导入 URL

TUIC / HY2

如果 TUIC/HY2 导入后无法连接，一般原因如下：

面板没开放 UDP（请确认 UDP 端口）

v2rayN 内核不支持（建议切 sing-box 内核）

自签证书校验失败（链接里已加 allow_insecure=1 / insecure=1）

✅ 常见问题（FAQ）
1）只有 Reality 能通，TUIC / HY2 不通？

✅ 90% 是 UDP 没开或 UDP 被限制。
请检查：

TUIC_PORT/UDP

HY2_PORT/UDP

另外确保 v2rayN 内核支持 TUIC/HY2。

2）重启后 UUID / PublicKey 会变吗？

不会。
UUID 固定保存于：

/home/.npm/uuid.txt


Reality 密钥保存于：

/home/.npm/key.txt

3）迁移到新面板只要改什么？

只要改：

SERVER_HOST

端口不变就不用改；端口不同再改 TUIC_PORT/HY2_PORT/REALITY_PORT。

🧩 说明

TUIC/HY2 使用 TLS（通常是自签证书），客户端需要允许不安全校验

Reality 使用 www.bing.com 作为 SNI 伪装（可通过 REALITY_SNI 修改）
