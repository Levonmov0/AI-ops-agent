
from langchain_core.tools import tool

# Global retriever instance (set by RAG agent during initialization)
_retriever = None


def set_retriever(retriever):
    """Set the retriever instance for the tool to use.

    Args:
        retriever: LangChain retriever instance
    """
    global _retriever
    _retriever = retriever


@tool
def retriever_tool(query: str) -> str:
    """Search and return information from the strength and conditioning gym documents.

    Args:
        query: The search query

    Returns:
        Retrieved information from gym documents
    """
    if _retriever is None:
        raise RuntimeError("Retriever not initialized. Call set_retriever() first.")

    docs = _retriever.invoke(query)

    if not docs:
        return "No relevant information found."

    results = []
    for i, doc in enumerate(docs):
        results.append(f"Document {i+1}:\n{doc.page_content}\n")

    return "\n\n".join(results)
