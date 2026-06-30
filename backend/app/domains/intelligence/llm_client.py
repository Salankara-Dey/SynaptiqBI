"""
LLM client — thin wrapper around LangChain/OpenAI.

Provides a centralized interface for AI operations with:
  - Token counting and cost tracking
  - Graceful degradation when API key is missing
  - Structured output parsing
"""
import json
import logging
from typing import Any

from app.core.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()


def is_ai_available() -> bool:
    """Check if the OpenAI API key is configured."""
    return bool(settings.OPENAI_API_KEY and settings.OPENAI_API_KEY != "sk-...")


async def generate_completion(
    system_prompt: str,
    user_prompt: str,
    temperature: float = 0.3,
    max_tokens: int = 2000,
) -> str:
    """
    Generate a completion using OpenAI via LangChain.
    Returns the raw text response.
    """
    if not is_ai_available():
        raise RuntimeError("OpenAI API key not configured")

    from langchain_openai import ChatOpenAI
    from langchain_core.messages import SystemMessage, HumanMessage

    llm = ChatOpenAI(
        model="gpt-4o-mini",
        api_key=settings.OPENAI_API_KEY,
        temperature=temperature,
        max_tokens=max_tokens,
    )

    messages = [
        SystemMessage(content=system_prompt),
        HumanMessage(content=user_prompt),
    ]

    response = await llm.ainvoke(messages)
    return response.content


async def generate_json_completion(
    system_prompt: str,
    user_prompt: str,
    temperature: float = 0.2,
    max_tokens: int = 2000,
) -> dict[str, Any]:
    """
    Generate a completion expecting JSON output.
    Automatically strips markdown code fences and parses JSON.
    """
    raw = await generate_completion(system_prompt, user_prompt, temperature, max_tokens)

    # Strip markdown code fences if present
    text = raw.strip()
    if text.startswith("```"):
        lines = text.split("\n")
        # Remove first and last lines (```json and ```)
        lines = [l for l in lines if not l.strip().startswith("```")]
        text = "\n".join(lines)

    try:
        return json.loads(text)
    except json.JSONDecodeError:
        logger.warning(f"Failed to parse LLM JSON response: {text[:200]}")
        return {"error": "Failed to parse AI response", "raw": text[:500]}


def estimate_tokens(text: str) -> int:
    """Rough token count estimate (4 chars ≈ 1 token)."""
    return len(text) // 4
