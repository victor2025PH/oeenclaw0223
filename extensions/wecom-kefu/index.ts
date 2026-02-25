import type { OpenClawPluginApi } from "openclaw/plugin-sdk";
import { emptyPluginConfigSchema } from "openclaw/plugin-sdk";

import { wecomKefuPlugin } from "./src/channel.js";
import { handleWecomKefuWebhookRequest } from "./src/http-handler.js";
import { setKefuRuntime } from "./src/runtime.js";

const plugin = {
  id: "wecom-kefu",
  name: "WeCom Customer Service",
  description: "OpenClaw 企业微信客服通道插件",
  configSchema: emptyPluginConfigSchema(),

  register(api: OpenClawPluginApi) {
    setKefuRuntime(api.runtime);
    api.registerChannel({ plugin: wecomKefuPlugin });
    api.registerHttpHandler(handleWecomKefuWebhookRequest);
  },
};

export default plugin;
