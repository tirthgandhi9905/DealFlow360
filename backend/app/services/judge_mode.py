"""Judge Mode — natural language to safe structured query."""
import json
from app.services.llm_client import llm_json

ALLOWED_FIELDS = {
    "deals": ["deal_number", "status", "total_amount", "margin_percent", "risk_score", "created_at", "last_activity_at"],
    "customers": ["name", "tier", "industry", "lifetime_value"],
    "products": ["name", "category", "base_price"],
}

ALLOWED_OPERATORS = [">", "<", ">=", "<=", "=", "!=", "like", "in"]


async def parse_natural_query(query: str) -> dict:
    prompt = f"""Convert this natural language query into a structured filter.
Query: "{query}"
Available fields: {json.dumps(ALLOWED_FIELDS)}
Allowed operators: {ALLOWED_OPERATORS}
Return JSON: {{"table": "deals", "filters": [{{"field": "...", "op": "...", "value": ...}}], "sort_by": "...", "limit": 20}}"""
    result = await llm_json("Convert NL to safe structured queries. Never generate raw SQL. Return valid JSON.", prompt)
    parsed = json.loads(result)
    # Validate fields and operators
    table = parsed.get("table", "deals")
    if table not in ALLOWED_FIELDS:
        return {"error": f"Table {table} not allowed"}
    for f in parsed.get("filters", []):
        if f["field"] not in ALLOWED_FIELDS.get(table, []):
            return {"error": f"Field {f['field']} not allowed on {table}"}
        if f["op"] not in ALLOWED_OPERATORS:
            return {"error": f"Operator {f['op']} not allowed"}
    return parsed
