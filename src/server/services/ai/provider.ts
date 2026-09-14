import { createAnthropic } from "@ai-sdk/anthropic";
import { createOpenAI } from "@ai-sdk/openai";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import type { LanguageModel } from "ai";
import type { AIConfig } from "../resolve-ai-config";
import { AI_PROVIDERS } from "./providers";

export function getAIModel(config: AIConfig): LanguageModel {
  switch (config.provider) {
    case "COMMUNITY": {
      const compatible = createOpenAICompatible({
        name: "community",
        baseURL: config.baseUrl!,
        apiKey: config.apiKey,
      });
      return compatible(config.model);
    }
    case "ANTHROPIC": {
      const anthropic = createAnthropic({ apiKey: config.apiKey });
      return anthropic(config.model);
    }
    case "OPENAI": {
      const openai = createOpenAI({ apiKey: config.apiKey });
      return openai(config.model);
    }
    case "GROQ":
    case "MISTRAL":
    case "TOGETHER": {
      const providerDef = AI_PROVIDERS[config.provider];
      const compatible = createOpenAICompatible({
        name: config.provider.toLowerCase(),
        baseURL: config.baseUrl || providerDef.baseUrl,
        apiKey: config.apiKey,
      });
      return compatible(config.model);
    }
    default:
      throw new Error(`Unsupported AI provider: ${config.provider}`);
  }
}

export function getProviderInfo(config: AIConfig): { provider: string; model: string } {
  return { provider: config.provider, model: config.model };
}
