# wecom 自建应用 vs wecom-kefu 回调失败分析

## 一、两个配置的区别

| 项目 | 自建应用（成功） | 微信客服 wecom-kefu（曾失败） |
|------|------------------|------------------------------|
| 企业微信后台入口 | 应用管理 → 某应用 → 消息接收服务器配置 | 微信客服 → 消息接收服务器配置 |
| 回调 URL | `http://106.54.6.105:18789/wecom/agent` | `http://106.54.6.105:18789/wecom-kefu/callback` |
| Token / EncodingAESKey | 与 openclaw.json channels.wecom 一致 | 与 openclaw.json channels.wecom-kefu 一致 |

两者可共用同一套 Token、EncodingAESKey（你当前配置即如此），也可各用一套。

---

## 二、重启后都不能用的原因

1. **网关进程被结束**  
   此前为“重启 OpenClaw”执行了 `kill -TERM` 结束 **openclaw-gateway**，且本机未配置 systemd/pm2 自动拉起。  
   若未在运行 OpenClaw 的机器上重新打开 OpenClaw 应用，**18789 端口没有进程监听**，企业微信无论访问 `/wecom/agent` 还是 `/wecom-kefu/callback` 都会失败。

2. **处理方式**  
   在运行 OpenClaw 的电脑上重新打开/重启 OpenClaw 应用，使网关重新监听 18789，自建应用与客服回调才会恢复。

---

## 三、wecom-kefu 回调验证失败的根本原因（已修复）

**问题**：wecom-kefu 的解密实现与企业微信官方/自建应用 wecom 不一致。

| 项目 | wecom（自建应用） | wecom-kefu（修复前） |
|------|-------------------|----------------------|
| 算法 | **AES-256-CBC** | AES-128-CBC |
| Key | EncodingAESKey Base64 解码 **32 字节**，IV = Key 前 16 字节 | Key 取解码后 **前 16 字节**，IV = 同 16 字节 |
| 填充 | **PKCS#7，block=32**，手动 unpad | setAutoPadding(true)，无 PKCS#7(32) |
| Key 解码 | 无 `=` 时补一个 `=` 再 Base64 解码 | 直接 Base64 解码 |

企业微信回调（含 URL 验证的 echostr）使用 **AES-256-CBC + 32 字节 Key + PKCS#7(block=32)**。wecom-kefu 原先用 AES-128 + 16 字节 Key，解密结果错误，导致 GET 验证时返回 500/“decrypt failed”，企业微信侧显示“请求 OpenAPI 回调地址失败”。

---

## 四、已做的代码修改

**文件**：`extensions/wecom-kefu/src/crypto.ts`

- 与 wecom 对齐：**AES-256-CBC**，Key 为 EncodingAESKey Base64 解码的 **32 字节**，IV 为 Key 的**前 16 字节**。
- 使用 **PKCS#7 block=32** 去填充（与 wecom 的 `pkcs7Unpad(..., 32)` 一致）。
- Key 解码时若无 `=` 则补一个 `=` 再 Base64 解码（与 wecom 的 `decodeEncodingAESKey` 一致）。
- `decrypt(encodingAESKey, encryptedBase64, receiveId?)` 增加可选 `receiveId`，用于校验明文尾部（与 wecom 可选一致）；GET 验证不传 receiveId 即可。

**未改动的逻辑**：

- 路径：wecom 处理 `/wecom/agent`，wecom-kefu 处理 `/wecom-kefu`（含 `/wecom-kefu/callback`），互不冲突。
- 签名校验：两者均为 `msg_signature = sha1(sort(token,timestamp,nonce,echostr).join(''))`，一致。

---

## 五、你这边需要做的

1. **确保 OpenClaw 网关在跑**  
   在运行 OpenClaw 的机器上重新打开/重启 OpenClaw，确认 18789 有进程监听。

2. **部署本次修复**  
   - 若服务器扩展目录从仓库同步：在仓库根执行 `git pull`，再 `cp -r extensions/wecom-kefu /root/.openclaw/extensions/`（或你的实际路径），然后**重启 OpenClaw**。  
   - 或直接在服务器上已存在的 `/root/.openclaw/extensions/wecom-kefu/src/crypto.ts` 应用与仓库中相同的修改后重启。

3. **再次保存企业微信客服回调**  
   在企业微信客服后台保存 `http://106.54.6.105:18789/wecom-kefu/callback`，此时 GET 验证应能通过。

4. **自建应用**  
   网关恢复后，自建应用 `http://106.54.6.105:18789/wecom/agent` 无需改代码即可恢复使用。

---

## 六、小结

- **重启后都不能用**：主要是网关被结束且未重新启动，需在本机重新打开 OpenClaw。
- **wecom-kefu 单独回调失败**：解密算法与 wecom 不一致，已按 wecom 的实现改为 AES-256-CBC + 32 字节 Key + PKCS#7(32)，并同步到仓库；部署该修改并重启 OpenClaw 后，再在企业微信侧保存客服回调即可。
