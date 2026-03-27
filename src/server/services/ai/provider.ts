import { createAnthropic } from "@ai-sdk/anthropic";
import { createOpenAI } from "@ai-sdk/openai";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import type { LanguageModelV1 } from "ai";
import type { AIConfig } from "../resolve-ai-config";
import { AI_PROVIDERS } from "./providers";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyLanguageModel = LanguageModelV1 | any;

export function getAIModel(config: AIConfig): LanguageModelV1 {
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
      return openai(config.model) as AnyLanguageModel as LanguageModelV1;
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
