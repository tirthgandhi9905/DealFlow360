"""Deal state transitions — enforced in code, not LLM."""
from app.models.deal import DealStatus

VALID_TRANSITIONS = {
    DealStatus.DRAFT: [DealStatus.PENDING_APPROVAL, DealStatus.CANCELLED],
    DealStatus.PENDING_APPROVAL: [DealStatus.APPROVED, DealStatus.DRAFT, DealStatus.CANCELLED],
    DealStatus.APPROVED: [DealStatus.NEGOTIATION, DealStatus.CONFIRMED, DealStatus.CANCELLED],
    DealStatus.NEGOTIATION: [DealStatus.PENDING_APPROVAL, DealStatus.CONFIRMED, DealStatus.CANCELLED],
    DealStatus.CONFIRMED: [DealStatus.FULFILLED, DealStatus.CANCELLED],
    DealStatus.FULFILLED: [],
    DealStatus.CANCELLED: [],
}


def can_transition(current: DealStatus, target: DealStatus) -> bool:
    return target in VALID_TRANSITIONS.get(current, [])
