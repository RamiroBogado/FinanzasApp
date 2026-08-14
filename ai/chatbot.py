import os
import threading
import time

import db
from langchain_core.messages import AIMessage, HumanMessage, SystemMessage
from rag import indexer
from rag.embeddings import get_embeddings
from rag.llm import get_chat_model
from rag.retriever import Retriever
from rag.vector_store import ChromaVectorStoreProvider

INDEX_TTL = int(os.environ.get("INDEX_TTL", "300"))


class ChatService:
    def __init__(self):
        embeddings = get_embeddings()
        self._llm = get_chat_model()
        self._provider = ChromaVectorStoreProvider(embeddings)
        self._kb_store = None
        self._lock = threading.Lock()
        self._indexed_at = {}
        self._conversations = {}

    def process_message(self, user_id, user, message):
        self._ensure_kb()
        self._ensure_user_index(user_id)

        aggregates = db.get_aggregates(user_id)
        balance = aggregates["total_income"] - aggregates["total_expense"]

        context = Retriever(self._provider, self._kb_store).retrieve_context(user_id, message)

        system_prompt = f"""Eres un asesor financiero personal. Ayudas al usuario con sus finanzas personales.
Usuario: {user['name']}

Resumen financiero:
- Ingresos totales: ${aggregates['total_income']:,.0f}
- Gastos totales: ${aggregates['total_expense']:,.0f}
- Balance: ${balance:,.0f}

Información recuperada (RAG) para responder con precisión:
{context}

Responde de forma útil, clara y concisa, en español. Usa los datos recuperados para responder; si no sabes algo, sé honesto."""

        history = self._conversations.setdefault(user_id, [])
        messages = [SystemMessage(content=system_prompt)]
        for m in history[-12:]:
            if m["role"] == "user":
                messages.append(HumanMessage(content=m["content"]))
            else:
                messages.append(AIMessage(content=m["content"]))
        messages.append(HumanMessage(content=message))

        response = self._llm.invoke(messages)
        answer = response.content if isinstance(response.content, str) else str(response.content)

        history.append({"role": "user", "content": message})
        history.append({"role": "assistant", "content": answer})
        if len(history) > 20:
            del history[: len(history) - 20]

        return answer

    def clear(self, user_id):
        self._conversations.pop(user_id, None)

    def _ensure_kb(self):
        if self._kb_store is None:
            with self._lock:
                if self._kb_store is None:
                    self._kb_store = self._provider.create_kb_store(indexer.build_kb_documents())

    def _ensure_user_index(self, user_id):
        now = time.time()
        with self._lock:
            if self._indexed_at.get(user_id, 0) + INDEX_TTL > now:
                return
            self._provider.upsert(user_id, indexer.build_user_documents(user_id))
            self._indexed_at[user_id] = now