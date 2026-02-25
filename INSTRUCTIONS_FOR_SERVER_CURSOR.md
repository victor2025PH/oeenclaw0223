# 给「服务器上的 Cursor」的指令

本地 Cursor（在 d:\oeenclaw0223-main / GitHub victor2025PH/oeenclaw0223）已收到 `OPENCLAW_CHANNEL_ANALYSIS.md`，将基于该分析开发「企业微信客服」通道插件。为继续开发，需要你从服务器整理并**上传到本 Git 仓库**以下内容。

---

## 你需要做的（任选一种方式）

### 方式一：把以下内容推送到 GitHub 仓库 `victor2025PH/oeenclaw0223`

在服务器上执行后，把新增/修改的文件 commit 并 push 到该仓库（或先下载到本机再 push）。

---

### 1. 打包并上传 wecom 插件源码（必选）

**目的**：本地 Cursor 需要参考现有企业微信插件的结构，才能开发「企业微信客服」插件或在其上扩展。

**操作**：

- 将 `/root/.openclaw/extensions/wecom` 整个目录**复制到本仓库**中，例如放到：
  - `repo-root/reference-extensions/wecom/`  
  或  
  - `repo-root/extensions-wecom-reference/`
- **脱敏**：删除或替换其中的敏感信息（如真实 CorpID、Secret、Token、EncodingAESKey），可改为占位符如 `YOUR_CORP_ID`、`YOUR_SECRET`。
- 保留目录结构：package.json、入口文件、路由/回调实现、加解密逻辑等，以便本地能看出插件如何注册 channel、收消息、发消息。

**命令示例（在服务器上）**：

```bash
# 在仓库根目录下执行（先 clone 或 已有 oeenclaw0223）
mkdir -p reference-extensions
cp -r /root/.openclaw/extensions/wecom reference-extensions/
# 脱敏：用编辑器把 reference-extensions/wecom 里的真实密钥/ID 换成占位符
git add reference-extensions/wecom
git commit -m "chore: add wecom extension source for wecom-kefu reference"
git push
```

---

### 2. openclaw.json 的 channels 结构（脱敏后）（必选）

**目的**：本地需要知道现有 wecom 在 `openclaw.json` 里如何配置，以便为「企业微信客服」设计一致的 `wecom-kefu` 配置格式。

**操作**：

- 从 `/root/.openclaw/openclaw.json` 中**只复制** `channels` 相关片段（可整文件复制再删掉无关部分）。
- **脱敏**：把所有真实 ID、Secret、Token、URL 等替换为占位符（如 `YOUR_CORP_ID`、`YOUR_SECRET`、`https://your-domain.com/...`）。
- 保存到仓库中，例如：
  - `repo-root/reference-extensions/openclaw-channels-sample.json`  
  或  
  - 在 `OPENCLAW_CHANNEL_ANALYSIS.md` 末尾追加「openclaw.json channels 示例」小节并提交。

**示例格式**（字段名以你机器上实际为准）：

```json
{
  "channels": {
    "wecom": {
      "enabled": true,
      "agent": {
        "corpId": "YOUR_CORP_ID",
        "secret": "YOUR_SECRET",
        "agentId": "YOUR_AGENT_ID",
        "token": "YOUR_TOKEN",
        "encodingAESKey": "YOUR_ENCODING_AES_KEY",
        "callbackUrl": "https://your-domain.com/..."
      }
    }
  }
}
```

---

### 3. 其他通道插件结构（可选）

**目的**：若有与 wecom 不同的注册方式或入口，多一个参考可减少试错。

**操作**：

- 从 `/root/.openclaw/extensions/` 再选一个插件（如 `qqbot` 或 `ddingtalk`），复制到 `reference-extensions/qqbot` 或 `reference-extensions/ddingtalk`（同样脱敏后）并 push。
- 若体积过大，可只复制 package.json、入口文件、以及和「注册 channel / 收发消息」相关的少数几个文件。

---

## 方式二：若无法直接 push，请打包发给我

若服务器上没有 Git 或无法 push 到 GitHub：

1. 在服务器上打包：
   - `tar -czvf wecom-extension-ref.tar.gz -C /root/.openclaw/extensions wecom`
   - 脱敏后的 `openclaw-channels-sample.json` 单独保存
2. 把 `wecom-extension-ref.tar.gz` 和 `openclaw-channels-sample.json` 传到网盘或能下载的地址，把链接发给本地开发者；或放到本机后复制进 `d:\oeenclaw0223-main` 的某个目录（如 `reference-extensions/`），本地 Cursor 再基于此开发。

---

## 完成后本地 Cursor 将做什么

- 在仓库中新增「企业微信客服」OpenClaw 通道插件（如 `wecom-kefu` 或扩展 wecom）。
- 实现企业微信客服的回调接收与消息发送，并写好 `openclaw.json` 的配置示例与说明。
- 把可复用的配置示例和部署步骤写进文档（如 `OPENCLAW_CHANNEL_ANALYSIS.md` 或新建 `WECOM_KEFU_SETUP.md`）。

收到你推送的 `reference-extensions/wecom` 和脱敏后的 channels 示例后，本地即可开始开发。
