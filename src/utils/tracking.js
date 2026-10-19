// Display-only helpers for a shipment's courier status history (nothing is changed in the saved data).

const FINAL_NAMES = new Set(["delivered", "rto delivered", "cancelled", "otp verified cancellation"]);

// History in the order the courier sent it. Anything that arrives after the first final status
// (Delivered, RTO Delivered, Cancelled) is a late repeat, so it is not shown.
export function visibleStatusHistory(history = []) {
  const list = Array.isArray(history) ? history : [];
  const end = list.findIndex((h) => FINAL_NAMES.has(String(h?.name || "").trim().toLowerCase()));
  return end === -1 ? list : list.slice(0, end + 1);
}

// The status to show as "current": the last visible one, else the saved courier status.
export function currentCourierStatus(shipment) {
  const list = visibleStatusHistory(shipment?.status_history);
  return list.length ? list[list.length - 1] : shipment?.courier_status || null;
}
