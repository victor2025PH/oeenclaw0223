# 给「另一个 Cursor」：从 Git 拉取并在服务器上部署 wecom-kefu

本文档供在**服务器上**或**能 SSH 到服务器的机器上**运行的 Cursor 使用：从 Git 拉取 wecom-kefu 相关文件，并部署到该服务器上的 OpenClaw。

---

## 前提

- 仓库已包含 wecom-kefu 插件与文档（见 `GIT_UPLOAD_LIST.md`），并已 push 到远程（如 `https://github.com/victor2025PH/oeenclaw0223`）。
- 服务器上已安装并运行 OpenClaw，且已知：
  - 扩展目录（一般为 `~/.openclaw/extensions/` 或 `/root/.openclaw/extensions/`）；
  - 主配置文件路径（一般为 `~/.openclaw/openclaw.json` 或 `/root/.openclaw/openclaw.json`）；
  - 重启/重载 OpenClaw 的方式（如 systemctl、pm2、或手动重启进程）。

---

## 步骤一：在服务器上拉取仓库最新代码

在**已 clone 该仓库**的目录执行（若未 clone，先 clone 再执行 pull）：

```bash
cd /path/to/oeenclaw0223   # 替换为实际 clone 路径，例如 /root/oeenclaw0223
git pull origin main
```

若尚未 clone：

```bash
git clone https://github.com/victor2025PH/oeenclaw0223.git
cd oeenclaw0223
```

---

## 步骤二：部署插件到 OpenClaw 扩展目录

1. 确认 OpenClaw 扩展目录存在，例如：
   ```bash
   mkdir -p /root/.openclaw/extensions
   ```
2. 将仓库中的 wecom-kefu 复制到扩展目录（若已存在则覆盖）：
   ```bash
   cp -r extensions/wecom-kefu /root/.openclaw/extensions/
   ```
   （若扩展目录不是 `/root/.openclaw/extensions`，请替换为实际路径。）
3. 安装插件依赖：
   ```bash
   cd /root/.openclaw/extensions/wecom-kefu
   npm install
   cd -
   ```

---

## 步骤三：在 openclaw.json 中启用 wecom-kefu 通道

1. 编辑 OpenClaw 主配置：
   ```bash
   nano /root/.openclaw/openclaw.json
   ```
   或使用 vi / vim 等。
2. 在 **`channels`** 中增加 **`wecom-kefu`** 段（若已有 `channels`，只追加一段，勿删其它通道），例如：

   ```json
   "channels": {
     "wecom": { ... },
     "wecom-kefu": {
       "enabled": true,
       "agent": {
         "corpId": "填写企业ID",
         "kefuSecret": "填写微信客服Secret",
         "kefuAppId": "填写客服账号open_kfid",
         "token": "填写回调Token",
         "encodingAESKey": "填写回调EncodingAESKey"
       }
     }
   }
   ```

3. 保存并退出。  
   **注意**：`corpId`、`kefuSecret`、`kefuAppId`、`token`、`encodingAESKey` 需由管理员从企业微信客服后台获取并填写，此处仅为占位。

---

## 步骤四：重启或重载 OpenClaw

根据实际运行方式执行其一（示例）：

```bash
# 若用 systemctl
sudo systemctl restart openclaw

# 若用 pm2
pm2 restart openclaw

# 若为手动进程，则先停止再启动（以实际启动命令为准）
```

---

## 步骤五：验证

1. 查看 OpenClaw 日志，确认无 wecom-kefu 相关报错、且插件加载正常。
2. 在企业微信客服后台配置回调 URL（如 `https://服务器域名或IP/wecom-kefu/callback`），保存时应触发 GET 验证并成功。
3. 用户通过企业微信客服发一条文本，确认能收到 AI 回复。

---

## 配置项速查

| 配置键 | 说明 |
|--------|------|
| channels.wecom-kefu.enabled | true 启用 |
| channels.wecom-kefu.agent.corpId | 企业微信企业 ID |
| channels.wecom-kefu.agent.kefuSecret | 微信客服应用 Secret |
| channels.wecom-kefu.agent.kefuAppId | 客服账号 open_kfid |
| channels.wecom-kefu.agent.token | 回调 URL 验证 Token |
| channels.wecom-kefu.agent.encodingAESKey | 回调加解密密钥 |

更完整说明见仓库内 **`WECOM_KEFU_SUMMARY_AND_NEXT_STEPS.md`**。
