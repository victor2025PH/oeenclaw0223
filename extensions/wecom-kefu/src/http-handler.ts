import type { HttpHandler } from "openclaw/plugin-sdk";
import { DEFAULT_ACCOUNT_ID } from "openclaw/plugin-sdk";
import { XMLParser } from "fast-xml-parser";

import { decrypt, verifySignature, verifyMsgSignature } from "./crypto.js";
import { getKefuConfig, getKefuFullConfig, getKefuRuntime } from "./runtime.js";
import { sendKefuText, getDefaultOpenKfid } from "./kefu-api.js";

const xmlParser = new XMLParser({ ignoreAttributes: false });

function parseQuery(url: string): Record<string, string> {
  const u = new URL(url, "http://localhost");
  const out: Record<string, string> = {};
  u.searchParams.forEach((v, k) => {
    out[k] = v;
  });
  return out;
}

async function readBody(req: AsyncIterable<Buffer | Uint8Array>): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks).toString("utf8");
}

function str(obj: unknown): string {
  if (obj == null) return "";
  return String(obj).trim();
}

/**
 * 企业微信客服回调 HTTP 处理器
 * - GET：URL 验证，校验 msg_signature，解密 echostr 并回显
 * - POST：校验签名，解密，解析 XML；文本消息投递 OpenClaw 并异步回复
 */
