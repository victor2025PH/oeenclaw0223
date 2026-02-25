import { z } from "zod";

const dmSchema = z
  .object({
    enabled: z.boolean().optional(),
    policy: z.enum(["pairing", "allowlist", "open", "disabled"]).optional(),
    allowFrom: z.array(z.union([z.string(), z.number()])).optional(),
  })
  .optional();

/**
 * 企业微信客服通道配置 Schema（openclaw.json channels.wecom-kefu.agent）
 * 字段名以企业微信客服文档为准，可后续补充。
 */
export const WecomKefuConfigSchema = z.object({
  name: z.string().optional(),
  enabled: z.boolean().optional(),

  corpId: z.string().min(1).optional(),
  kefuSecret: z.string().optional(),
  kefuAppId: z.string().optional(),
  token: z.string().optional(),
  encodingAESKey: z.string().optional(),
  callbackUrl: z.string().url().optional(),

  welcomeText: z.string().optional(),
  dm: dmSchema,
});

export type WecomKefuConfig = z.infer<typeof WecomKefuConfigSchema>;
