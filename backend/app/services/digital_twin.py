"""Deal Digital Twin — simulate deal changes before committing."""
import json
from app.services.risk_engine import compute_total_risk
from app.services.llm_client import llm_json


def simulate_deal_change(current_deal: dict, changes: dict, lines: list, customer_tier: str) -> dict:
    simulated = {**current_deal, **changes}
    # Recalculate margin
    if "total_amount" in simulated and "total_cost" in simulated and simulated["total_amount"] > 0:
        simulated["margin_percent"] = round((simulated["total_amount"] - simulated["total_cost"]) / simulated["total_amount"] * 100, 2)
    risk = compute_total_risk(lines, simulated, customer_tier)
    simulated["risk_score"] = risk["total_score"]
    simulated["approval_level"] = risk["approval_level"]
    simulated["risk_breakdown"] = risk
    return simulated


async def find_better_deal(deal_context: str, policies: str) -> list:
    prompt = f"""You are a deal optimization engine. Given the current deal and company policies, propose exactly 3 alternative deal structures.
Each must: respect discount ceilings, improve margin or reduce approval level, be commercially reasonable.

Current deal: {deal_context}
Policies: {policies}

Return JSON: {{"alternatives": [{{"label": "...", "changes": {{}}, "margin_impact": "...", "approval_level": "...", "rationale": "..."}}]}}"""
    result = await llm_json("You optimize B2B deals within governance rules. Return valid JSON only.", prompt)
    return json.loads(result).get("alternatives", [])
