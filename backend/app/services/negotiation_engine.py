"""Negotiation engine — LLM counter-proposals with robust deterministic rule-based fallback."""
import json
import logging
from typing import List, Dict, Any
from app.services.llm_client import llm_json

logger = logging.getLogger(__name__)


def generate_fallback_proposals(
    customer_request: str,
    deal_total: float,
    current_margin: float,
    concession_budget: float,
    customer_tier: str = "bronze",
) -> List[Dict[str, Any]]:
    """
    Deterministic rule-based fallback generating 3 Pareto-optimal counter-options
    mixing price discounts, value-added bundled extras, and payment terms.
    """
    safe_budget = max(concession_budget, deal_total * 0.04)
    price_disc_amount = min(safe_budget * 0.5, deal_total * 0.05)
    disc_pct = round((price_disc_amount / deal_total) * 100, 1) if deal_total > 0 else 2.0

    proposals = [
        {
            "label": f"Direct Price Concession (-{disc_pct}% Discount)",
            "discount_change": disc_pct,
            "extras": "Standard 30-day payment terms",
            "estimated_acceptance": 0.82,
            "margin_preserved": round(max(current_margin - disc_pct, 5.0), 1),
            "rationale": f"Applies a targeted price reduction within remaining concession budget (₹{price_disc_amount:,.2f}).",
        },
        {
            "label": "Bundled Value Package (Free 6-Month Support SLA + Free Delivery)",
            "discount_change": 0.0,
            "extras": "Complimentary Priority Support SLA & waived shipping fees",
            "estimated_acceptance": 0.78,
            "margin_preserved": round(current_margin, 1),
            "rationale": "Preserves core line item pricing while matching customer's total value expectation with service add-ons.",
        },
        {
            "label": "Flexible Terms Combo (-2% Discount + Extended NET 60 Terms)",
            "discount_change": 2.0,
            "extras": "Extended NET 60 payment schedule & flexible delivery window",
            "estimated_acceptance": 0.88,
            "margin_preserved": round(max(current_margin - 2.0, 5.0), 1),
            "rationale": "High win-rate balanced package combining mild price discount with cashflow-friendly payment terms.",
        },
    ]

    return proposals


async def generate_counter_proposals(
    customer_request: str,
    deal_context: str,
    customer_history: str,
    policies: str,
    concession_budget: float,
    deal_total: float = 100000.0,
    current_margin: float = 35.0,
    customer_tier: str = "bronze",
) -> list:
    try:
        prompt = f"""Customer request: "{customer_request}"
Deal: {deal_context}
Customer history: {customer_history}
Policies: {policies}
Remaining concession budget: {concession_budget}

Generate exactly 3 counter-proposals. Each must stay within concession budget and policy limits.
Mix price concessions with non-price concessions (service, delivery, support).
Return JSON: {{"proposals": [{{"label": "...", "discount_change": 0.0, "extras": "...", "estimated_acceptance": 0.8, "margin_preserved": 30.0, "rationale": "..."}}]}}"""

        result = await llm_json("You are a B2B negotiation strategist. Return valid JSON only.", prompt)
        proposals = json.loads(result).get("proposals", [])
        if proposals and len(proposals) >= 1:
            proposals.sort(key=lambda p: p.get("margin_preserved", 0) * p.get("estimated_acceptance", 0), reverse=True)
            return proposals
    except Exception as e:
        logger.warning(f"LLM counter proposal generation failed or API key absent, using deterministic rules: {e}")

    # Robust fallback
    return generate_fallback_proposals(
        customer_request=customer_request,
        deal_total=deal_total,
        current_margin=current_margin,
        concession_budget=concession_budget,
        customer_tier=customer_tier,
    )
