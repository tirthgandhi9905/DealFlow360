"""Upsell engine — co-purchase association rules with margin deltas and category-aware pairings."""
from typing import List, Dict, Any

# Precomputed co-purchase pairings by category/keyword
CO_PURCHASE_RULES = {
    "server": ["support", "service", "ups", "switch", "storage", "cloud"],
    "workstation": ["monitor", "docking", "keyboard", "mouse", "support"],
    "laptop": ["docking", "keyboard", "mouse", "monitor", "support", "headset"],
    "desktop": ["monitor", "keyboard", "mouse", "ups", "support"],
    "switch": ["firewall", "server", "transceiver", "cable"],
    "firewall": ["switch", "security", "support", "license"],
    "storage": ["server", "backup", "cloud", "support"],
    "erp": ["crm", "analytics", "consulting", "training", "support", "cloud"],
    "crm": ["erp", "analytics", "email", "training", "support"],
    "analytics": ["erp", "crm", "storage", "consulting"],
    "security": ["firewall", "backup", "consulting", "managed"],
    "hardware": ["services", "subscription"],
    "software": ["services", "subscription"],
}


def get_upsell_candidates(cart_products: list[str], all_products: dict, min_margin: float = 10.0) -> list:
    candidates = set()
    for product_name in cart_products:
        p_clean = product_name.lower().replace(" ", "_")
        for key, related_keywords in CO_PURCHASE_RULES.items():
            if key in p_clean:
                for rel in related_keywords:
                    candidates.add(rel)
    
    # Filter and find matching candidate products
    cart_set = {p.lower() for p in cart_products}
    results = []
    
    for prod_id, prod_data in all_products.items():
        name_lower = prod_data.get("name", "").lower()
        cat_lower = prod_data.get("category", "").lower()
        if any(name_lower == c_name.lower() for c_name in cart_products):
            continue
        
        matches_rule = any(cand in name_lower or cand in cat_lower for cand in candidates)
        if matches_rule and prod_data.get("margin_percent", 0) >= min_margin:
            results.append(prod_data)
            
    # Fallback to high margin cross-sell if specific pairings don't match
    if not results:
        for prod_id, prod_data in all_products.items():
            if not any(prod_data.get("name", "").lower() == c_name.lower() for c_name in cart_products):
                if prod_data.get("margin_percent", 0) >= min_margin:
                    results.append(prod_data)
                    
    results.sort(key=lambda p: p.get("margin_percent", 0), reverse=True)
    return results[:5]
