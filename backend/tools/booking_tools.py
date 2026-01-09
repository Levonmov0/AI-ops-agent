
import os
from pathlib import Path
from dotenv import load_dotenv
from langchain_core.tools import tool
from datetime import datetime
from supabase import create_client, Client

env_path = Path(__file__).parent.parent / ".env"
load_dotenv(dotenv_path=env_path)

# Validate required environment variables
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    raise ValueError(
        "Missing required environment variables: SUPABASE_URL and/or SUPABASE_SERVICE_ROLE_KEY. "
        "Please check your backend/.env file."
    )

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)


@tool
def check_availability(class_name: str, date: str) -> str:
    """Check if a class has available spots.

    Args:
        class_name: Name of the class (e.g., "Yoga", "Strength")
        date: Date in format YYYY-MM-DD

    Returns:
        Availability status message
    """
    class_name = class_name.lower()
    classes = supabase.table('classes').select('*').eq('class_name', class_name).eq('class_date', date).execute()
    if not classes.data:
        return f"{class_name} with the date {date} does not exist"

    class_info = classes.data[0]
    return f"Class '{class_info['class_name']}' on {class_info['class_date']} has {class_info['spots_available']} spots available."

@tool
def get_current_date() -> str:
    """Gets the current date in the correct format for the booking system.

    Returns:
        Current date in format YYYY-MM-DD
    """
    
    return datetime.now().strftime("%Y-%m-%d")


@tool
def book_class(member_id: str, class_name: str, date: str) -> str:
    """Book a class for a member.

    Args:
        member_id: Member's ID
        class_name: Name of the class to book
        date: Date in format YYYY-MM-DD

    Returns:
        Booking confirmation message
    """
    class_name = class_name.lower()

    member = supabase.table('members').select('*').eq('member_id', member_id).execute()
    classes = supabase.table('classes').select('*').eq('class_name', class_name).execute()

    if not member.data:
        return f"Member ID {member_id} not found."
    if not classes.data:
        return f"Class '{class_name}' not found."
    
    response = supabase.table('class_bookings').insert({
        'member_id': member.data[0]['id'],
        'class_id': classes.data[0]['id'],
    }).execute()

    booking_id = response.data[0]['booking_id']
    return f"Successfully booked '{class_name}' on {date} for member {member_id}. Confirmation ID: {booking_id}"


@tool
def cancel_booking(booking_id: str, member_id: str) -> str:
    """
    Cancel an existing booking.
    NOTE: Confirmation should be handled by the agent, not here.
    Assumes:
      - class_bookings.booking_id is the public confirmation ID
      - class_bookings.member_id stores FK to members.id
    """
    member_res = (
        supabase
        .table("members")
        .select("id")
        .eq("member_id", member_id)
        .execute()
    )
    if not member_res.data:
        return f"Member ID {member_id} not found."

    member_pk = member_res.data[0]["id"]

    booking_res = (
        supabase
        .table("class_bookings")
        .select("id,booking_id")
        .eq("booking_id", booking_id)
        .eq("member_id", member_pk)
        .execute()
    )
    if not booking_res.data:
        return "Booking not found, please try again!"

    row_id = booking_res.data[0]["id"]

    (
        supabase
        .table("class_bookings")
        .delete()
        .eq("id", row_id)
        .execute()
    )

    return f"Successfully cancelled booking {booking_id} for member {member_id}."


@tool
def list_available_classes(date: str) -> str:
    """
    List all available classes for a specific date.

    Args:
        date: Date in format YYYY-MM-DD

    Returns:
        Formatted list of available classes (str)
    """
    res = (
        supabase
        .table("classes")
        .select("id,class_name,class_date,spots_available")
        .eq("class_date", date)
        .execute()
    )

    if not res.data:
        return f"No classes available on {date}."

    lines = []
    for cls in res.data:
        lines.append(f"{cls['class_name']} - {cls['class_date']} ({cls.get('spots_available', 'N/A')} spots available)")
    return "\n".join(lines)