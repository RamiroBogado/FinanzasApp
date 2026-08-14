import os

from langchain_ollama import ChatOllama

OLLAMA_URL = os.environ.get("OLLAMA_URL", "http://localhost:11434")
LLM_MODEL = os.environ.get("LLM_MODEL", "llama3.2")


def get_chat_model():
    return ChatOllama(model=LLM_MODEL, base_url=OLLAMA_URL, temperature=0.7, num_predict=500)