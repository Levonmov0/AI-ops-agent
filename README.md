# AI Operations Agent

A multi-agent AI system for gym operations that combines retrieval-augmented generation (RAG), database operations, and intelligent routing to handle user requests.

---

## Features

### Multi-Agent Architecture
- **Front Desk Agent**: Routes user requests to specialized agents or responds directly
- **RAG Agent**: Answers questions about gym policies, hours, and programs using document retrieval
- **Booking Agent**: Handles class bookings, cancellations, and availability checks with Supabase integration

### Core Capabilities
- PDF document ingestion and vector search using ChromaDB
- Class booking system with member verification
- Natural language date handling (converts "tomorrow" to YYYY-MM-DD)
- Confirmation workflow for sensitive operations (cancellations)
- Persistent conversation history across interactions

---

## Tech Stack

- **Framework**: LangGraph for agent orchestration
- **LLM**: OpenAI GPT-4o
- **Vector Database**: ChromaDB with OpenAI embeddings
- **Backend Database**: Supabase (PostgreSQL)
- **Libraries**: LangChain, python-dotenv

---

## Current Usage Examples

```
You: What are the gym's operating hours?
Assistant: [RAG Agent retrieves info from PDF]

You: Book me a yoga class for tomorrow
Assistant: [Booking Agent converts date and books class]

You: Cancel booking ABC123
Assistant: Are you sure? Reply "yes" to confirm.
You: yes
Assistant: Successfully cancelled booking ABC123
```

---

## Current Project Structure

```
backend/
├── agents/
│   ├── front_desk_agent.py
│   ├── rag_agent.py
│   └── booking_agent.py
├── tools/
│   ├── rag_tools.py
│   └── booking_tools.py
├── main.py
└── .env
```

---

## Next Steps

- [ ] Frontend interface

---

## Status

Active development. Current focus: developing the frontend and expanding agent capabilities