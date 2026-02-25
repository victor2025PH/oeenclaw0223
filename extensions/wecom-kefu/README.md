# 企业微信客服通道插件 (wecom-kefu)

OpenClaw 的**企业微信客服**通道插件，与「企业微信应用」通道（wecom）并列，对接企业微信客服的会话与消息 API。

## 状态

- **已实现**：
  - Channel 注册、配置 schema、运行时 config；
  - **GET 回调**：URL 验证（签名 + echostr 解密回显）；
  - **POST 回调**：签名校验、解密、XML 解析；**文本消息入站投递** OpenClaw（resolveAgentRoute → formatAgentEnvelope → finalizeInboundContext → recordInboundSession → dispatchReplyWithBufferedBlockDispatcher），回复通过 deliver 调用客服发送消息 API；
  - **Outbound**：`sendText` 解析 `to`（`wecom-kefu:open_kfid:external_userid` 或 `wecom-kefu:external_userid`），调用[企业微信客服发送消息](https://developer.work.weixin.qq.com/document/path/94677)。
- **未实现**：`sendMedia`（客服图片/文件等）、事件类回调的详细处理。

## 配置示例（openclaw.json）

```json
"channels": {
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
```

## 开发

- 对照 `reference-extensions/wecom/` 的入口、channel、webhook、加解密实现。
- 企业微信客服文档：[概述](https://developer.work.weixin.qq.com/document/path/94670)、[回调与加解密](https://developer.work.weixin.qq.com/document/path/101033)。
- 仓库根目录的 `WECOM_KEFU_DEV.md` 有完整开发步骤与配置说明。

## 安装

本地开发：将本目录链接或复制到 OpenClaw 的 `extensions/wecom-kefu`，在 `openclaw.json` 的 `extensions` 中启用并配置 `channels.wecom-kefu`。