export const handleWecomKefuWebhookRequest: HttpHandler = async (req, res, ctx) => {
  const path = req.url ? new URL(req.url, "http://localhost").pathname : "";
  if (!path.startsWith("/wecom-kefu")) {
    return undefined;
  }

  const config = getKefuConfig();
  if (!config?.token || !config?.encodingAESKey) {
    res.writeHead(503, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("wecom-kefu not configured");
    return true;
  }

  const token = config.token;
  const encodingAESKey = config.encodingAESKey;

  if (req.method === "GET") {
    const q = parseQuery(req.url ?? "");
    const msgSignature = q.msg_signature ?? "";
    const timestamp = q.timestamp ?? "";
    const nonce = q.nonce ?? "";
    const echostr = q.echostr ?? "";

    if (!msgSignature || !timestamp || !nonce || !echostr) {
      res.writeHead(400, { "Content-Type": "text/plain; charset=utf-8" });
      res.end("missing query params");
      return true;
    }

    if (!verifySignature(msgSignature, token, timestamp, nonce, echostr)) {
      res.writeHead(403, { "Content-Type": "text/plain; charset=utf-8" });
      res.end("invalid signature");
      return true;
    }

    try {
      const plain = decrypt(encodingAESKey, echostr);
      res.writeHead(200, { "Content-Type": "text/plain; charset=utf-8" });
      res.end(plain);
    } catch (err) {
      res.writeHead(500, { "Content-Type": "text/plain; charset=utf-8" });
      res.end("decrypt failed");
    }
    return true;
  }

  if (req.method === "POST" && path.includes("callback")) {
    const raw = await readBody(req);
    let envelope: Record<string, string>;
    try {
      envelope = xmlParser.parse(raw)?.xml ?? {};
    } catch {
      res.writeHead(400, { "Content-Type": "text/plain; charset=utf-8" });
      res.end("invalid xml");
      return true;
    }

    const msgSignature = envelope.MsgSignature ?? envelope.msg_signature ?? "";
    const timestamp = envelope.TimeStamp ?? envelope.timestamp ?? "";
    const nonce = envelope.Nonce ?? envelope.nonce ?? "";
    const encrypt = envelope.Encrypt ?? envelope.encrypt ?? "";

    if (!msgSignature || !timestamp || !nonce || !encrypt) {
      res.writeHead(400, { "Content-Type": "text/plain; charset=utf-8" });
      res.end("missing encrypt params");
      return true;
    }

    if (!verifyMsgSignature(msgSignature, token, timestamp, nonce, encrypt)) {
      res.writeHead(403, { "Content-Type": "text/plain; charset=utf-8" });
      res.end("invalid signature");
      return true;
    }

    let decryptedXml: string;
    try {
      decryptedXml = decrypt(encodingAESKey, encrypt);
    } catch {
      res.writeHead(500, { "Content-Type": "text/plain; charset=utf-8" });
      res.end("decrypt failed");
      return true;
    }

    let msg: Record<string, unknown>;
    try {
      msg = xmlParser.parse(decryptedXml)?.xml ?? {};
    } catch {
      res.writeHead(200, { "Content-Type": "text/plain; charset=utf-8" });
      res.end("");
      return true;
    }

    const msgType = (msg.MsgType ?? msg.msgType ?? "") as string;
    const externalUserId = str(msg.external_userid ?? msg.ExternalUserid);
    const openKfid = str(msg.open_kfid ?? msg.OpenKfid) || getDefaultOpenKfid() || "";
    const content = str(msg.Content ?? msg.content);

    if (ctx?.log) {
      ctx.log.info(`[wecom-kefu] msgType=${msgType} external_userid=${externalUserId} open_kfid=${openKfid}`);
    }

    // 先回 200，再异步投递
    res.writeHead(200, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("");

    if (msgType !== "text" || !content) {
      return true;
    }
    if (!externalUserId || !openKfid) {
      ctx?.log?.warn?.("[wecom-kefu] skip dispatch: missing external_userid or open_kfid");
      return true;
    }

    const core = getKefuRuntime();
    const fullCfg = getKefuFullConfig();
    if (!core || !fullCfg) {
      ctx?.log?.warn?.("[wecom-kefu] skip dispatch: runtime or config not ready");
      return true;
    }

    processKefuInbound({
      core,
      cfg: fullCfg,
      openKfid,
      externalUserId,
      content,
      log: ctx?.log ? { info: (m) => ctx.log?.info?.(m), warn: (m) => ctx.log?.warn?.(m) } : undefined,
      error: ctx?.log ? (m) => ctx.log?.error?.(m) ?? ctx.log?.info?.(m) : undefined,
    }).catch((err) => {
      ctx?.log?.("[wecom-kefu] processKefuInbound failed: " + String(err));
    });

    return true;
  }

  return undefined;
};

/**
 * 将客服文本消息投递到 OpenClaw：路由、会话、dispatchReply；回复通过 deliver 调用客服发送消息 API。
 */
async function processKefuInbound(params: {
  core: import("openclaw/plugin-sdk").PluginRuntime;
  cfg: import("openclaw/plugin-sdk").OpenClawConfig;
  openKfid: string;
  externalUserId: string;
  content: string;
  log?: { info?: (msg: string) => void; warn?: (msg: string) => void };
  error?: (msg: string) => void;
}): Promise<void> {
  const { core, cfg, openKfid, externalUserId, content, log, error } = params;

  const peerId = externalUserId;
  const route = core.channel.routing.resolveAgentRoute({
    cfg,
    channel: "wecom-kefu",
    accountId: DEFAULT_ACCOUNT_ID,
    peer: { kind: "dm", id: peerId },
  });

  const fromLabel = `user:${externalUserId}`;
  const storePath = core.channel.session.resolveStorePath(cfg.session?.store, {
    agentId: route.agentId,
  });
  const envelopeOptions = core.channel.reply.resolveEnvelopeFormatOptions(cfg);
  const previousTimestamp = core.channel.session.readSessionUpdatedAt({
    storePath,
    sessionKey: route.sessionKey,
  });
  const body = core.channel.reply.formatAgentEnvelope({
    channel: "WeComKefu",
    from: fromLabel,
    previousTimestamp,
    envelope: envelopeOptions,
    body: content,
  });

  const ctxPayload = core.channel.reply.finalizeInboundContext({
    Body: body,
    RawBody: content,
    CommandBody: content,
    From: `wecom-kefu:${externalUserId}`,
    To: `wecom-kefu:${openKfid}:${externalUserId}`,
    SessionKey: route.sessionKey,
    AccountId: route.accountId,
    ChatType: "direct",
    ConversationLabel: fromLabel,
    SenderName: externalUserId,
    SenderId: externalUserId,
    Provider: "wecom-kefu",
    Surface: "wecom-kefu",
    OriginatingChannel: "wecom-kefu",
    OriginatingTo: `wecom-kefu:${openKfid}:${externalUserId}`,
    CommandAuthorized: true,
  });

  await core.channel.session.recordInboundSession({
    storePath,
    sessionKey: ctxPayload.SessionKey ?? route.sessionKey,
    ctx: ctxPayload,
    onRecordError: (err) => {
      error?.("[wecom-kefu] session record failed: " + String(err));
    },
  });

  await core.channel.reply.dispatchReplyWithBufferedBlockDispatcher({
    ctx: ctxPayload,
    cfg,
    dispatcherOptions: {
      deliver: async (payload: { text?: string }) => {
        const text = payload.text ?? "";
        if (!text) return;
        try {
          await sendKefuText(openKfid, externalUserId, text);
          log?.info?.("[wecom-kefu] reply delivered to " + externalUserId);
        } catch (err) {
          error?.("[wecom-kefu] reply failed: " + String(err));
        }
      },
      onError: (err, info) => {
        error?.("[wecom-kefu] " + (info?.kind ?? "reply") + " error: " + String(err));
      },
    },
    replyOptions: { disableBlockStreaming: true },
  });
}
