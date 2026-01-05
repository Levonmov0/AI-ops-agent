import os
from typing import TypedDict, Annotated, Sequence
from dotenv import load_dotenv
from langchain_core.messages import BaseMessage, SystemMessage, ToolMessage
from langchain_openai import ChatOpenAI, OpenAIEmbeddings
from langchain_community.document_loaders import PyPDFLoader
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain_chroma import Chroma
from operator import add as add_messages
from backend.tools.rag_tools import retriever_tool, set_retriever

load_dotenv()

# Configuration
MODEL_NAME = "gpt-4o"
TEMPERATURE = 0
EMBEDDING_MODEL = "text-embedding-3-small"
CHUNK_SIZE = 1000
CHUNK_OVERLAP = 200
PERSIST_DIRECTORY = "chroma_db"
COLLECTION_NAME = "langgraph-rag-collection"
TOP_K = 5

# System prompt for RAG agent
SYSTEM_PROMPT = """
You are an assistant that answers questions about Strength & Conditioning Gym.
Use only the provided context. If the answer is not in the context, say you don't have the information.
Be concise and to the point.
"""

# will be set by initialize_rag_components
_llm_with_tools = None
_tools_dict = None


def load_pdf(pdf_path):
    """Load and chunk a PDF."""
    if not os.path.exists(pdf_path):
        raise FileNotFoundError(f"PDF file not found: {pdf_path}")

    loader = PyPDFLoader(pdf_path)

    try:
        pages = loader.load()
        print(f"Loaded {len(pages)} pages from the PDF document.")
    except Exception as e:
        raise RuntimeError(f"Error loading PDF document: {e}")

    # Split into chunks
    text_splitter = RecursiveCharacterTextSplitter(
        chunk_size=CHUNK_SIZE,
        chunk_overlap=CHUNK_OVERLAP,
    )
    pages_split = text_splitter.split_documents(pages)

    return pages_split


def create_vectorstore(documents):
    """Create or load vector store."""
    embeddings = OpenAIEmbeddings(model=EMBEDDING_MODEL)

    if os.path.exists(PERSIST_DIRECTORY):
        try:
            vectorstore = Chroma(
                persist_directory=PERSIST_DIRECTORY,
                embedding_function=embeddings,
                collection_name=COLLECTION_NAME,
            )
            print("Loaded existing vector store from disk.")
            return vectorstore
        except Exception as e:
            print(f"Error loading vector store, creating new one: {e}")

    if not os.path.exists(PERSIST_DIRECTORY):
        os.makedirs(PERSIST_DIRECTORY)

    try:
        vectorstore = Chroma.from_documents(
            documents=documents,
            embedding=embeddings,
            persist_directory=PERSIST_DIRECTORY,
            collection_name=COLLECTION_NAME,
        )
        print("Vector store created and persisted successfully.")
        return vectorstore
    except Exception as e:
        print(f"Error creating vector store: {e}")
        raise


def get_retriever(vectorstore):
    """Get retriever from vector store."""
    return vectorstore.as_retriever(
        search_type="similarity",
        search_kwargs={"k": TOP_K}
    )


def initialize_rag_components(pdf_path="Strength_and_Conditioning_RAG_Test_Document.pdf"):
    """
    Initialize RAG components (vectorstore, retriever, tools, LLM).
    
    This should be called once before using the RAG agent nodes.
    Sets up the global _llm_with_tools and _tools_dict used by node functions.

    Args:
        pdf_path: Path to PDF document to ingest

    Returns:
        tuple: (llm_with_tools, tools_dict) for use in graph building
    """
    global _llm_with_tools, _tools_dict

    # Load PDF
    documents = load_pdf(pdf_path)

    # Create vector store
    vectorstore = create_vectorstore(documents)

    # Get retriever and set it in the tool
    retriever = get_retriever(vectorstore)
    set_retriever(retriever)

    # Use the imported tool
    tools = [retriever_tool]

    # Create LLM with tools
    llm = ChatOpenAI(model_name=MODEL_NAME, temperature=TEMPERATURE)
    _llm_with_tools = llm.bind_tools(tools)
    _tools_dict = {tool.name: tool for tool in tools}

    return _llm_with_tools, _tools_dict


def should_continue_rag(state):
    """
    This is a routing function for conditional edges in the master graph.
    """
    result = state["messages"][-1]
    return hasattr(result, "tool_calls") and len(result.tool_calls) > 0


def call_llm_rag(state):
    """
    This node invokes the LLM with the RAG system prompt and returns the response.
    """
    global _llm_with_tools

    if _llm_with_tools is None:
        raise RuntimeError("RAG components not initialized. Call initialize_rag_components() first.")

    messages = list(state["messages"])
    messages = [SystemMessage(content=SYSTEM_PROMPT)] + messages
    message = _llm_with_tools.invoke(messages)

    return {'messages': [message]}


def execute_rag_tools(state):
    """
    This node extracts tool calls from the LLM response and executes them.
    """
    global _tools_dict

    if _tools_dict is None:
        raise RuntimeError("RAG components not initialized. Call initialize_rag_components() first.")

    tool_calls = state["messages"][-1].tool_calls
    results = []

    for t in tool_calls:
        print(f"Calling tool: {t['name']} with input: {t['args']}")

        if t['name'] not in _tools_dict:
            raise ValueError(f"Tool {t['name']} not found in tools dictionary.")

        result = _tools_dict[t['name']].invoke(t['args'].get('query', ''))
        results.append(ToolMessage(tool_call_id=t['id'], name=t['name'], content=str(result)))

    return {'messages': results}