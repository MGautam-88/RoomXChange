import { useEffect, useMemo, useState } from "react";
import api from "../../api/axios.js";
import EmptyState from "../../components/common/EmptyState.jsx";
import Input from "../../components/common/Input.jsx";
import RoomCard from "../../components/common/RoomCard.jsx";
import Skeleton from "../../components/common/Skeleton.jsx";
import { useToast } from "../../context/ToastContext.jsx";

const getFloorRank = (floorStr = "", roomNumStr = "") => {
	if (floorStr.includes("Ground") || floorStr.includes("1xx")) return 1;
	if (floorStr.includes("First") || floorStr.includes("2xx")) return 2;
	if (floorStr.includes("Second") || floorStr.includes("3xx")) return 3;
	if (floorStr.includes("Top") || floorStr.includes("4xx")) return 4;

	if (roomNumStr && roomNumStr.length >= 2) {
		const digit = Number(roomNumStr[1]);
		if (!isNaN(digit)) return digit;
	}
	return 0;
};

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
		let result = rooms;

		if (value) {
			result = rooms.filter((room) =>
				[
					room.block,
					room.roomNumber,
					room.floor,
					room.status,
					room.owner?.name,
					room.owner?.email,
					room.owner?.email?.split("@")[0],
				]
					.filter(Boolean)
					.join(" ")
					.toLowerCase()
					.includes(value)
			);
		}

		// Sort by Block (ascending) then Floor (ascending) then Room Number
		return [...result].sort((a, b) => {
			const blockA = (a.block || a.roomNumber?.[0] || "").toUpperCase();
			const blockB = (b.block || b.roomNumber?.[0] || "").toUpperCase();

			if (blockA !== blockB) {
				return blockA.localeCompare(blockB);
			}

			const floorA = getFloorRank(a.floor, a.roomNumber);
			const floorB = getFloorRank(b.floor, b.roomNumber);

			if (floorA !== floorB) {
				return floorA - floorB;
			}

			return (a.roomNumber || "").localeCompare(b.roomNumber || "", undefined, { numeric: true });
		});
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
				<EmptyState title="No rooms match your search" message="Try a broader search or check back later for new listings." actionLabel="Clear search" onAction={() => setQuery("")} />
			)}
		</section>
	);
}