/**
 * 运行时配置：HTTP 回调需要 agent 配置与 OpenClaw 运行时（core、fullConfig）以便入站投递。
 * register 时 setKefuRuntime(api.runtime)；startAccount 时 setKefuConfig + setKefuFullConfig；stopAccount 时 clear。
 */

import type { OpenClawConfig } from "openclaw/plugin-sdk";
import type { PluginRuntime } from "openclaw/plugin-sdk";
import type { WecomKefuConfig } from "./config-schema.js";

let currentConfig: WecomKefuConfig | null = null;
let currentFullConfig: OpenClawConfig | null = null;
let currentRuntime: PluginRuntime | null = null;

export function setKefuConfig(config: WecomKefuConfig | null): void {
  currentConfig = config;
}

export function getKefuConfig(): WecomKefuConfig | null {
  return currentConfig;
}

export function setKefuFullConfig(cfg: OpenClawConfig | null): void {
  currentFullConfig = cfg;
}

export function getKefuFullConfig(): OpenClawConfig | null {
  return currentFullConfig;
}

export function setKefuRuntime(runtime: PluginRuntime | null): void {
  currentRuntime = runtime;
}

export function getKefuRuntime(): PluginRuntime | null {
  return currentRuntime;
}
