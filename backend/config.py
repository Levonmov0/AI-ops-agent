import os
from dotenv import load_dotenv

import chromadb
from openai import OpenAI
from chromadb.utils import embedding_functions

load_dotenv()


class Settings:
    def __init__(self):
        self.openai_api_key = os.getenv("OPEN_AI_KEY", "")
        if not self.openai_api_key:
            raise ValueError("OPEN_AI_KEY not found in environment variables")

        self.chat_model = "gpt-4o"
        self.embedding_model = "text-embedding-3-small"

        self.chroma_path = "chroma_db"
        self.collection_name = "ai-ops-agent-collection"

        # OpenAI client
        self.client = OpenAI(api_key=self.openai_api_key)

        # Chroma embedding function
        self.embedding_function = embedding_functions.OpenAIEmbeddingFunction(
            api_key=self.openai_api_key,
            model_name=self.embedding_model,
        )

        # Persistent Chroma collection
        chroma_client = chromadb.PersistentClient(path=self.chroma_path)
        self.collection = chroma_client.get_or_create_collection(
            name=self.collection_name,
            embedding_function=self.embedding_function,
        )


settings = Settings()