/**
 * 企业微信客服 API：获取 access_token、发送文本消息
 * 文档：https://developer.work.weixin.qq.com/document/path/94677
 */

import { getKefuConfig } from "./runtime.js";

const GET_TOKEN_URL = "https://qyapi.weixin.qq.com/cgi-bin/gettoken";
const SEND_MSG_URL = "https://qyapi.weixin.qq.com/cgi-bin/kf/send_msg";

let cachedToken: { access_token: string; expires_at: number } | null = null;
const TOKEN_BUFFER_MS = 60 * 1000;

async function getAccessToken(): Promise<string> {
  const config = getKefuConfig();
  if (!config?.corpId || !config?.kefuSecret) {
    cachedToken = null;
    throw new Error("wecom-kefu: corpId or kefuSecret not configured");
  }
  const now = Date.now();
  if (cachedToken && cachedToken.expires_at > now + TOKEN_BUFFER_MS) {
    return cachedToken.access_token;
  }
  const url = `${GET_TOKEN_URL}?corpid=${encodeURIComponent(config.corpId)}&corpsecret=${encodeURIComponent(config.kefuSecret)}`;
  const res = await fetch(url, { signal: AbortSignal.timeout(15_000) });
  if (!res.ok) {
    throw new Error(`wecom-kefu gettoken failed: ${res.status}`);
  }
  const data = (await res.json()) as { access_token?: string; errcode?: number; errmsg?: string };
  if (data.errcode && data.errcode !== 0) {
    throw new Error(`wecom-kefu gettoken: ${data.errcode} ${data.errmsg ?? ""}`);
  }
  const access_token = data.access_token ?? "";
  if (!access_token) throw new Error("wecom-kefu gettoken: no access_token");
  cachedToken = { access_token, expires_at: now + 7000 * 1000 };
  return access_token;
}

/**
 * 发送客服文本消息
 * @param openKfid 客服账号 ID（可从配置 kefuAppId 或回调消息取）
 * @param externalUserId 客户 external_userid
 * @param text 文本内容
 */
export async function sendKefuText(
  openKfid: string,
  externalUserId: string,
  text: string
): Promise<void> {
  const token = await getAccessToken();
  const url = `${SEND_MSG_URL}?access_token=${encodeURIComponent(token)}`;
  const body = {
    touser: externalUserId,
    open_kfid: openKfid,
    msgtype: "text",
    text: { content: text },
  };
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(15_000),
  });
  if (!res.ok) {
    throw new Error(`wecom-kefu send_msg http: ${res.status}`);
  }
  const data = (await res.json()) as { errcode?: number; errmsg?: string };
  if (data.errcode && data.errcode !== 0) {
    throw new Error(`wecom-kefu send_msg: ${data.errcode} ${data.errmsg ?? ""}`);
  }
}

/**
 * 从配置中取默认 open_kfid（kefuAppId 可配置为客服账号 ID）
 */
export function getDefaultOpenKfid(): string | undefined {
  const config = getKefuConfig();
  return config?.kefuAppId?.trim() || undefined;
}
