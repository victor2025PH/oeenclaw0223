# 企业微信客服通道（wecom-kefu）开发总结与下一步应用

## 一、开发总结

### 1. 目标

在 OpenClaw 中新增**企业微信客服**通道，与现有「企业微信应用」通道并列，实现：用户通过企业微信客服发消息 → 回调到 OpenClaw → Agent 处理 → 通过客服 API 把回复发回用户。

### 2. 已完成内容

| 模块 | 说明 |
|------|------|
| **插件骨架** | `extensions/wecom-kefu/`：Channel 注册（id: wecom-kefu）、配置 schema（corpId、kefuSecret、kefuAppId、token、encodingAESKey）、openclaw.plugin.json |
| **加解密** | `src/crypto.ts`：企业微信回调签名校验（GET/POST）、AES-128-CBC 解密（echostr、Encrypt） |
| **运行时** | `src/runtime.ts`：保存/读取 agent 配置、完整 openclaw 配置、PluginRuntime，供回调和 outbound 使用 |
| **GET 回调** | URL 验证：校验 msg_signature，解密 echostr 并回显，供企业微信客服后台验证回调 URL |
| **POST 回调** | 校验签名、解密 body、解析 XML；对 **text** 消息提取 open_kfid、external_userid、Content |
| **入站投递** | 文本消息 → resolveAgentRoute（channel: wecom-kefu）→ formatAgentEnvelope → finalizeInboundContext → recordInboundSession → dispatchReplyWithBufferedBlockDispatcher；**deliver** 回调内调用客服发送消息 API |
| **客服 API** | `src/kefu-api.ts`：gettoken（corpId + kefuSecret）、send_msg（POST /cgi-bin/kf/send_msg），带 access_token 缓存 |
| **Outbound** | `src/outbound.ts`：解析 to（`wecom-kefu:open_kfid:external_userid` 或 `wecom-kefu:external_userid`），sendText 调用 sendKefuText |

### 3. 参考与依赖

- **reference-extensions/wecom**：入站投递与 outbound 流程参考 wecom 的 `monitor.ts`、`agent/handler.ts`、`outbound.ts`。
- **依赖**：openclaw（peer）、zod、fast-xml-parser；Node 内置 crypto。

### 4. 未实现（可选后续）

- sendMedia（图片/文件等客服消息类型）
- 事件类回调（如会话开始/结束）的详细处理
- 腾讯云控制台「通道」下拉里若没有「企业微信客服」选项，需通过 **openclaw.json 手配** 或向腾讯云申请

---

## 二、下一步：如何应用

### 步骤 1：在 OpenClaw 中安装插件

**方式 A：本仓库即 OpenClaw 工作区**

- 将 `extensions/wecom-kefu` 作为本地扩展给 OpenClaw 加载（具体方式以你使用的 OpenClaw 版本为准，例如在配置里指定 `extensions` 路径或安装为本地包）。

**方式 B：单独部署的 OpenClaw（如服务器）**

- 把本仓库里的 `extensions/wecom-kefu` 整个目录复制到服务器上 OpenClaw 的扩展目录，例如：
  - `~/.openclaw/extensions/wecom-kefu/`
- 在该目录执行：`npm install`（安装 zod、fast-xml-parser 等）。

### 步骤 2：准备企业微信客服侧配置

1. **企业微信管理后台** → **微信客服** → 开启 API，获取：
   - **客服 Secret**（用于 gettoken 和发送消息）
   - 创建或选用一个**客服账号**，记下 **open_kfid**（客服账号 ID）
2. **回调配置**：
   - URL：`https://你的域名/wecom-kefu/callback`（需与 OpenClaw 实际对外暴露的地址一致）
   - Token、EncodingAESKey：自行生成并保存（建议 43 位随机字符串做 EncodingAESKey，Base64 编码）

### 步骤 3：配置 openclaw.json

在 OpenClaw 使用的 `openclaw.json`（例如 `~/.openclaw/openclaw.json`）的 `channels` 中增加：

```json
"wecom-kefu": {
  "enabled": true,
  "agent": {
    "corpId": "你的企业ID",
    "kefuSecret": "微信客服应用的Secret",
    "kefuAppId": "客服账号ID（open_kfid）",
    "token": "回调配置的Token",
    "encodingAESKey": "回调配置的EncodingAESKey",
    "callbackUrl": "https://你的域名/wecom-kefu/callback"
  }
}
```

- **corpId**：企业微信「我的企业」→ 企业 ID  
- **kefuSecret**：微信客服应用里查看的 Secret  
- **kefuAppId**：客服账号的 open_kfid（与回调消息里一致即可）  
- **token / encodingAESKey**：与客服后台填写的回调 Token、EncodingAESKey 一致  
- **callbackUrl**：仅作记录用，实际请求由企业微信发到你部署的 OpenClaw 基址 + `/wecom-kefu/callback`

### 步骤 4：保证回调可访问

