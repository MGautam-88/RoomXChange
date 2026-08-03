import { useEffect, useMemo, useState } from "react";
import api from "../../api/axios.js";
import EmptyState from "../../components/common/EmptyState.jsx";
import Input from "../../components/common/Input.jsx";
import RoomCard from "../../components/common/RoomCard.jsx";
import Skeleton from "../../components/common/Skeleton.jsx";
import { useToast } from "../../context/ToastContext.jsx";

export default function BrowseRooms() {
	const showToast = useToast();
	const [rooms, setRooms] = useState([]);
	const [loading, setLoading] = useState(true);
	const [query, setQuery] = useState("");

	useEffect(() => {
		let mounted = true;
		(async () => {
			try {
				const { data } = await api.get("/rooms");
				if (mounted) setRooms(data.rooms || []);
			} catch (error) {
				showToast(error.response?.data?.message || "Unable to load rooms.", "error");
			} finally {
				if (mounted) setLoading(false);
			}
		})();
		return () => { mounted = false; };
	}, [showToast]);

	const filteredRooms = useMemo(() => {
		const value = query.trim().toLowerCase();
		if (!value) return rooms;
		return rooms.filter((room) => [room.block, room.roomNumber, room.floor, room.status].join(" ").toLowerCase().includes(value));
	}, [query, rooms]);

	return (
		<section className="page-shell">
			<div className="page-head">
				<div>
					<p className="eyebrow">Browse rooms</p>
					<h1>Available rooms</h1>
					<p className="muted">Search by block, room number, floor, or status.</p>
				</div>
				<Input label="Search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search rooms" />
			</div>

			{loading ? (
				<div className="card-grid">
					{Array.from({ length: 6 }).map((_, index) => <Skeleton key={index} className="room-skeleton" lines={3} />)}
				</div>
			) : filteredRooms.length ? (
				<div className="card-grid stagger-list">
					{filteredRooms.map((room, index) => <div key={room._id} style={{ animationDelay: `${index * 50}ms` }}><RoomCard room={room} showOwner actionLabel="View details" /></div>)}
				</div>
			) : (
				<EmptyState title="No rooms match your search" message="Try a broader search or check back later for new listings." actionLabel="Clear search" onAction={() => setQuery("")} icon="⌁" />
			)}
		</section>
	);
}