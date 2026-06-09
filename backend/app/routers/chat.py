from fastapi import APIRouter
from pydantic import BaseModel

from app.services.rag import chat

router = APIRouter(prefix="/chat", tags=["chat"])


class ChatRequest(BaseModel):
    message: str


@router.post("")
async def ask(req: ChatRequest):
    return await chat(req.message)
