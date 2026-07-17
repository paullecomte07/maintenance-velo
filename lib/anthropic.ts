import Anthropic from "@anthropic-ai/sdk";

export function createAnthropicClient() {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error("ANTHROPIC_API_KEY n'est pas configurée.");
  }
  return new Anthropic({ apiKey });
}

export const ANALYSIS_MODEL = "claude-sonnet-5";
