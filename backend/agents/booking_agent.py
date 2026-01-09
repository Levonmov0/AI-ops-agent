from pathlib import Path
from dotenv import load_dotenv
from langchain_core.messages import SystemMessage, ToolMessage
from langchain_openai import ChatOpenAI
from ..tools.booking_tools import book_class, cancel_booking, get_current_date, check_availability, list_available_classes

# Load environment variables from backend/.env
env_path = Path(__file__).parent.parent / ".env"
load_dotenv(dotenv_path=env_path)

# Configuration
MODEL_NAME = "gpt-4o"
TEMPERATURE = 0
SYSTEM_PROMPT = """
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
"""

_llm_with_tools = None
_tools_dict = None


def initialize_booking_agent_components():
    """
    Initialize the LLM with booking tools.
    """
    global _llm_with_tools, _tools_dict
    tools = [book_class, cancel_booking, get_current_date, check_availability, list_available_classes]

    llm = ChatOpenAI(model_name=MODEL_NAME, temperature=TEMPERATURE)
    _llm_with_tools = llm.bind_tools(tools)
    _tools_dict = {tool.name: tool for tool in tools}

    return _llm_with_tools, _tools_dict


def call_llm_booking(state):
    """Booking Agent Node: Call LLM with system prompt and conversation history."""
    global _llm_with_tools

    if _llm_with_tools is None:
        raise RuntimeError("Booking components not initialized. Call initialize_booking_components() first.")

    messages = list(state["messages"])
    messages = [SystemMessage(content=SYSTEM_PROMPT)] + messages
    message = _llm_with_tools.invoke(messages)

    return {'messages': [message]}


def should_continue_booking(state):
    """
    This is a routing function for conditional edges in the booking agent graph.
    """
    result = state["messages"][-1]
    return hasattr(result, "tool_calls") and len(result.tool_calls) > 0


def execute_booking_tools(state):
    """
    This node extracts tool calls from the LLM response and executes them.
    """
    global _tools_dict

    if _tools_dict is None:
        raise RuntimeError("Booking components not initialized. Call initialize_booking_components() first.")

    tool_calls = state["messages"][-1].tool_calls
    results = []

    for t in tool_calls:
        print(f"    Calling tool: {t['name']} with input: {t['args']}")

        if t['name'] not in _tools_dict:
            raise ValueError(f"Tool {t['name']} not found in tools dictionary.")

        # Pass the entire args dict to the tool
        result = _tools_dict[t['name']].invoke(t['args'])
        results.append(ToolMessage(tool_call_id=t['id'], name=t['name'], content=str(result)))

    return {'messages': results}