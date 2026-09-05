"""Three-layer risk engine: Policy + Behavioral + Commercial. No ML — deterministic rules + LLM explanation."""
from app.core.policies import get_max_discount, get_required_approval_level
from app.services.llm_client import llm_chat


def compute_policy_risk(lines: list, customer_tier: str) -> dict:
    violations = []
    score = 0
    for line in lines:
        limit = get_max_discount(customer_tier, line.get("category", "hardware"))
        given = line.get("discount_percent", 0)
        if given > limit:
            over = given - limit
            violations.append({"product": line.get("name"), "given": given, "limit": limit, "over": over})
            # Any discount violation adds policy points; scaled to reach up to 60 for significant violations
            score += int(over * 3) + 20
    return {"score": min(score, 60), "violations": violations}


def compute_behavioral_risk(deal: dict) -> dict:
    score = 0
    factors = []
    idle_days = deal.get("idle_days", 0)
    if idle_days > 7:
        s = min(int(idle_days * 2), 20)
        score += s
        factors.append({"factor": "deal_inactivity", "days": idle_days, "points": s})
    neg_rounds = deal.get("negotiation_rounds", 0)
    if neg_rounds > 3:
        s = min(neg_rounds * 3, 15)
        score += s
        factors.append({"factor": "excessive_negotiations", "rounds": neg_rounds, "points": s})
    return {"score": min(score, 30), "factors": factors}


def compute_commercial_risk(deal: dict) -> dict:
    score = 0
    factors = []
    margin = deal.get("margin_percent", 50)
    if margin < 25:
        s = min(int((25 - margin) * 2), 30)
        score += s
        factors.append({"factor": "margin_erosion", "margin": margin, "points": s})
    return {"score": min(score, 30), "factors": factors}


def compute_total_risk(lines: list, deal: dict, customer_tier: str) -> dict:
    policy = compute_policy_risk(lines, customer_tier)
    behavioral = compute_behavioral_risk(deal)
    commercial = compute_commercial_risk(deal)
    total = min(policy["score"] + behavioral["score"] + commercial["score"], 100)
    return {
        "total_score": total,
        "approval_level": get_required_approval_level(total),
        "policy": policy,
        "behavioral": behavioral,
        "commercial": commercial,
    }


async def explain_risk(risk_result: dict, deal_context: str) -> str:
    prompt = f"""You are a deal risk analyst. Given this risk breakdown, write 2-3 sentences explaining why this deal is flagged.
Risk data: {risk_result}
Deal context: {deal_context}
Be specific, cite numbers. No fluff."""
    return await llm_chat("You explain B2B deal risks concisely.", prompt)
