import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import api from "../../api/axios.js";
import Badge from "../../components/common/Badge.jsx";
import Button from "../../components/common/Button.jsx";
import EmptyState from "../../components/common/EmptyState.jsx";
import Skeleton from "../../components/common/Skeleton.jsx";
import { useAuth } from "../../context/AuthContext.jsx";
import { useConfirm } from "../../context/ConfirmContext.jsx";
import { useToast } from "../../context/ToastContext.jsx";

export default function RoomDetail() {
	const { roomId } = useParams();
	const { user } = useAuth();
	const confirm = useConfirm();
	const showToast = useToast();
	const [room, setRoom] = useState(null);
	const [myRooms, setMyRooms] = useState([]);
	const [loading, setLoading] = useState(true);
	const [selectedRoomId, setSelectedRoomId] = useState("");
	const [submitting, setSubmitting] = useState(false);

	useEffect(() => {
		let mounted = true;
		(async () => {
			try {
				const [roomResponse, myRoomsResponse] = await Promise.all([api.get(`/rooms/${roomId}`), api.get("/rooms/mine")]);
				if (mounted) {
					setRoom(roomResponse.data.room);
					setMyRooms(myRoomsResponse.data.rooms || []);
					setSelectedRoomId(myRoomsResponse.data.rooms?.[0]?._id || "");
				}
			} catch (error) {
				showToast(error.response?.data?.message || "Unable to load room details.", "error");
			} finally {
				if (mounted) setLoading(false);
			}
		})();
		return () => { mounted = false; };
	}, [roomId, showToast]);

	const selectedRoom = useMemo(() => myRooms.find((item) => item._id === selectedRoomId), [myRooms, selectedRoomId]);

	const handleSwapRequest = async () => {
		if (!selectedRoomId) {
			showToast("Select one of your rooms to request a swap.", "warning");
			return;
		}
		const ok = await confirm({ title: "Send swap request", message: "Send a swap request using your selected room?", confirmLabel: "Send swap request" });
		if (!ok) return;
		setSubmitting(true);
		try {
			const { data } = await api.post("/swaps", { requesterRoomId: selectedRoomId, targetRoomId: roomId });
			showToast(data.message, "success");
		} catch (error) {
			showToast(error.response?.data?.message || "Unable to send swap request.", "error");
		} finally {
			setSubmitting(false);
		}
	};

	if (loading) return <div className="page-shell"><Skeleton lines={5} /></div>;
	if (!room) return <EmptyState title="Room not found" message="The room may have been deleted or is no longer available." actionLabel="Back to browse" onAction={() => window.history.back()} />;

	return (
		<section className="page-shell room-detail-layout">
			<div className="surface room-hero">
				<div>
					<p className="eyebrow mono">Room {room.roomNumber}</p>
					<h1>{room.block || "No block set"}</h1>
					<div className="room-meta mono">
						<span>Floor {room.floor}</span>
						<Badge value={room.status} pulse={room.status === "pending-swap"} />
						{room.owner ? <span>{room.owner.name}</span> : null}
					</div>
				</div>
				<div className="stack gap-12 room-swap-box">
					<p className="muted">Request this room using one of your own rooms.</p>
					{myRooms.length ? (
						<>
							<select className="field-control" value={selectedRoomId} onChange={(event) => setSelectedRoomId(event.target.value)}>
								{myRooms.map((item) => <option key={item._id} value={item._id}>{item.block} / {item.roomNumber}</option>)}
							</select>
							<Button onClick={handleSwapRequest} disabled={submitting || !selectedRoom}> {submitting ? "Sending request" : "Send swap request"}</Button>
						</>
					) : (
						<EmptyState title="No owned room available" message="Configure your preferences before requesting a swap." actionLabel="Preferences" onAction={() => window.location.assign("/preferences")} icon="⌂" />
					)}
				</div>
			</div>
			<div className="surface room-detail-card">
				<h2>Room record</h2>
				<div className="detail-grid mono">
					<div><span className="muted">Block</span><strong>{room.block || "—"}</strong></div>
					<div><span className="muted">Floor</span><strong>{room.floor}</strong></div>
					<div><span className="muted">Room number</span><strong>{room.roomNumber}</strong></div>
					<div><span className="muted">Status</span><strong>{room.status}</strong></div>
					<div><span className="muted">Owner</span><strong>{room.owner?.name || "—"}</strong></div>
					<div><span className="muted">Email</span><strong>{room.owner?.email || "—"}</strong></div>
				</div>
				{user?.id === room.owner?._id ? <p className="muted">This is one of your rooms.</p> : null}
				<div className="room-actions"><Button as={Link} to="/rooms" variant="ghost">Back to rooms</Button></div>
			</div>
		</section>
	);
}
