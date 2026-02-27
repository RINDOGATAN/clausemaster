import { createAnthropic } from "@ai-sdk/anthropic";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import type { LanguageModelV1 } from "ai";

export type AIProviderType = "anthropic" | "ollama" | "openai-compatible";

export function getAIModel(options?: { anthropicApiKey?: string }): LanguageModelV1 {
  const provider = (process.env.AI_PROVIDER || "anthropic") as AIProviderType;

  switch (provider) {
    case "anthropic": {
      const anthropic = createAnthropic({
        apiKey: options?.anthropicApiKey || process.env.ANTHROPIC_API_KEY,
      });
      const model = process.env.AI_MODEL || "claude-sonnet-4-20250514";
      return anthropic(model);
    }

    case "ollama": {
      const ollama = createOpenAICompatible({
        name: "ollama",
        baseURL: `${process.env.OLLAMA_BASE_URL || "http://localhost:11434"}/v1`,
      });
      const model = process.env.OLLAMA_MODEL || "qwen2.5:32b";
      return ollama(model);
    }

    case "openai-compatible": {
      const compatible = createOpenAICompatible({
        name: "openai-compatible",
        baseURL: process.env.OPENAI_COMPATIBLE_BASE_URL || "http://localhost:8080/v1",
        apiKey: process.env.OPENAI_COMPATIBLE_API_KEY,
      });
      const model = process.env.AI_MODEL || "default";
      return compatible(model);
    }

    default:
      throw new Error(`Unsupported AI provider: ${provider}`);
  }
}

export function getProviderInfo(): { provider: string; model: string } {
  const provider = process.env.AI_PROVIDER || "anthropic";
  let model: string;

  switch (provider) {
    case "anthropic":
      model = process.env.AI_MODEL || "claude-sonnet-4-20250514";
      break;
    case "ollama":
      model = process.env.OLLAMA_MODEL || "qwen2.5:32b";
      break;
    case "openai-compatible":
      model = process.env.AI_MODEL || "default";
      break;
    default:
      model = "unknown";
  }

  return { provider, model };
}
