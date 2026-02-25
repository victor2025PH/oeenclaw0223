# OpenClaw 通道与源码分析报告

## 一、服务器上可拿到的源码与配置

### 1. 本仓库（d:\oeenclaw0223-main / GitHub oeenclaw0223）

- **内容**：OpenClaw **本地工作区**——skills、AGENTS.md、.openclaw 工作区状态、.clawhub 等。
- **不包含**：腾讯云控制台「应用管理 → 通道」的前端/后端代码；无法通过改本仓库直接新增「企业微信客服」通道类型。

---

### 2. 腾讯云控制台「应用管理 → 通道」

- **结论**：该控制台由**腾讯云产品**提供，在**本服务器上未发现**其前端或后端源码。
- **已排查**：
  - `/root`：仅有 OpenClaw 配置、工作区、扩展安装目录，无控制台项目。
  - `/usr/local/qcloud`：为腾讯云主机监控/代理（stargate、YunJing、TAT 等），**不是** OpenClaw 控制台或通道管理代码。
  - 未发现 `openclaw-cloud` 或类似名称的控制台仓库。
- **含义**：无法在服务器上通过改代码，在控制台里「增加一个企业微信客服」下拉选项；只能通过产品工单或自建控制台实现该 UI。

---

### 3. OpenClaw 本地配置与通道插件（可拿到、可改）

| 位置 | 说明 |
|------|------|
| `/root/.openclaw/openclaw.json` | 主配置：含 `channels.wecom` 等通道配置、插件启用列表、模型等。可编辑。 |
| `/root/.openclaw/extensions/wecom` | 企业微信**应用**插件（@mocrane/wecom）：webhook + 被动回复，**不是**企业微信客服 API。 |
| `/root/.openclaw/extensions/qqbot` | QQ 通道插件。 |
| `/root/.openclaw/extensions/ddingtalk` | 钉钉通道插件。 |
| `/root/.openclaw/extensions/adp-openclaw` | 腾讯云 ADP 通道插件。 |

- **wecom 插件**：实现的是企业微信**自建应用**（CorpID、Secret、AgentID、Token、EncodingAESKey、回调 URL），与**企业微信客服**（客服会话、分配、消息收发、客服工具栏等）是两套不同 API。
- 这些扩展是 **npm 安装后的本地拷贝**（含源码），可读可改；但插件升级可能覆盖本地修改，若长期维护建议 fork 或发布私有包。

---

## 二、结论汇总

| 你的目标 | 服务器/本仓库能否实现 |
|----------|------------------------|
| 在腾讯云控制台「通道」里新增「企业微信客服」选项 | **否**。控制台源码不在本机，需腾讯云产品侧或自建控制台。 |
| 在 OpenClaw 侧对接企业微信客服 API（会话、消息回调） | **可以**。在**通道插件**层实现：扩展 wecom 或新建「企业微信客服」插件，在 openclaw.json 中增加对应 channel 配置。 |

---

## 三、给「另一个 Cursor」的开发任务（企业微信客服通道）

以下任务在**本地**（如 d:\oeenclaw0223-main 或单独 clone 的插件仓库）或**新开 Cursor 窗口**中完成，不依赖腾讯云控制台源码。

### 前提

- 仅使用腾讯云控制台、无控制台源码时：控制台里可能没有「企业微信客服」选项，但 OpenClaw 仍可**通过配置文件**启用新通道（若 OpenClaw 支持从 openclaw.json 读取未知 channel 类型并加载对应插件）。
- 若有 openclaw-cloud 或腾讯定制版控制台源码，则需在**该仓库**中增加「企业微信客服」通道类型与表单（后端 + 前端）；本仓库仍只做技能/工作区。

### 任务 A：新增「企业微信客服」OpenClaw 通道插件（推荐）

1. **新建或 fork 一个 OpenClaw 通道插件项目**（与 wecom 同级，例如 `wecom-kefu` 或 fork `@mocrane/wecom` 做客服分支）。
2. **实现企业微信客服适配器**：
   - 参考 [企业微信客服文档](https://developer.work.weixin.qq.com/document/path/94670)：
     - 回调配置与加解密（Token、EncodingAESKey、回调 URL）。
     - 客服会话、消息收发等 API。
   - 在插件中：注册新 channel（如 `id: "wecom-kefu"`），实现：
     - **接收**：HTTP 回调（校验签名、解密、解析事件），将「用户发消息」等转为 OpenClaw 内部消息格式并交给 OpenClaw。
     - **发送**：调用企业微信客服「发送消息」接口，将 OpenClaw 回复下发给用户。
3. **配置模型**（与现有 wecom 类似）：CorpID、客服 Secret、客服 AppID/相关 ID、Token、EncodingAESKey、回调 URL 等；若框架支持，在 openclaw.json 的 `channels` 下增加 `wecom-kefu: { ... }`。
4. **部署**：在 OpenClaw 所在机器上暴露 **HTTPS 回调 URL**，在企业微信客服后台配置该 URL 及 Token、EncodingAESKey；若需放行 IP，在防火墙/安全组放行企业微信客服服务器 IP。

### 任务 B：在现有 wecom 插件上扩展（可选）

- 在 **@mocrane/wecom** 的代码基础上，增加「企业微信客服」模式：
  - 同一插件内支持两种 channel 类型：现有「企业微信应用」+ 新增「企业微信客服」。
  - 共用加解密与 HTTP 框架，分别实现客服的回调与消息 API。
- 注意：wecom 为 npm 包，直接改服务器上的 `extensions/wecom` 会在升级时被覆盖，建议 fork 后发布私有包或通过 npm link 在本地开发后再部署。

### 任务 C：openclaw.json 配置示例（插件开发完成后）

在 `openclaw.json` 的 `channels` 中增加一节，例如：

```json
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
```

（具体字段名以插件 schema 与 OpenClaw 文档为准。）

---

## 四、建议

- **仅用腾讯云控制台、无控制台源码**：  
  - 先确认是否必须用「客服」能力；若只需企业微信内对话，可继续用现有「企业微信应用」通道。  
  - 若必须用客服能力：向腾讯云提工单申请「企业微信客服」通道类型，和/或按**任务 A** 在本地/另一 Cursor 中开发「企业微信客服」OpenClaw 插件，并在服务器 openclaw.json 中配置；控制台若无该选项，可暂时仅通过配置文件启用。
- **有控制台源码**：  
  - 在控制台仓库中新增「企业微信客服」通道类型与表单（后端 + 前端）；  
  - 通道能力仍在 OpenClaw 插件侧按任务 A/B 实现。

---

*文档生成自服务器分析，供「另一个 Cursor」做企业微信客服通道开发时参考。*
