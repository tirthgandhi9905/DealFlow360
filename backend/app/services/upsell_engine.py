"""Upsell engine — co-purchase association rules (data-driven, no ML)."""

# Precomputed co-purchase rules — replace with DB query in production
CO_PURCHASE_RULES = {
    "laptop": ["docking_station", "wireless_mouse", "monitor", "laptop_bag"],
    "server": ["support_package", "installation_service", "ups_unit"],
    "monitor": ["monitor_arm", "hdmi_cable"],
    "software_license": ["training_package", "support_sla"],
}


def get_upsell_candidates(cart_products: list[str], all_products: dict, min_margin: float = 10.0) -> list:
    candidates = set()
    for product_name in cart_products:
        key = product_name.lower().replace(" ", "_")
        for related in CO_PURCHASE_RULES.get(key, []):
            candidates.add(related)
    # Filter by margin and remove items already in cart
    cart_set = {p.lower().replace(" ", "_") for p in cart_products}
    results = []
    for c in candidates - cart_set:
        product = all_products.get(c)
        if product and product.get("margin", 0) >= min_margin:
            results.append(product)
    results.sort(key=lambda p: p.get("margin", 0), reverse=True)
    return results[:4]
