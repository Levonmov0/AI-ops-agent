# AI Operations Agent (Ongoing)

This project explores how large language models (LLMs) can be used to perform
real business operations using retrieval-augmented generation (RAG),
tool-calling, and agent-based architectures.

The current version implements a working RAG pipeline over a small internal document
(PDF), serving as the foundation for a larger AI operations system.

---

## Current Features

- PDF document ingestion and chunking
- Vector storage and retrieval using ChromaDB
- Retrieval-augmented question answering
- CLI-based entrypoint for querying documents
- Centralized configuration for OpenAI and storage

---

## Project Goal

The long-term goal of this project is to build an AI Operations Agent capable of:

- Handling user-facing requests (FrontDeskAgent)
- Retrieving internal knowledge using RAG
- Executing safe, confirmed business actions (e.g. bookings, subscriptions)
- Orchestrating multiple specialized agents
- Operating with authentication, logging, and safety constraints

---

## Current Tech Stack

- Python
- OpenAI API
- ChromaDB
- Retrieval-Augmented Generation (RAG)

---

## Status

This project is under active development.
The current implementation focuses on validating the RAG foundation before
introducing agent orchestration and tool-calling.

---

## How to Run

```bash
python backend/main.py
