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

// ---- Scan-by-scan timeline (title, place, date/time, status pill) ----------------------------------------------

// "23/10/2026, 12:36 pm"
export function formatTrackDate(value) {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString("en-GB", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: true });
}

const isSystem = (text) => /^system$/i.test(String(text || "").trim());

// New scans carry remark + location; older ones only have note = "remark (location)".
function remarkAndLocation(e) {
  if (e.remark !== undefined || e.location !== undefined) return { remark: e.remark || "", location: e.location || "" };
  const note = String(e.note || "").trim();
  if (!note.endsWith(")")) return { remark: note, location: "" };
  // The place is the last bracketed part, and it may contain brackets itself: "Pickup done (Mumbai_Hub (Maharashtra))".
  let depth = 0;
  for (let i = note.length - 1; i >= 0; i--) {
    if (note[i] === ")") depth++;
    else if (note[i] === "(") {
      depth--;
      if (depth === 0) return { remark: note.slice(0, i).trim(), location: note.slice(i + 1, -1).trim() };
    }
  }
  return { remark: note, location: "" };
}

// Scans of one shipment, newest first, ready to show.
export function timelineEvents(shipment) {
  const labelByName = new Map((shipment?.status_history || []).map((h) => [String(h.name).trim().toLowerCase(), h.label || h.name]));
  return [...(shipment?.events || [])]
    .sort((a, b) => new Date(b.at) - new Date(a.at))
    .map((e, i) => {
      const { remark, location } = remarkAndLocation(e);
      const status = String(e.status || "").trim();
      return {
        key: `${e.ref || ""}-${i}`,
        title: remark || status,
        location,
        at: e.at,
        pill: labelByName.get(status.toLowerCase()) || status,
        showPill: Boolean(remark) && status && status.toLowerCase() !== remark.toLowerCase(),
      };
    });
}

// Where the parcel was last reported (ignores "System" entries).
export function currentLocation(shipment) {
  const hit = timelineEvents(shipment).find((e) => e.location && !isSystem(e.location));
  return hit ? hit.location : "";
}
