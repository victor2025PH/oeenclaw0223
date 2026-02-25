# 服务器部署 wecom-kefu 插件说明

当仓库中已包含 `extensions/wecom-kefu` 后，在运行 OpenClaw 的服务器上按以下步骤部署。

**服务器路径约定**：以下以 OpenClaw 安装目录为 `/root/.openclaw` 为例；若实际不同，请替换为你的路径。

---

## 1. 拉取代码

在已 clone 的 oeenclaw0223 仓库目录执行：

```bash
cd /root/.openclaw/workspace   # 或你 clone 到的目录
git pull origin main
```

若尚未 clone，先 clone 再 pull：

```bash
git clone https://github.com/victor2025PH/oeenclaw0223.git
cd oeenclaw0223
git pull origin main
```

---

## 2. 部署插件

将仓库中的 `extensions/wecom-kefu` 复制到 OpenClaw 的扩展目录：

```bash
# 假设仓库在 /root/.openclaw/workspace
cp -r /root/.openclaw/workspace/extensions/wecom-kefu /root/.openclaw/extensions/wecom-kefu
cd /root/.openclaw/extensions/wecom-kefu
npm install
```

---

## 3. 启用通道（编辑 openclaw.json）

编辑服务器上的 `openclaw.json`（如 `/root/.openclaw/openclaw.json`），在 `channels` 中增加 `wecom-kefu` 段。

**字段说明**（企业微信客服能力）：

| 字段 | 说明 |
|------|------|
| `corpId` | 企业微信企业 ID |
| `kefuSecret` | 企业微信客服应用 Secret |
| `kefuAppId` | 客服应用 ID / 相关 ID（以企业微信客服文档为准） |
| `token` | 回调 URL 校验用 Token（与企业微信客服后台填写一致） |
| `encodingAESKey` | 回调消息加解密用 EncodingAESKey |

**示例**（请替换为实际值后再启用）：

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
      "encodingAESKey": "YOUR_ENCODING_AES_KEY"
    }
  }
}
```

保存后，若 OpenClaw 支持热重载则可能自动生效；否则需重启。

---

## 4. 重启 OpenClaw

按当前运行方式重启或重载服务，例如：

- 若由 systemd 管理：`systemctl restart openclaw`（或实际服务名）
- 若为前台进程：结束进程后重新启动 OpenClaw
- 若支持重载：按官方文档执行重载命令

---

## 5. 验证

1. **插件加载**：查看 OpenClaw 日志，确认无 wecom-kefu 相关报错。
2. **企业微信客服后台**：配置回调 URL（需为公网可访问的 HTTPS，指向本插件注册的回调路径），并填写与 `openclaw.json` 中一致的 Token、EncodingAESKey。
3. 在企业微信侧发起一次客服会话或测试消息，确认回调可达且 OpenClaw 能正常处理。

---

## 路径汇总（本机示例）

| 项目 | 路径 |
|------|------|
| 仓库目录 | `/root/.openclaw/workspace` |
| 插件源码（仓库内） | `extensions/wecom-kefu` |
| OpenClaw 扩展目录 | `/root/.openclaw/extensions` |
| 部署后插件路径 | `/root/.openclaw/extensions/wecom-kefu` |
| OpenClaw 主配置 | `/root/.openclaw/openclaw.json` |

若服务器路径不同，请将上述路径替换为实际环境中的路径。
