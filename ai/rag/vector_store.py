import os
from abc import ABC, abstractmethod

from chromadb import PersistentClient
from langchain_chroma import Chroma

CHROMA_DIR = os.environ.get("CHROMA_DIR", "./chroma_data")


class VectorStoreProvider(ABC):
    name = "abstract"

    @abstractmethod
    def upsert(self, user_id, documents):
        pass

    @abstractmethod
    def search(self, user_id, query, k):
        pass


class ChromaVectorStoreProvider(VectorStoreProvider):
    name = "chroma"

    def __init__(self, embeddings):
        self._embeddings = embeddings
        self._client = PersistentClient(path=CHROMA_DIR)
        self._stores = {}

    def upsert(self, user_id, documents):
        store = self._get_store(user_id)
        store.reset_collection()
        if documents:
            store.add_documents(documents)
        self._stores[user_id] = store

    def search(self, user_id, query, k):
        store = self._get_store(user_id)
        return store.similarity_search(query, k=k)

    def _get_store(self, user_id):
        store = self._stores.get(user_id)
        if store is None:
            store = Chroma(
                collection_name=f"finanzas_{user_id}",
                embedding_function=self._embeddings,
                client=self._client,
            )
            self._stores[user_id] = store
        return store

    def create_kb_store(self, documents):
        store = Chroma(
            collection_name="knowledge_base",
            embedding_function=self._embeddings,
            client=self._client,
        )
        store.reset_collection()
        store.add_documents(documents)
        return store