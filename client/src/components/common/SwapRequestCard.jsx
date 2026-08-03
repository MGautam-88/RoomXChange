import Badge from "./Badge.jsx";
import Button from "./Button.jsx";

export default function SwapRequestCard({ request, type, onAccept, onReject, onCancel }) {
	const room = type === "incoming" ? request.requesterRoom : request.targetRoom;
	const otherUser = type === "incoming" ? request.requester : request.targetUser;
	return (
		<article className="surface swap-card">
			<div className="room-card-head">
				<div>
					<p className="eyebrow mono">{type === "incoming" ? "Incoming" : "Outgoing"}</p>
					<h3>{room?.block || "Room"} / {room?.roomNumber || "—"}</h3>
				</div>
				<Badge value={request.status} pulse={request.status === "pending"} />
			</div>
			<p className="muted">{otherUser?.name} · {otherUser?.email}</p>
			<div className="room-meta mono"><span>Floor {room?.floor || "—"}</span></div>
			<div className="room-actions">
				{type === "incoming" ? (
					<>
						<Button type="button" onClick={onAccept}>Accept</Button>
						<Button type="button" variant="danger" onClick={onReject}>Reject</Button>
					</>
				) : (
					<Button type="button" variant="ghost" onClick={onCancel}>Cancel</Button>
				)}
			</div>
		</article>
	);
}