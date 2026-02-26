/**
 * 企业微信客服回调：签名验证与 AES 解密
 * 与自建应用 wecom 保持一致：AES-256-CBC、32 字节 Key、PKCS#7(block=32)
 * 参考：https://developer.work.weixin.qq.com/document/path/101033
 */

import { createDecipheriv, createHash } from "node:crypto";

const WECOM_PKCS7_BLOCK_SIZE = 32;

function decodeEncodingAESKey(encodingAESKey: string): Buffer {
  const trimmed = encodingAESKey.trim();
  if (!trimmed) throw new Error("encodingAESKey missing");
  const withPadding = trimmed.endsWith("=") ? trimmed : `${trimmed}=`;
  const key = Buffer.from(withPadding, "base64");
  if (key.length !== 32) {
    throw new Error(`invalid encodingAESKey (expected 32 bytes after base64 decode, got ${key.length})`);
  }
  return key;
}

function pkcs7Unpad(buf: Buffer, blockSize: number): Buffer {
  if (buf.length === 0) throw new Error("invalid pkcs7 payload");
  const pad = buf[buf.length - 1]!;
  if (pad < 1 || pad > blockSize) throw new Error("invalid pkcs7 padding");
  if (pad > buf.length) throw new Error("invalid pkcs7 payload");
  for (let i = 0; i < pad; i += 1) {
    if (buf[buf.length - 1 - i] !== pad) throw new Error("invalid pkcs7 padding");
  }
  return buf.subarray(0, buf.length - pad);
}

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
 * 解密企业微信回调内容（与 wecom 自建应用一致）
 * AES-256-CBC，Key 为 EncodingAESKey Base64 解码的 32 字节，IV 为 Key 前 16 字节，PKCS#7 block=32
 * 明文结构：16B 随机 + 4B 消息长度(大端) + 消息内容 + [receiveId]
 */
export function decrypt(encodingAESKey: string, encryptedBase64: string, receiveId?: string): string {
  const aesKey = decodeEncodingAESKey(encodingAESKey);
  const iv = aesKey.subarray(0, 16);
  const decipher = createDecipheriv("aes-256-cbc", aesKey, iv);
  decipher.setAutoPadding(false);
  const decryptedPadded = Buffer.concat([
    decipher.update(Buffer.from(encryptedBase64, "base64")),
    decipher.final(),
  ]);
  const decrypted = pkcs7Unpad(decryptedPadded, WECOM_PKCS7_BLOCK_SIZE);

  if (decrypted.length < 20) {
    throw new Error(`invalid decrypted payload (expected at least 20 bytes, got ${decrypted.length})`);
  }
  const msgLen = decrypted.readUInt32BE(16);
  const msgStart = 20;
  const msgEnd = msgStart + msgLen;
  if (msgEnd > decrypted.length) {
    throw new Error(`invalid decrypted msg length (msgEnd=${msgEnd}, payloadLength=${decrypted.length})`);
  }
  const content = decrypted.subarray(msgStart, msgEnd).toString("utf8");
  if (receiveId && receiveId.length > 0) {
    const trailing = decrypted.subarray(msgEnd).toString("utf8");
    if (trailing !== receiveId) {
      throw new Error(`receiveId mismatch (expected "${receiveId}", got "${trailing}")`);
    }
  }
  return content;
}
