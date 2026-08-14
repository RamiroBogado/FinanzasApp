class Retriever:
    def __init__(self, provider, kb_store):
        self._provider = provider
        self._kb_store = kb_store

    def retrieve_context(self, user_id, query, k=8, kb_k=3):
        sections = []
        user_docs = self._provider.search(user_id, query, k)
        if user_docs:
            lines = "\n".join(f"- {d.page_content}" for d in user_docs)
            sections.append("Datos financieros relevantes del usuario:\n" + lines)

        kb_docs = self._kb_store.similarity_search(query, k=kb_k)
        if kb_docs:
            lines = "\n".join(f"- {d.page_content}" for d in kb_docs)
            sections.append("Información de la aplicación y consejos:\n" + lines)

        return "\n\n".join(sections)