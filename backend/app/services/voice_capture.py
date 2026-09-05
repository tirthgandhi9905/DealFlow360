"""Voice deal capture — Whisper STT + LLM extraction."""
import json
from openai import AsyncOpenAI
from app.config import settings
from app.services.llm_client import llm_json

client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)


async def transcribe_audio(audio_file) -> str:
    transcript = await client.audio.transcriptions.create(model="whisper-1", file=audio_file)
    return transcript.text


async def extract_deal_fields(transcript: str) -> dict:
    prompt = f"""Extract structured deal information from this sales call transcript.
Transcript: "{transcript}"
Return JSON with only the fields mentioned: {{"discount_requested": null, "delivery_date": null, "competitor": null, "special_requests": null, "quantity_change": null}}
Set null for fields not mentioned."""
    result = await llm_json("Extract structured B2B deal fields from transcripts. Return valid JSON only.", prompt)
    return json.loads(result)
