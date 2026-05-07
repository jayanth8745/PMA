import os
from typing import Any

import ollama

from ai.prompts import SYSTEM_PROMPT


CHAT_MODEL = os.getenv("CHAT_MODEL") or os.getenv("OLLAMA_MODEL") or "phi3:mini"
VOICE_MODEL = os.getenv("VOICE_MODEL") or "llama2"
OLLAMA_HOST = os.getenv("OLLAMA_HOST") or "http://127.0.0.1:11434"


def _client() -> ollama.Client:
    return ollama.Client(host=OLLAMA_HOST)


def _format_context(context: Any) -> str:
    if not context:
        return ""
    if isinstance(context, str):
        return context
    return str(context)


def _history_messages(history: Any) -> list[dict[str, str]]:
    messages: list[dict[str, str]] = []
    if not isinstance(history, list):
        return messages

    for item in history[-10:]:
        if not isinstance(item, dict):
            continue
        role = item.get("role")
        content = item.get("content") or item.get("message") or item.get("text")
        if role in {"user", "assistant"} and content:
            messages.append({"role": role, "content": str(content)})
    return messages


def _reply(prompt: str, model: str, history: Any = None, context: Any = None) -> str:
    if not prompt.strip():
        return "Please type a message so I can help."

    context_text = _format_context(context)
    system_prompt = SYSTEM_PROMPT.strip()
    if context_text:
        system_prompt = f"{system_prompt}\n\nUser data context:\n{context_text}"

    messages = [{"role": "system", "content": system_prompt}]
    messages.extend(_history_messages(history))
    messages.append({"role": "user", "content": prompt})

    try:
        response = _client().chat(model=model, messages=messages)
        return response["message"]["content"].strip()
    except Exception as error:
        return (
            f"I could not reach Ollama model '{model}'. "
            f"Make sure Ollama is running and the model is installed. Details: {error}"
        )


def chat_assistant_reply(prompt: str, history: Any = None, context: Any = None) -> str:
    return _reply(prompt, CHAT_MODEL, history=history, context=context)


def voice_assistant_reply(prompt: str, history: Any = None, context: Any = None) -> str:
    return _reply(prompt, VOICE_MODEL, history=history, context=context)
