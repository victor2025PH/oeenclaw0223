# 企业微信客服通道插件（wecom-kefu）开发说明

## 一、当前状态

- **reference-extensions**：已由服务器 Cursor 推送到 GitHub [victor2025PH/oeenclaw0223](https://github.com/victor2025PH/oeenclaw0223)。
  - `reference-extensions/wecom/`：企业微信**应用**插件完整源码（入口、channel 注册、webhook、加解密、config schema）。
  - `reference-extensions/openclaw-channels-sample.json`：脱敏后的 `channels` 示例（wecom 的 agent 配置）。
- **本工作区**：已创建 `reference-extensions/README.md` 与 `reference-extensions/openclaw-channels-sample.json` 的本地副本；完整 wecom 源码需在已 clone 的仓库中执行 `git pull` 后于 `reference-extensions/wecom/` 查看。
- **extensions/wecom-kefu/**：已实现 Channel 注册、配置、**GET/POST 回调**（签名校验 + AES 解密 + XML 解析）；待对接入站消息交给 OpenClaw 运行时、以及 outbound 发送消息（企业微信客服 API）。

## 二、企业微信客服 vs 企业微信应用

| 能力 | 企业微信应用（wecom） | 企业微信客服（wecom-kefu） |
|------|------------------------|-----------------------------|
| API 体系 | 自建应用：消息回调、被动回复、应用消息 API | 客服：会话分配、客服消息收发、客服工具栏等 |
| 文档 | 自建应用接入、回调与加解密 | [企业微信客服 - 概述](https://developer.work.weixin.qq.com/document/path/94670) |
| 配置 | corpId、corpSecret、agentId、token、encodingAESKey | corpId、客服 Secret、客服相关 ID、token、encodingAESKey、回调 URL |

加解密（Token、EncodingAESKey、回调 URL 校验）与企业微信应用类似，可复用 wecom 插件中的 `src/crypto` 与 HTTP 校验逻辑；消息收发需改用企业微信客服的接口。

## 三、wecom-kefu 插件目标

1. **Channel 注册**：在 OpenClaw 中注册 channel id `wecom-kefu`，与 wecom 并列。
2. **接收**：提供 HTTPS 回调 URL，接收企业微信客服推送的事件（如用户发消息）；校验签名、解密、解析后转为 OpenClaw 内部消息并交给运行时。
3. **发送**：调用企业微信客服「发送消息」等 API，将 OpenClaw 的回复下发给用户。
4. **配置**：在 `openclaw.json` 的 `channels.wecom-kefu` 下配置 corpId、kefuSecret、kefuAppId（或等效 ID）、token、encodingAESKey、callbackUrl 等（具体字段以客服文档与插件 schema 为准）。

## 四、openclaw.json 配置示例（wecom-kefu）

```json
{
  "channels": {
    "wecom": { "enabled": true, "agent": { ... } },
    "wecom-kefu": {
      "enabled": true,
      "agent": {
        "corpId": "YOUR_CORP_ID",
        "kefuSecret": "YOUR_KEFU_SECRET",
        "kefuAppId": "YOUR_KEFU_APP_ID",
        "token": "YOUR_CALLBACK_TOKEN",
        "encodingAESKey": "YOUR_ENCODING_AES_KEY",
        "callbackUrl": "https://your-domain.com/openclaw/wecom-kefu/callback"
      }
    }
  }
}
```

## 五、实现步骤建议

1. **对照 wecom 插件**（在 clone 后的 `reference-extensions/wecom/` 中）：
   - 入口：`index.ts` 中 `register` → `api.registerChannel`、`api.registerHttpHandler`。
   - Channel 定义：`src/channel.ts` 中 `ChannelPlugin`（id、meta、configSchema、gateway.startAccount、outbound 等）。
   - Webhook：`src/monitor.ts` 中注册路径与请求处理；`src/crypto` 用于解密与签名校验。
   - 配置：`src/config/`、`src/config-schema.ts` 与 `buildChannelConfigSchema`。
2. **新建 wecom-kefu 插件包**（如 `extensions/wecom-kefu/` 或独立仓库）：
   - `package.json`：`openclaw.channel.id: "wecom-kefu"`，peerDependency `openclaw`。
   - `openclaw.plugin.json`：`id: "wecom-kefu"`, `channels: ["wecom-kefu"]`。
   - `index.ts`：注册 wecom-kefu ChannelPlugin 与客服回调的 HTTP 处理器。
   - 配置 schema：定义 `wecom-kefu` 的 agent 配置（corpId、kefuSecret、kefuAppId、token、encodingAESKey、callbackUrl 等）。
   - 回调逻辑：校验、解密、解析客服事件 → 转 OpenClaw 消息 → 调用运行时。
   - 发送逻辑：调用企业微信客服发送消息 API。
3. **企业微信客服后台**：配置接收 URL（与 `callbackUrl` 一致）、Token、EncodingAESKey；如需则放行企业微信客服服务器 IP。
4. **部署**：将插件安装到 OpenClaw 的 extensions 目录，在 `openclaw.json` 中配置 `channels.wecom-kefu` 后重启/重载。

## 六、参考链接

- [企业微信客服 - 概述](https://developer.work.weixin.qq.com/document/path/94670)
- [回调配置](https://developer.work.weixin.qq.com/document/path/91116)、[加解密方案](https://developer.work.weixin.qq.com/document/path/101033)
- 本仓库：`OPENCLAW_CHANNEL_ANALYSIS.md`、`reference-extensions/`、`INSTRUCTIONS_FOR_SERVER_CURSOR.md`

---

## 七、给「另一个 Cursor」的后续任务（可选）

若由服务器上的 Cursor 继续开发，可参考本仓库中 `extensions/wecom-kefu/` 已实现的回调与解密，完成：

1. **入站消息交给 OpenClaw**  
   在 `src/http-handler.ts` 中，POST 解密得到 `msg`（含 MsgType、Content、FromUser 等）后，需要转成 OpenClaw 内部消息格式并交给运行时。请对照 **reference-extensions/wecom** 的 `src/monitor.ts`（或同类 handler）中「收到回调后如何调用 runtime/API 投递消息」的实现，在 wecom-kefu 的 POST 分支里补上等效调用（需从 ctx 或插件 API 获取 runtime/投递接口）。

2. **outbound 发送消息**  
   在 `src/channel.ts` 的 `outbound.sendMessage` 中，调用[企业微信客服 - 发送消息](https://developer.work.weixin.qq.com/document/path/94677)接口，将 OpenClaw 的回复发给用户。需要 access_token（用 corpId + kefuSecret 换 token）、open_kfid、external_userid、msg 等参数，具体见客服文档。

3. **如需从仓库拿 wecom 参考**  
   在已 clone 的 oeenclaw0223 仓库根执行 `git pull` 后，在 `reference-extensions/wecom/` 下查看 `src/monitor.ts`、`src/agent/handler.ts` 等，用于对齐入站投递与 outbound 的调用方式。

---

*本文档供在 d:\oeenclaw0223-main 或 clone 的 oeenclaw0223 仓库中开发 wecom-kefu 时使用。*
