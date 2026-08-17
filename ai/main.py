from datetime import datetime, timezone

from fastapi import Depends, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

import db
from auth import get_current_user
from chatbot import ChatService

app = FastAPI(title="Finanzas IA - Chatbot con LangChain")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

service = ChatService()


class MessageIn(BaseModel):
    message: str


@app.get("/health")
def health():
    return {"status": "ok", "timestamp": datetime.now(timezone.utc).isoformat()}


@app.post("/chatbot/message")
def chatbot_message(body: MessageIn, payload: dict = Depends(get_current_user)):
    message = body.message.strip()
    if not message:
        raise HTTPException(status_code=400, detail="Mensaje requerido")

    user_id = payload["userId"]
    user = db.get_user(user_id)
    if not user:
        raise HTTPException(status_code=401, detail="Usuario no encontrado")

    try:
        response = service.process_message(user_id, user, message)
    except Exception as err:
        raise HTTPException(status_code=500, detail=f"Error al contactar el asistente: {err}")

    return {"response": response}


@app.post("/chatbot/clear")
def chatbot_clear(payload: dict = Depends(get_current_user)):
    service.clear(payload["userId"])
    return {"message": "Conversación reiniciada"}