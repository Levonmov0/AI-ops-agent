import { ChatOpenAI } from "@langchain/openai";
import "dotenv/config";

const MODEL_NAME = "gpt-4o";

export function createLlm(temperature: number = 0): ChatOpenAI {
  return new ChatOpenAI({
    model: MODEL_NAME,
    temperature,
  });
}

export const MODEL_CONFIG = {
  modelName: MODEL_NAME,
  frontDeskTemperature: 0.3,
  agentTemperature: 0,
} as const;
