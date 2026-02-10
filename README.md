# Gym Assistant - AI Multi-Agent System

A multi-agent AI system for gym operations built with LangGraph, combining retrieval-augmented generation (RAG), booking management, and intelligent routing — with a Next.js chat interface.

---

## Architecture

**Front Desk Agent** classifies user intent and either responds directly (greetings, small talk) or routes to a specialist:

- **RAG Agent** — answers questions about gym policies, hours, programs, and location using PDF document retrieval
- **Booking Agent** — handles class bookings, cancellations, availability checks, and member booking listings via Supabase

---

## Features

- Multi-agent orchestration with LangGraph state machine
- RAG pipeline: PDF ingestion, chunking, embeddings, and vector similarity search
- Class booking system with member verification and availability checking
- UI-based confirmation flow for destructive actions (cancel booking)
- Dynamic agent and tool metadata display in the chat UI
- Error handling with retry capability
- Session-based conversation history
- Responsive chat interface

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 16, React 19, Tailwind CSS v4 |
| Backend | Express, TypeScript |
| Orchestration | LangGraph |
| LLM | OpenAI GPT-4o |
| Vector Store | HNSWLib with OpenAI embeddings (`text-embedding-3-small`) |
| Database | Supabase (PostgreSQL) |
| Libraries | LangChain, Zod |

---

## Project Structure

```
backend/
├── src/
│   ├── index.ts                    # CLI entry point
│   ├── api/
│   │   └── server.ts               # Express API server
│   ├── agents/
│   │   ├── frontDeskAgent.ts        # Intent classification & routing
│   │   ├── ragAgent.ts              # RAG document retrieval agent
│   │   └── bookingAgent.ts          # Booking management agent
│   ├── tools/
│   │   ├── ragTools.ts              # Vector store retrieval tool
│   │   └── bookingTools.ts          # Supabase booking tools
│   ├── lib/
│   │   ├── agentUtils.ts            # AgentNode class & shared utilities
│   │   ├── llm.ts                   # LLM model configuration
│   │   ├── vectorStore.ts           # PDF loading & HNSWLib setup
│   │   └── supabase.ts              # Supabase client & types
│   └── graph/
│       ├── state.ts                 # LangGraph state schema
│       └── masterGraph.ts           # State machine definition
frontend/
├── app/
│   ├── layout.tsx                   # Root layout
│   ├── page.tsx                     # Chat interface
│   └── globals.css                  # Global styles
```

---

## Getting Started

### Prerequisites

- Node.js 18+
- OpenAI API key
- Supabase project with `members`, `classes`, and `class_bookings` tables

### Setup

1. **Clone and install**

```bash
git clone <repo-url>
cd AI-ops-agent

# Backend
cd backend
npm install
cp .env.example .env  # Fill in your keys

# Frontend
cd ../frontend
npm install
```

2. **Configure environment**

```env
OPENAI_API_KEY=sk-...
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-key
```

3. **Run**

```bash
# Terminal 1 - Backend
cd backend
npm run dev:api

# Terminal 2 - Frontend
cd frontend
npm run dev
```

The app will be available at `http://localhost:3000`.

### CLI Mode

You can also interact via the terminal without the frontend:

```bash
cd backend
npm run dev
```

---

## Usage Examples

```
You: What are the gym's operating hours?
→ Routes to RAG Agent → retrieves info from PDF

You: Book me a yoga class for tomorrow
→ Routes to Booking Agent → resolves date → books class

You: Cancel booking ABC123 for member 1234
→ Routes to Booking Agent → shows confirmation buttons → cancels on confirm

You: List my bookings (member ID 1234)
→ Routes to Booking Agent → queries Supabase → returns booking list
```

---

## Supabase Schema

```sql
-- Members table
create table members (
  id bigint primary key generated always as identity,
  member_id text unique not null,
  name text,
  email text
);

-- Classes table
create table classes (
  id bigint primary key generated always as identity,
  class_name text not null,
  class_date date not null,
  spots_available int default 10
);

-- Bookings table
create table class_bookings (
  id bigint primary key generated always as identity,
  booking_id text unique default gen_random_uuid(),
  member_id bigint references members(id),
  class_id bigint references classes(id)
);
```

---

## Roadmap

- [ ] Final UI/UX touchups
