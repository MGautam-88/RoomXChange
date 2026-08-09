import { Link } from "react-router-dom";
import Badge from "./Badge.jsx";
import Button from "./Button.jsx";

export default function RoomCard({ room, onEdit, onDelete, showOwner = false, showActions = false, actionLabel = "View room" }) {
	const actionButtons = showActions || onEdit || onDelete;
	const rollNo = room.owner?.email ? room.owner.email.split("@")[0] : null;

	return (
		<article className="surface room-card">
			<div className="room-card-head">
				<div>
					<p className="eyebrow mono">Room {room.roomNumber}</p>
					<h3>{room.block || "No block set"}</h3>
				</div>
				<Badge value={room.status} pulse={room.status === "pending-swap"} />
			</div>
			<div className="room-meta mono" style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
				<span>{room.floor}</span>
				{showOwner && room.owner ? (
					<>
						<span>{room.owner.name}</span>
						{rollNo ? <span>{rollNo}</span> : null}
					</>
				) : null}
			</div>
			{actionButtons ? (
				<div className="room-actions">
					<Button as={Link} to={`/rooms/${room._id}`} variant="secondary">{actionLabel}</Button>
					{onEdit ? <Button type="button" variant="ghost" onClick={() => onEdit(room)}>Edit</Button> : null}
					{onDelete ? <Button type="button" variant="danger" onClick={() => onDelete(room)}>Delete</Button> : null}
				</div>
			) : null}
		</article>
	);
}