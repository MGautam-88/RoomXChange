import { useEffect, useMemo, useState } from "react";
import api from "../../api/axios.js";
import Badge from "../../components/common/Badge.jsx";
import EmptyState from "../../components/common/EmptyState.jsx";
import Skeleton from "../../components/common/Skeleton.jsx";
import SwapCycleDiagram from "../../components/common/SwapCycleDiagram.jsx";
import { useAuth } from "../../context/AuthContext.jsx";
import { useSocket } from "../../context/SocketContext.jsx";
import { useToast } from "../../context/ToastContext.jsx";

export default function UserDashboard() {
	const { user } = useAuth();
	const { availableCount, notifications } = useSocket();
	const showToast = useToast();
	const [rooms, setRooms] = useState([]);
	const [requests, setRequests] = useState({ incoming: [], outgoing: [] });
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		let mounted = true;
		(async () => {
			try {
				const [roomsResponse, requestsResponse] = await Promise.all([api.get("/rooms/mine"), api.get("/swaps/mine")]);
				if (mounted) {
					setRooms(roomsResponse.data.rooms || []);
					setRequests({ incoming: requestsResponse.data.incoming || [], outgoing: requestsResponse.data.outgoing || [] });
				}
			} catch (error) {
				showToast(error.response?.data?.message || "Unable to load dashboard.", "error");
			} finally {
				if (mounted) setLoading(false);
			}
		})();
		return () => { mounted = false; };
	}, [showToast]);

	const summary = useMemo(() => [
		{ label: "Live rooms", value: availableCount },
		{ label: "My rooms", value: rooms.length },
		{ label: "Incoming requests", value: requests.incoming.length },
		{ label: "Notifications", value: notifications.length },
	], [availableCount, notifications.length, rooms.length, requests.incoming.length]);

	return (
		<section className="page-shell">
			<div className="page-head">
				<div>
					<p className="eyebrow">User dashboard</p>
					<h1>Welcome, {user?.name || "student"}</h1>
					<p className="muted">Keep track of your rooms, swaps, and live availability.</p>
				</div>
				<Badge value={user?.role || "user"} />
			</div>

			<div className="metric-grid">
				{summary.map((item) => <div key={item.label} className="surface metric-card"><p className="eyebrow">{item.label}</p><h2>{item.value}</h2></div>)}
			</div>

			<div className="dashboard-stack">
				<section className="surface dashboard-panel">
					<div className="panel-head"><h2>Your room network</h2></div>
					<SwapCycleDiagram compact />
				</section>
				<section className="surface dashboard-panel">
					<div className="panel-head"><h2>Recent notifications</h2></div>
					{notifications.length ? notifications.slice(0, 4).map((item) => <article key={item.id} className="notification-item"><p>{item.message}</p><small className="muted mono">{item.type}</small></article>) : <EmptyState title="No notifications yet" message="Swap updates and live activity will appear here." icon="◌" />}
				</section>
			</div>

			{loading ? <Skeleton lines={4} /> : rooms.length ? <div className="card-grid">{rooms.map((room) => <div key={room._id} className="surface dashboard-room"><p className="eyebrow mono">{room.block || "Room"} / {room.roomNumber}</p><p className="muted">Floor {room.floor}</p><Badge value={room.status} /></div>)}</div> : null}
		</section>
	);
}
