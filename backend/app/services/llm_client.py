"""Centralized LLM client — all LLM calls go through here."""
from openai import AsyncOpenAI
from app.config import settings

client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)


async def llm_chat(system_prompt: str, user_prompt: str, model: str = None, temperature: float = 0.3) -> str:
    response = await client.chat.completions.create(
        model=model or settings.LLM_MODEL,
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ],
        temperature=temperature,
        max_tokens=2000,
    )
    return response.choices[0].message.content


async def llm_json(system_prompt: str, user_prompt: str, model: str = None) -> str:
    response = await client.chat.completions.create(
        model=model or settings.LLM_MODEL,
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ],
        temperature=0.2,
        max_tokens=2000,
        response_format={"type": "json_object"},
    )
    return response.choices[0].message.content
