from typing import TypedDict, Annotated, Sequence
from operator import add as add_messages
from langgraph.graph import StateGraph, END
from langchain_core.messages import BaseMessage, HumanMessage
from .agents import booking_agent, rag_agent, front_desk_agent


# State
class ConversationState(TypedDict):
    """State for the conversation."""
    messages: Annotated[Sequence[BaseMessage], add_messages]
    intent: str



# Build master graph
def build_master_graph():
    """Build and compile the master graph."""
    graph = StateGraph(ConversationState)

    # Front Desk Agent (entry point node)
    graph.add_node("classify_intent", front_desk_agent.classify_intent)

    # RAG Agent nodes
    graph.add_node("rag_call_llm", rag_agent.call_llm_rag)
    graph.add_node("rag_execute_tools", rag_agent.execute_rag_tools)

    #Booking Agent nodes
    graph.add_node("booking_call_llm", booking_agent.call_llm_booking)
    graph.add_node("booking_execute_tools", booking_agent.execute_booking_tools)

    # Entry point is FrontDeskAgent
    graph.set_entry_point("classify_intent")

    # Route from FrontDeskAgent
    graph.add_conditional_edges(
        "classify_intent",
        front_desk_agent.route_request,
        {
            "END": END,  # Direct response from FrontDeskAgent
            "rag_call_llm": "rag_call_llm",
            "booking_call_llm": "booking_call_llm",
        }
    )

    # RAG flow
    graph.add_conditional_edges(
        "rag_call_llm",
        rag_agent.should_continue_rag,
        {True: "rag_execute_tools", False: END}
    )
    graph.add_edge("rag_execute_tools", "rag_call_llm")

    # Booking flow
    graph.add_conditional_edges(
        "booking_call_llm",
        booking_agent.should_continue_booking,
        {True: "booking_execute_tools", False: END}
    )
    graph.add_edge("booking_execute_tools", "booking_call_llm")

    return graph.compile()



def run(compiled_graph):
    """Run interactive CLI with conversation history."""
    print("Welcome to the Gym Assistant!")

    # Maintain conversation history across turns
    conversation_history = []

    while True:
        user_input = input("You: ").strip()

        if user_input.lower() in ('exit', 'quit'):
            print("Goodbye!")
            break

        if not user_input:
            continue

        # Add user message to history
        conversation_history.append(HumanMessage(content=user_input))

        # Create state with full conversation history
        state = {"messages": conversation_history}

        try:
            result = compiled_graph.invoke(state)
            # Update conversation history with result
            conversation_history = list(result['messages'])
            # Print only the last assistant message
            print(f"Assistant: {result['messages'][-1].content}\n")
        except Exception as e:
            print(f"Error: {e}\n")


# Main
def main():
    """Main function."""
    import os

    # Get PDF path from environment variable or use default
    pdf_path = os.getenv("RAG_PDF_PATH", "Strength_and_Conditioning_RAG_Test_Document.pdf")

    # Initialize RAG components
    rag_agent.initialize_rag_components(pdf_path)
    booking_agent.initialize_booking_agent_components()

    # Build graph
    master_graph = build_master_graph()

    # Run CLI
    run(master_graph)


if __name__ == "__main__":
    main()
