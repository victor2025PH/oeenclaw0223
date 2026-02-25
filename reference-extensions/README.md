# reference-extensions

参考用扩展与配置样本，供本地 Cursor 开发「企业微信客服」通道插件时对照。

## 内容

- **wecom/** — 企业微信**应用**插件源码（@mocrane/wecom）的完整目录，已排除 `node_modules`。
  - 保留：`package.json`、入口 `index.ts`、完整 `src/`（回调、加解密、channel 注册等）。
  - **入站投递与 outbound 参考**：`src/monitor.ts`、`src/monitor/`（state、types）、`src/agent/handler.ts`、`src/agent/api-client.ts`、`src/outbound.ts`；加解密与校验：`src/crypto.ts`、`src/crypto/`（aes、signature、xml）。
  - 配置中的敏感项（CorpID、Secret、Token、EncodingAESKey）来自 `openclaw.json`，不写在此源码中；样本见下。
- **openclaw-channels-sample.json** — 从 `openclaw.json` 提取的 `channels` 结构，已脱敏为占位符（`YOUR_CORP_ID` 等），便于对照实现 wecom-kefu 的配置 schema。

## 使用

- 开发 wecom-kefu 时，可对照 `wecom/` 的入口、回调与加解密实现。
- 在仓库根目录对 wecom 做本地安装依赖：`cd reference-extensions/wecom && npm install`（仅本地开发时可选）。
