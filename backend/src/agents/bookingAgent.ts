/**
 * Booking Agent - handles class bookings, cancellations, and availability checks.
 *
 * Interacts with Supabase to manage gym class reservations.
 */

import type { ConversationStateType } from "../graph/state.js";
import { bookingTools } from "../tools/bookingTools.js";
import {
  createAgent,
  shouldContinue,
  callLlm,
  executeTools,
  type Agent,
} from "../lib/agentUtils.js";

const SYSTEM_PROMPT = `
Booking:
- Extract class_name, member_id, and date from the user.
- NEVER ask the user for YYYY-MM-DD; you must compute it.
- If class_name, member_id, or date is missing/unclear, ask a brief question.
- After booking confirm with: Booked class_name for date. Booking ID: booking_id.

Availability / listing:
- If the user asks what's available on a date, call list_available_classes(date).
- If the user asks if a specific class has spots, call check_availability(class_name, date).
- NEVER ask the user for YYYY-MM-DD; you must compute it.

Cancellation:
- Extract booking_id and member_id.
- If missing, ask for the missing value.
- If both are present, ask: Are you sure? Reply "yes" to confirm.
- Only AFTER an explicit "yes" can you execute the tool
- If "no" or anything else, abort and confirm it was not canceled.

Rules:
- Never cancel without confirmation.
- Never call tools without required info.
- Never guess missing data.
- Always call get_current_date before computing it yourself
`;

let agent: Agent | null = null;

/** Initializes the booking agent with its tools. */
export function initializeBookingComponents(): void {
  agent = createAgent({
    systemPrompt: SYSTEM_PROMPT,
    tools: bookingTools,
  });

  console.log("Booking components initialized.");
}

/** Checks if the agent has pending tool calls. */
export function shouldContinueBooking(state: ConversationStateType): boolean {
  return shouldContinue(state);
}

/** Invokes the LLM with the booking system prompt. */
export async function callLlmBooking(
  state: ConversationStateType
): Promise<Partial<ConversationStateType>> {
  if (!agent) {
    throw new Error("Booking components not initialized.");
  }
  return callLlm(agent, state);
}

/** Executes booking tool calls from the last message. */
export async function executeBookingTools(
  state: ConversationStateType
): Promise<Partial<ConversationStateType>> {
  if (!agent) {
    throw new Error("Booking components not initialized.");
  }
  return executeTools(agent, state);
}
