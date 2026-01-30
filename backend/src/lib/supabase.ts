import { createClient, SupabaseClient } from "@supabase/supabase-js";
import "dotenv/config";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  throw new Error(
    "Missing required environment variables: SUPABASE_URL and/or SUPABASE_SERVICE_ROLE_KEY. " +
      "Please check your .env file."
  );
}

/** Supabase client configured with service role credentials. */
export const supabase: SupabaseClient = createClient(SUPABASE_URL, SUPABASE_KEY);

/** Gym member record from the members table. */
export interface Member {
  id: number;
  member_id: string;
  name?: string;
  email?: string;
}

/** Scheduled gym class with availability info. */
export interface GymClass {
  id: number;
  class_name: string;
  class_date: string;
  spots_available: number;
}

/** Booking record linking a member to a class. */
export interface ClassBooking {
  id: number;
  booking_id: string;
  member_id: number;
  class_id: number;
}