- OpenClaw 的 HTTP 服务需对外暴露 **HTTPS**，且基路径能访问到 `/wecom-kefu/callback`。
- 若前面有 Nginx/反向代理，确保该路径转发到 OpenClaw 进程。
- 企业微信客服回调服务器 IP 若需放行，参考[企业微信客服回调说明](https://developer.work.weixin.qq.com/document/path/94670)放行相应出口 IP。

### 步骤 5：启动 / 重载 OpenClaw

- 启动或重启 OpenClaw，使插件与 `channels.wecom-kefu` 配置生效。
- 若支持热重载，也可在修改配置后重载通道配置。

### 步骤 6：验证

1. **URL 验证**：在企业微信客服后台保存回调 URL 时，会发 GET 到该 URL；若配置正确，应验证通过。
2. **发消息**：用户通过企业微信客服发一条文本；OpenClaw 应收到回调并投递到 Agent，回复通过客服 API 发回用户。
3. **日志**：查看 OpenClaw/插件日志中是否有 `[wecom-kefu]` 的入站、投递、deliver 或错误信息，便于排查。

### 步骤 7：若使用腾讯云 OpenClaw(Clawdbot) 控制台

- 控制台「通道」里若没有「企业微信客服」选项，**不能**在控制台里点选添加，只能通过**编辑服务器上的 openclaw.json** 手动加上 `channels.wecom-kefu` 配置。
- 插件需已部署到该实例的 extensions 目录并安装依赖，然后按步骤 3～5 配置与重启。

---

## 五、云服务器应用上不显示「企业微信客服」时在哪里设置

### 为什么控制台里可能没有这个通道

腾讯云 **应用管理 → 通道** 的下拉选项（QQ、企业微信Bot、企业微信应用、飞书、钉钉等）是由**腾讯云产品**维护的。wecom-kefu 是我们在本仓库开发的插件，腾讯云若未把「企业微信客服」做到控制台里，**界面上就不会出现**这一项。

即使界面上没有，只要在**运行 OpenClaw 的那台机器**上做好下面两件事，通道仍然会生效。

### 需要设置的两个地方（都在云服务器上）

| 位置 | 作用 |
|------|------|
| **1. 插件目录** | 让 OpenClaw 能加载 wecom-kefu 插件 |
| **2. 配置文件 openclaw.json** | 启用 wecom-kefu 通道并填写客服参数 |

#### 1. 插件目录（扩展安装）

- **路径**：OpenClaw 使用的扩展目录下的 `wecom-kefu`，例如：
  - **Linux 云服务器**：`/root/.openclaw/extensions/wecom-kefu/`
  - 若你的实例把扩展放在别处，以实际为准（可查 openclaw 文档或现有 wecom 插件所在目录）。
- **操作**：把本仓库里的 `extensions/wecom-kefu` 整份拷贝到上述目录，进入该目录执行 `npm install`。
- 这样 OpenClaw 启动时会加载 wecom-kefu 插件，通道 ID `wecom-kefu` 才会存在。

#### 2. 配置文件（启用通道并填参数）

- **路径**：OpenClaw 读取的主配置，例如：
  - **Linux 云服务器**：`/root/.openclaw/openclaw.json`
- **操作**：编辑该文件，在 **`channels`** 里增加 `wecom-kefu` 段（若已有 `channels` 就只加一段，不要覆盖其它通道），例如：

```json
"channels": {
  "wecom": { ... },
  "wecom-kefu": {
    "enabled": true,
    "agent": {
      "corpId": "你的企业ID",
      "kefuSecret": "微信客服Secret",
      "kefuAppId": "客服账号open_kfid",
      "token": "回调Token",
      "encodingAESKey": "回调EncodingAESKey"
    }
  }
}
```

- 保存后**重启或重载** OpenClaw，配置才会生效。

### 小结

- **应用/控制台界面上没有「企业微信客服」**：属正常，因为该选项由腾讯云控制台决定，我们无法通过插件改变控制台 UI。
- **要让插件在云服务器上生效**：在**同一台运行 OpenClaw 的云服务器**上设置上述两处即可：
  1. **扩展目录**：`~/.openclaw/extensions/wecom-kefu/`（或你实例的实际扩展路径）放插件代码并 `npm install`。
  2. **配置文件**：`~/.openclaw/openclaw.json` 的 `channels` 里增加 `wecom-kefu` 配置。

---

## 三、配置项速查

| 配置键 | 说明 |
|--------|------|
| channels.wecom-kefu.enabled | 是否启用通道，true/false |
| channels.wecom-kefu.agent.corpId | 企业 ID |
| channels.wecom-kefu.agent.kefuSecret | 微信客服应用 Secret（gettoken + 发消息） |
| channels.wecom-kefu.agent.kefuAppId | 客服账号 open_kfid（默认发消息用） |
| channels.wecom-kefu.agent.token | 回调 URL 验证 Token |
| channels.wecom-kefu.agent.encodingAESKey | 回调加解密密钥（43 位 Base64） |
| channels.wecom-kefu.agent.callbackUrl | 记录用，实际以部署为准 |

---

## 四、文档与参考

- 插件说明：`extensions/wecom-kefu/README.md`
- 开发与设计说明：`WECOM_KEFU_DEV.md`
- 配置示例：`reference-extensions/openclaw-channels-sample.json`（见 wecom-kefu 段）
- 企业微信客服：[接收消息和事件](https://developer.work.weixin.qq.com/document/path/94670)、[发送消息](https://developer.work.weixin.qq.com/document/path/94677)、[回调加解密](https://developer.work.weixin.qq.com/document/path/101033)
