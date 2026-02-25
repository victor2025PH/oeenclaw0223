import type { ChannelPlugin, OpenClawConfig } from "openclaw/plugin-sdk";
import {
  buildChannelConfigSchema,
  DEFAULT_ACCOUNT_ID,
  setAccountEnabledInConfigSection,
} from "openclaw/plugin-sdk";

import { WecomKefuConfigSchema } from "./config-schema.js";
import { setKefuConfig, setKefuFullConfig } from "./runtime.js";
import { sendText as outboundSendText } from "./outbound.js";

const meta = {
  id: "wecom-kefu",
  label: "企业微信客服",
  selectionLabel: "企业微信客服 (plugin)",
  docsPath: "/channels/wecom-kefu",
  docsLabel: "wecom-kefu",
  blurb: "企业微信客服通道：会话、消息回调与发送。",
  aliases: ["wecom-kefu", "企业微信客服", "qywx-kefu"],
  order: 86,
};

/**
 * 企业微信客服 Channel 插件（骨架）
 * 后续需实现：resolveWecomKefuAccount、gateway.startAccount、outbound、HTTP 回调等。
 */
export const wecomKefuPlugin: ChannelPlugin = {
  id: "wecom-kefu",
  meta,
  capabilities: {
    chatTypes: ["direct"],
    media: true,
    reactions: false,
    threads: false,
    polls: false,
    nativeCommands: false,
    blockStreaming: true,
  },
  reload: { configPrefixes: ["channels.wecom-kefu"] },
  configSchema: buildChannelConfigSchema(WecomKefuConfigSchema),
  config: {
    listAccountIds: () => [DEFAULT_ACCOUNT_ID],
    resolveAccount: (cfg) => {
      const enabled =
        (cfg.channels as Record<string, { enabled?: boolean }> | undefined)?.["wecom-kefu"]
          ?.enabled !== false;
      const agent = (cfg.channels as Record<string, { agent?: unknown }> | undefined)?.[
        "wecom-kefu"
      ]?.agent;
      const configured = Boolean(
        agent &&
          typeof agent === "object" &&
          "corpId" in agent &&
          (agent as { corpId?: string }).corpId
      );
      return {
        accountId: DEFAULT_ACCOUNT_ID,
        enabled,
        configured,
        name: undefined,
      };
    },
    defaultAccountId: () => DEFAULT_ACCOUNT_ID,
    setAccountEnabled: ({ cfg, accountId, enabled }) =>
      setAccountEnabledInConfigSection({
        cfg: cfg as OpenClawConfig,
        sectionKey: "wecom-kefu",
        accountId,
        enabled,
        allowTopLevel: true,
      }),
    deleteAccount: ({ cfg }) => ({ ...cfg }),
    isConfigured: (account) => account.configured,
    describeAccount: (account) => ({
      accountId: account.accountId,
      name: account.name,
      enabled: account.enabled,
      configured: account.configured,
      webhookPath: "/wecom-kefu/callback",
    }),
  },
  gateway: {
    startAccount: async (ctx) => {
      const ch = (ctx.cfg as OpenClawConfig).channels as Record<string, { agent?: unknown }> | undefined;
      const agent = ch?.["wecom-kefu"]?.agent;
      if (agent && typeof agent === "object" && "token" in agent && "encodingAESKey" in agent) {
        setKefuConfig(agent as WecomKefuConfig);
      }
      setKefuFullConfig(ctx.cfg as OpenClawConfig);
      ctx.setStatus({
        accountId: ctx.account.accountId,
        running: true,
        configured: ctx.account.configured,
        lastStartAt: Date.now(),
      });
      return {
        stop: () => {
          setKefuConfig(null);
          setKefuFullConfig(null);
        },
      };
    },
    stopAccount: async (ctx) => {
      setKefuConfig(null);
      setKefuFullConfig(null);
      ctx.setStatus({
        accountId: ctx.account.accountId,
        running: false,
        lastStopAt: Date.now(),
      });
    },
  },
  outbound: {
    sendText: async (ctx) => outboundSendText(ctx),
    sendMedia: async () => {
      throw new Error("wecom-kefu sendMedia not implemented");
    },
  },
  status: {
    defaultRuntime: {
      accountId: DEFAULT_ACCOUNT_ID,
      running: false,
      lastStartAt: null,
      lastStopAt: null,
      lastError: null,
    },
    buildChannelSummary: ({ snapshot }) => ({
      configured: snapshot.configured ?? false,
      running: snapshot.running ?? false,
      webhookPath: snapshot.webhookPath ?? "/wecom-kefu/callback",
      lastStartAt: snapshot.lastStartAt ?? null,
      lastStopAt: snapshot.lastStopAt ?? null,
      lastError: snapshot.lastError ?? null,
      lastInboundAt: snapshot.lastInboundAt ?? null,
      lastOutboundAt: snapshot.lastOutboundAt ?? null,
    }),
    probeAccount: async () => ({ ok: true }),
    buildAccountSnapshot: ({ account, runtime }) => ({
      accountId: account.accountId,
      name: account.name,
      enabled: account.enabled,
      configured: account.configured,
      webhookPath: "/wecom-kefu/callback",
      running: runtime?.running ?? false,
      lastStartAt: runtime?.lastStartAt ?? null,
      lastStopAt: runtime?.lastStopAt ?? null,
      lastError: runtime?.lastError ?? null,
      lastInboundAt: runtime?.lastInboundAt ?? null,
      lastOutboundAt: runtime?.lastOutboundAt ?? null,
    }),
  },
};
