/**
 * Booking tools for the BookingAgent.
 *
 * These tools interact with Supabase to manage class bookings.
 * Each tool returns a human-readable string for the LLM to relay to the user.
 */

import { DynamicStructuredTool } from "@langchain/core/tools";
import { z } from "zod";
import { supabase } from "../lib/supabase.js";

/**
 * Looks up a member's internal PK by their public member_id.
 * Returns null if not found.
 */
async function findMemberPk(member_id: string): Promise<number | null> {
  const { data } = await supabase
    .from("members")
    .select("id")
    .eq("member_id", member_id)
    .single();
  return data?.id ?? null;
}

export const checkAvailabilityTool = new DynamicStructuredTool({
  name: "check_availability",
  description: "Check if a class has available spots",
  schema: z.object({
    class_name: z.string().describe("Name of the class (e.g., 'Yoga', 'Strength')"),
    date: z.string().describe("Date in format YYYY-MM-DD"),
  }),
  func: async ({ class_name, date }) => {
    const className = class_name.toLowerCase();

    const { data: classes } = await supabase
      .from("classes")
      .select("*")
      .eq("class_name", className)
      .eq("class_date", date);

    if (!classes || classes.length === 0) {
      return `${class_name} with the date ${date} does not exist`;
    }

    const classInfo = classes[0];
    return `Class '${classInfo.class_name}' on ${classInfo.class_date} has ${classInfo.spots_available} spots available.`;
  },
});

export const getCurrentDateTool = new DynamicStructuredTool({
  name: "get_current_date",
  description: "Gets the current date in the correct format for the booking system",
  schema: z.object({}),
  func: async () => {
    return new Date().toISOString().split("T")[0];
  },
});

export const bookClassTool = new DynamicStructuredTool({
  name: "book_class",
  description: "Book a class for a member",
  schema: z.object({
    member_id: z.string().describe("Member's ID"),
    class_name: z.string().describe("Name of the class to book"),
    date: z.string().describe("Date in format YYYY-MM-DD"),
  }),
  func: async ({ member_id, class_name, date }) => {
    const className = class_name.toLowerCase();

    const memberPk = await findMemberPk(member_id);
    if (!memberPk) {
      return `Member ID ${member_id} not found.`;
    }

    const { data: classData } = await supabase
      .from("classes")
      .select("*")
      .eq("class_name", className)
      .eq("class_date", date)
      .single();

    if (!classData) {
      return `Class '${class_name}' on ${date} not found.`;
    }

    if (classData.spots_available <= 0) {
      return `Class '${class_name}' on ${date} is fully booked. No spots available.`;
    }

    const { data: booking, error } = await supabase
      .from("class_bookings")
      .insert({
        member_id: memberPk,
        class_id: classData.id,
      })
      .select()
      .single();

    if (error) {
      return `Booking failed: ${error.message}`;
    }

    return `Successfully booked '${class_name}' on ${date} for member ${member_id}. Confirmation ID: ${booking.booking_id}`;
  },
});

export const cancelBookingTool = new DynamicStructuredTool({
  name: "cancel_booking",
  description:
    "Cancel an existing booking. NOTE: Confirmation should be handled by the agent, not here.",
  schema: z.object({
    booking_id: z.string().describe("The booking confirmation ID"),
    member_id: z.string().describe("Member's ID"),
  }),
  func: async ({ booking_id, member_id }) => {
    const memberPk = await findMemberPk(member_id);
    if (!memberPk) {
      return `Member ID ${member_id} not found.`;
    }

    const { data: bookingRes } = await supabase
      .from("class_bookings")
      .select("id,booking_id")
      .eq("booking_id", booking_id)
      .eq("member_id", memberPk)
      .single();

    if (!bookingRes) {
      return "Booking not found, please try again!";
    }

    const { error } = await supabase.from("class_bookings").delete().eq("id", bookingRes.id);

    if (error) {
      return `Cancellation failed: ${error.message}`;
    }

    return `Successfully cancelled booking ${booking_id} for member ${member_id}.`;
  },
});

export const listAvailableClassesTool = new DynamicStructuredTool({
  name: "list_available_classes",
  description: "List all available classes for a specific date",
  schema: z.object({
    date: z.string().describe("Date in format YYYY-MM-DD"),
  }),
  func: async ({ date }) => {
    const { data: classes } = await supabase
      .from("classes")
      .select("id,class_name,class_date,spots_available")
      .eq("class_date", date);

    if (!classes || classes.length === 0) {
      return `No classes available on ${date}.`;
    }

    const lines = classes.map(
      (cls) =>
        `${cls.class_name} - ${cls.class_date} (${cls.spots_available ?? "N/A"} spots available)`
    );

    return lines.join("\n");
  },
});

export const listMemberBookingsTool = new DynamicStructuredTool({
  name: "list_member_bookings",
  description: "List all bookings for a specific member",
  schema: z.object({
    member_id: z.string().describe("Member's ID"),
  }),
  func: async ({ member_id }) => {
    const memberPk = await findMemberPk(member_id);
    if (!memberPk) {
      return `Member ID ${member_id} not found.`;
    }

    const { data: bookings } = await supabase
      .from("class_bookings")
      .select("booking_id, classes(class_name, class_date)")
      .eq("member_id", memberPk);

    if (!bookings || bookings.length === 0) {
      return `No bookings found for member ${member_id}.`;
    }

    const lines = bookings.map((b: any) =>
      `Booking ID: ${b.booking_id} - ${b.classes.class_name} on ${b.classes.class_date}`
    );

    return lines.join("\n");
  },
});

/** All booking tools available to the BookingAgent. */
export const bookingTools = [
  bookClassTool,
  cancelBookingTool,
  getCurrentDateTool,
  checkAvailabilityTool,
  listAvailableClassesTool,
  listMemberBookingsTool,
];
