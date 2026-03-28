export const AI_PROVIDERS = {
  COMMUNITY: {
    label: "Community (Free)",
    requiresKey: false,
    keyPrefix: "",
    keyPlaceholder: "",
    keyUrl: "",
    defaultModel: "qwen/qwen3-32b",
    models: [],
    baseUrl: "",
  },
  ANTHROPIC: {
    label: "Anthropic (Claude)",
    requiresKey: true,
    keyPrefix: "sk-ant-",
    keyPlaceholder: "sk-ant-api03-...",
    keyUrl: "https://console.anthropic.com/settings/keys",
    defaultModel: "claude-sonnet-4-20250514",
    models: ["claude-sonnet-4-20250514", "claude-haiku-4-5-20251001"],
    baseUrl: "",
  },
  OPENAI: {
    label: "OpenAI (GPT)",
    requiresKey: true,
    keyPrefix: "sk-",
    keyPlaceholder: "sk-proj-...",
    keyUrl: "https://platform.openai.com/api-keys",
    defaultModel: "gpt-4o",
    models: ["gpt-4o", "gpt-4o-mini"],
    baseUrl: "",
  },
  GROQ: {
    label: "Groq (Llama)",
    requiresKey: true,
    keyPrefix: "gsk_",
    keyPlaceholder: "gsk_...",
    keyUrl: "https://console.groq.com/keys",
    defaultModel: "llama-3.3-70b-versatile",
    models: ["llama-3.3-70b-versatile", "llama-3.1-8b-instant"],
    baseUrl: "https://api.groq.com/openai/v1",
  },
  MISTRAL: {
    label: "Mistral",
    requiresKey: true,
    keyPrefix: "",
    keyPlaceholder: "...",
    keyUrl: "https://console.mistral.ai/api-keys",
    defaultModel: "mistral-large-latest",
    models: ["mistral-large-latest", "mistral-small-latest"],
    baseUrl: "https://api.mistral.ai/v1",
  },
  TOGETHER: {
    label: "Together AI (Llama)",
    requiresKey: true,
    keyPrefix: "",
    keyPlaceholder: "...",
    keyUrl: "https://api.together.xyz/settings/api-keys",
    defaultModel: "meta-llama/Llama-3.3-70B-Instruct-Turbo",
    models: ["meta-llama/Llama-3.3-70B-Instruct-Turbo", "meta-llama/Meta-Llama-3.1-8B-Instruct-Turbo"],
    baseUrl: "https://api.together.xyz/v1",
  },
} as const;

export type AIProviderKey = keyof typeof AI_PROVIDERS;

/** Serializable subset for the client (no secrets) */
export function getProviderOptions() {
  return Object.entries(AI_PROVIDERS).map(([key, def]) => ({
    value: key as AIProviderKey,
    label: def.label,
    requiresKey: def.requiresKey,
    keyPlaceholder: def.keyPlaceholder,
    keyUrl: def.keyUrl,
    models: def.models,
  }));
}
