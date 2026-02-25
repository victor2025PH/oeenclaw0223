/**
 * 企业微信客服回调：签名验证与 AES 解密
 * 参考：https://developer.work.weixin.qq.com/document/path/101033
 */

import { createCipheriv, createDecipheriv, createHash } from "node:crypto";

/**
 * 验证签名：msg_signature = sha1(sort(token, timestamp, nonce, echostr).join(''))
 */
export function verifySignature(
  msgSignature: string,
  token: string,
  timestamp: string,
  nonce: string,
  echostr: string
): boolean {
  const sorted = [token, timestamp, nonce, echostr].sort();
  const str = sorted.join("");
  const hash = createHash("sha1").update(str).digest("hex");
  return hash === msgSignature;
}

/**
 * 验证 POST 消息签名：msg_signature = sha1(sort(token, timestamp, nonce, encrypt).join(''))
 */
export function verifyMsgSignature(
  msgSignature: string,
  token: string,
  timestamp: string,
  nonce: string,
  encrypt: string
): boolean {
  const sorted = [token, timestamp, nonce, encrypt].sort();
  const str = sorted.join("");
  const hash = createHash("sha1").update(str).digest("hex");
  return hash === msgSignature;
}

/**
 * 解密企业微信回调内容（echostr 或 POST body 中的 Encrypt）
 * EncodingAESKey：43 位 Base64，解码后 32 字节，前 16 字节为 AES key，前 16 字节同时作为 IV（AES-128-CBC）
 * 明文结构：16B 随机 + 4B 消息长度(大端) + 消息内容 + corpId
 */
export function decrypt(encodingAESKey: string, encryptedBase64: string): string {
  const keyBuf = Buffer.from(encodingAESKey, "base64");
  if (keyBuf.length !== 32) {
    throw new Error(`invalid encodingAESKey length: ${keyBuf.length}, expected 32`);
  }
  const key = keyBuf.subarray(0, 16);
  const iv = key; // 企业微信/微信约定：IV 与 key 相同
  const encrypted = Buffer.from(encryptedBase64, "base64");

  const decipher = createDecipheriv("aes-128-cbc", key, iv);
  decipher.setAutoPadding(true);
  const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);

  // 16 随机 + 4 长度(大端) + content + corpId
  const msgLen = decrypted.readUInt32BE(16);
  const content = decrypted.subarray(20, 20 + msgLen).toString("utf8");
  return content;
}
