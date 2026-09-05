"""Discount ceiling policies — deterministic business rules."""

TIER_DISCOUNT_CEILINGS = {
    "bronze": 5.0,
    "silver": 10.0,
    "gold": 15.0,
}

CATEGORY_DISCOUNT_CEILINGS = {
    "hardware": 15.0,
    "software": 20.0,
    "services": 10.0,
    "subscription": 5.0,
}

APPROVAL_THRESHOLDS = {
    "auto": 40,           # risk <= 40 → auto-approved
    "sales_manager": 70,  # 40 < risk <= 70 → manager
    "finance": 100,       # risk > 70 → finance
}


def get_max_discount(tier: str, category: str) -> float:
    tier_limit = TIER_DISCOUNT_CEILINGS.get(tier, 5.0)
    cat_limit = CATEGORY_DISCOUNT_CEILINGS.get(category, 10.0)
    return min(tier_limit, cat_limit)


def get_required_approval_level(risk_score: int) -> str:
    if risk_score <= APPROVAL_THRESHOLDS["auto"]:
        return "auto"
    elif risk_score <= APPROVAL_THRESHOLDS["sales_manager"]:
        return "sales_manager"
    return "finance"
