import { timelineEvents, currentLocation, formatTrackDate } from "../utils/tracking";
import "../styles/shipment-tracking.css";

// Courier scans, newest first: what happened, where, when, and the status it belongs to.
export default function ShipmentTimeline({ shipment }) {
  const events = timelineEvents(shipment);
  if (events.length === 0) return null;
  const where = currentLocation(shipment);

  return (
    <div className="stl">
      {where && (
        <div className="stl-current">
          <svg viewBox="0 0 20 20" width="16" height="16" fill="none" aria-hidden="true">
            <path d="M10 18s6-5.2 6-10a6 6 0 1 0-12 0c0 4.8 6 10 6 10Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
            <circle cx="10" cy="8" r="2.2" stroke="currentColor" strokeWidth="1.6" />
          </svg>
          <span>
            Current location: <strong>{where}</strong>
          </span>
        </div>
      )}
      <ol className="stl-list">
        {events.map((e) => (
          <li className="stl-item" key={e.key}>
            <span className="stl-dot" />
            <div className="stl-title">{e.title}</div>
            {e.location && <div className="stl-loc">{e.location}</div>}
            <div className="stl-date">{formatTrackDate(e.at)}</div>
            {e.showPill && <span className="stl-pill">{e.pill}</span>}
          </li>
        ))}
      </ol>
    </div>
  );
}
