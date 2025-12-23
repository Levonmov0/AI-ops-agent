import os
from pypdf import PdfReader

from .config import settings

openai_client = settings.client
collection = settings.collection


def load_pdfs_from_directory(folder_path):
    documents = []

    for filename in os.listdir(folder_path):
        if filename.endswith(".pdf"):
            file_path = os.path.join(folder_path, filename)
            reader = PdfReader(file_path)

            text = ""
            for page in reader.pages:
                text += page.extract_text() or ""

            documents.append({
                "filename": filename,
                "text": text
            })

    return documents


def split_text(text, chunk_size=500, overlap=20):
    chunks = []
    start = 0
    text_length = len(text)

    while start < text_length:
        end = min(start + chunk_size, text_length)
        chunks.append(text[start:end])
        start += chunk_size - overlap

    return chunks


def ingest_pdfs(folder_path="data"):
    docs = load_pdfs_from_directory(folder_path)

    chunked_documents = []
    for doc in docs:
        chunks = split_text(doc["text"])
        for i, chunk in enumerate(chunks):
            chunked_documents.append({
                "id": f"{doc['filename']}_chunk_{i}",
                "text": chunk
            })

    def get_openai_embedding(text):
        response = openai_client.embeddings.create(
            input=text,
            model=settings.model_name
        )
        return response.data[0].embedding

    for doc in chunked_documents:
        doc["embedding"] = get_openai_embedding(doc["text"])

    for doc in chunked_documents:
        collection.upsert(
            ids=[doc["id"]],
            documents=[doc["text"]],
            embeddings=[doc["embedding"]]
        )


def query_documents(question, n_results=2):
    results = collection.query(
        query_texts=[question],
        n_results=n_results
    )

    relevant_chunks = [doc for doc in results["documents"][0]]
    return relevant_chunks