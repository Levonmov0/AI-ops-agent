/**
 * Booking Agent - handles class bookings, cancellations, and availability checks.
 *
 * Interacts with Supabase to manage gym class reservations.
 */

import { bookingTools } from "../tools/bookingTools.js";
import { AgentNode } from "../lib/agentUtils.js";

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

Listing bookings:
- If the user wants to see their bookings, call list_member_bookings(member_id).
- Show results clearly with booking IDs so the user can reference them for cancellation.

Cancellation:
- Extract booking_id and member_id.
- If the user doesn't know their booking_id, offer to list their bookings first.
- If missing, ask for the missing value.
- If both are present and when asking for cancellation confirmation, respond EXACTLY in this format:
    [CONFIRM_ACTION]
    {"action": "cancel_booking", "message": "Cancel booking ABC123 for member M456?"}
    [/CONFIRM_ACTION]
- Only AFTER an explicit "yes" can you execute the tool
- If "no" or anything else, abort and confirm it was not canceled.

Rules:
- Never cancel without confirmation.
- Never call tools without required info.
- Never guess missing data.
- Always call get_current_date before computing it yourself
`;

const bookingNode = new AgentNode("Booking");

/** Initializes the booking agent with its tools. */
export function initializeBookingComponents(): void {
  bookingNode.initialize({
    systemPrompt: SYSTEM_PROMPT,
    tools: bookingTools,
  });

  console.log("Booking components initialized.");
}

export const shouldContinueBooking = bookingNode.shouldContinue;
export const callLlmBooking = bookingNode.callLlm;
export const executeBookingTools = bookingNode.executeTools;
