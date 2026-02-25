import type { ChannelOutboundContext } from "openclaw/plugin-sdk";
import { sendKefuText, getDefaultOpenKfid } from "./kefu-api.js";

/**
 * 解析 outbound 目标 "to"：
 * - wecom-kefu:open_kfid:external_userid
 * - wecom-kefu:external_userid（open_kfid 从配置 kefuAppId 取）
 */
function resolveKefuTo(to: string): { openKfid: string; externalUserId: string } | null {
  const raw = String(to ?? "").trim();
  const prefix = "wecom-kefu:";
  if (!raw.toLowerCase().startsWith(prefix)) return null;
  const rest = raw.slice(prefix.length).trim();
  const parts = rest.split(":").map((p) => p.trim()).filter(Boolean);
  if (parts.length === 2) {
    return { openKfid: parts[0]!, externalUserId: parts[1]! };
  }
  if (parts.length === 1) {
    const openKfid = getDefaultOpenKfid();
    if (!openKfid) return null;
    return { openKfid, externalUserId: parts[0]! };
  }
  return null;
}

export async function sendText(ctx: ChannelOutboundContext): Promise<{ channel: string; messageId?: string; timestamp: number }> {
  const target = resolveKefuTo(typeof ctx.to === "string" ? ctx.to : "");
  if (!target) {
    throw new Error(
      'wecom-kefu outbound: invalid "to". Use wecom-kefu:open_kfid:external_userid or wecom-kefu:external_userid (with kefuAppId configured).'
    );
  }
  const text = String(ctx.text ?? "").trim();
  if (!text) {
    return { channel: "wecom-kefu", messageId: undefined, timestamp: Date.now() };
  }
  await sendKefuText(target.openKfid, target.externalUserId, text);
  return {
    channel: "wecom-kefu",
    messageId: `kefu-${Date.now()}`,
    timestamp: Date.now(),
  };
}
