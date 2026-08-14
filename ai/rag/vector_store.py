from abc import ABC, abstractmethod

from langchain_core.vectorstores import InMemoryVectorStore


class VectorStoreProvider(ABC):
    name = "abstract"

    @abstractmethod
    def upsert(self, user_id, documents):
        pass

    @abstractmethod
    def search(self, user_id, query, k):
        pass


class MemoryVectorStoreProvider(VectorStoreProvider):
    name = "memory"

    def __init__(self, embeddings):
        self._embeddings = embeddings
        self._stores = {}

    def upsert(self, user_id, documents):
        self._stores[user_id] = InMemoryVectorStore.from_documents(documents, self._embeddings)

    def search(self, user_id, query, k):
        store = self._stores.get(user_id)
        if not store:
            return []
        return store.similarity_search(query, k=k)