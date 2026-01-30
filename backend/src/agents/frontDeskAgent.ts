/**
 * Front Desk Agent - the entry point for all user requests.
 *
 * Routes requests to specialized agents or responds directly to simple queries.
 */

import { ChatOpenAI } from "@langchain/openai";
import { SystemMessage } from "@langchain/core/messages";
import type { ConversationStateType } from "../graph/state.js";
import { MODEL_CONFIG } from "../lib/llm.js";

const SYSTEM_PROMPT = `
You are the Front Desk Agent for a Strength & Conditioning Gym.

For simple greetings, small talk, or thank you messages - respond directly in a friendly, brief manner.

For questions or requests that need specialist help, respond with ONLY ONE of these agent names:
- RAGAgent (for gym info, policies, hours, location)
- BookingAgent (for class bookings, cancellations or listing classes and anything related to classes)
- SubscriptionAgent (for membership management)
- OnboardingAgent (for new member setup)

Examples:
User: "Hi!" → "Hello! Welcome to our gym. How can I assist you today?"
User: "What are the gym's operating hours?" → "RAGAgent"
User: "Book me a class" → "BookingAgent"
User: "Thanks!" → "You're welcome! Have a great workout!"
`;

const VALID_AGENTS = new Set([
  "RAGAgent",
  "BookingAgent",
  "SubscriptionAgent",
  "OnboardingAgent",
]);

function createFrontDeskLlm(): ChatOpenAI {
  return new ChatOpenAI({
    model: MODEL_CONFIG.modelName,
    temperature: MODEL_CONFIG.frontDeskTemperature,
  });
}

/**
 * Classifies user intent and decides whether to route or respond directly.
 *
 * If the LLM returns a valid agent name, sets intent for routing.
 * Otherwise, treats the response as a direct reply and adds it to messages.
 */
export async function classifyIntent(
  state: ConversationStateType
): Promise<Partial<ConversationStateType>> {
  const llm = createFrontDeskLlm();
  const messages = [new SystemMessage(SYSTEM_PROMPT), ...state.messages];
  const response = await llm.invoke(messages);

  const responseText =
    typeof response.content === "string" ? response.content.trim() : "";

  if (VALID_AGENTS.has(responseText)) {
    return { intent: responseText };
  }

  return { intent: "DIRECT_RESPONSE", messages: [response] };
}

/**
 * Maps intent to the next graph node.
 *
 * Used as a conditional edge function in the LangGraph state machine.
 */
export function routeRequest(state: ConversationStateType): string {
  switch (state.intent) {
    case "DIRECT_RESPONSE":
      return "END";
    case "RAGAgent":
      return "rag_call_llm";
    case "BookingAgent":
      return "booking_call_llm";
    default:
      return "END";
  }
}
