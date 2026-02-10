import "dotenv/config";

const MODEL_NAME = "gpt-4o";

export const MODEL_CONFIG = {
  modelName: MODEL_NAME,
  frontDeskTemperature: 0.3,
  agentTemperature: 0,
} as const;
