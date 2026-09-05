"""Negotiation engine — LLM proposes, rules validate, optimizer ranks."""
import json
from app.services.llm_client import llm_json


async def generate_counter_proposals(
    customer_request: str, deal_context: str, customer_history: str, policies: str, concession_budget: float
) -> list:
    prompt = f"""Customer request: "{customer_request}"
Deal: {deal_context}
Customer history: {customer_history}
Policies: {policies}
Remaining concession budget: {concession_budget}

Generate exactly 3 counter-proposals. Each must stay within concession budget and policy limits.
Mix price concessions with non-price concessions (service, delivery, support).
Return JSON: {{"proposals": [{{"label": "...", "discount_change": 0, "extras": "...", "estimated_acceptance": 0.0, "margin_preserved": 0.0, "rationale": "..."}}]}}"""

    result = await llm_json("You are a B2B negotiation strategist. Return valid JSON only.", prompt)
    proposals = json.loads(result).get("proposals", [])
    # Sort by Pareto optimality: margin_preserved * estimated_acceptance
    proposals.sort(key=lambda p: p.get("margin_preserved", 0) * p.get("estimated_acceptance", 0), reverse=True)
    return proposals
