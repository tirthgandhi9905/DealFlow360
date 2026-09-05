"""Warehouse fulfillment optimizer — OR-Tools MILP."""
from ortools.linear_solver import pywraplp


def optimize_fulfillment(
    order_items: list[dict],  # [{product_id, quantity}]
    warehouses: list[dict],   # [{id, name, shipping_cost, delivery_days, stock: {product_id: qty}}]
    alpha: float = 0.4,       # shipping cost weight
    beta: float = 0.4,        # delivery delay weight
    gamma: float = 0.2,       # split penalty weight
) -> dict:
    solver = pywraplp.Solver.CreateSolver("SCIP")
    if not solver:
        return {"error": "Solver unavailable"}

    # Decision variables: x[w][p] = units of product p shipped from warehouse w
    x = {}
    y = {}  # binary: warehouse w is used
    for w in warehouses:
        wid = w["id"]
        y[wid] = solver.BoolVar(f"use_{wid}")
        for item in order_items:
            pid = item["product_id"]
            avail = w.get("stock", {}).get(pid, 0)
            x[(wid, pid)] = solver.IntVar(0, avail, f"x_{wid}_{pid}")

    # Constraints: fulfill demand
    for item in order_items:
        pid = item["product_id"]
        solver.Add(sum(x[(w["id"], pid)] for w in warehouses) == item["quantity"])

    # Link y to x
    M = 100000
    for w in warehouses:
        wid = w["id"]
        for item in order_items:
            pid = item["product_id"]
            solver.Add(x[(wid, pid)] <= M * y[wid])

    # Objective
    shipping_cost = sum(x[(w["id"], item["product_id"])] * w["shipping_cost"] for w in warehouses for item in order_items)
    max_delay = solver.NumVar(0, 365, "max_delay")
    for w in warehouses:
        solver.Add(max_delay >= w["delivery_days"] * y[w["id"]])
    splits = sum(y[w["id"]] for w in warehouses)

    solver.Minimize(alpha * shipping_cost + beta * max_delay + gamma * splits)
    status = solver.Solve()

    if status != pywraplp.Solver.OPTIMAL:
        return {"error": "No optimal solution", "status": status}

    allocation = []
    for w in warehouses:
        wid = w["id"]
        items = []
        for item in order_items:
            pid = item["product_id"]
            qty = int(x[(wid, pid)].solution_value())
            if qty > 0:
                items.append({"product_id": pid, "quantity": qty, "cost": qty * w["shipping_cost"]})
        if items:
            allocation.append({"warehouse_id": wid, "warehouse_name": w["name"], "items": items, "delivery_days": w["delivery_days"]})

    return {
        "allocation": allocation,
        "total_cost": round(solver.Objective().Value(), 2),
        "splits": len(allocation),
        "max_delivery_days": max((a["delivery_days"] for a in allocation), default=0),
    }
