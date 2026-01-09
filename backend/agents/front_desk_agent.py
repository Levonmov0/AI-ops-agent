from pathlib import Path
from dotenv import load_dotenv
from langchain_core.messages import SystemMessage
from langchain_openai import ChatOpenAI

# Load environment variables from backend/.env
env_path = Path(__file__).parent.parent / ".env"
load_dotenv(dotenv_path=env_path)
# Configuration
MODEL_NAME = "gpt-4o"
TEMPERATURE = 0.3

# System prompt for Front Desk agent
SYSTEM_PROMPT = """
You are the Front Desk Agent for a Strength & Conditioning Gym.

For simple greetings, small talk, or thank you messages - respond directly in a friendly, brief manner.

For questions or requests that need specialist help, respond with ONLY ONE of these agent names:
- RAGAgent (for gym info, policies, hours, location, programs)
- BookingAgent (for class bookings and cancellations)
- SubscriptionAgent (for membership management)
- OnboardingAgent (for new member setup)

Examples:
User: "Hi!" → "Hello! Welcome to our gym. How can I assist you today?"
User: "What are the gym's operating hours?" → "RAGAgent"
User: "Book me a class" → "BookingAgent"
User: "Thanks!" → "You're welcome! Have a great workout!"
"""


def initialize_front_desk_llm():
    """Initialize the LLM for the Front Desk Agent."""
    llm = ChatOpenAI(
        model_name=MODEL_NAME,
        temperature=TEMPERATURE,
    )
    return llm


def classify_intent(state):
    """Classify user intent - either route to agent OR respond directly."""
    llm = initialize_front_desk_llm()
    prompt = [SystemMessage(content=SYSTEM_PROMPT)] + state["messages"]
    response = llm.invoke(prompt)

    response_text = response.content.strip()
    valid_agents = {"RAGAgent", "BookingAgent", "SubscriptionAgent", "OnboardingAgent"}

    if response_text in valid_agents:
        return {"intent": response_text}
    else:
        return {"intent": "DIRECT_RESPONSE", "messages": [response]}


def route_request(state):
    """Route based on intent."""
    intent = state["intent"]

    if intent == "DIRECT_RESPONSE":
        print("     intent is DIRECT_RESPONSE")
        return "END" 
    
    elif intent == "RAGAgent":
        print("     intent is RAGAgent")
        return "rag_call_llm"
    
    elif intent == "BookingAgent":
        print("     intent is BookingAgent")
        return "booking_call_llm"
 
    else:
        print("     intent is unknown")
        return "unknown_intent_placeholder"