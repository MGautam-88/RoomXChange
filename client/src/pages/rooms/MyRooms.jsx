import { useCallback, useEffect, useState } from "react";
import api from "../../api/axios.js";
import Badge from "../../components/common/Badge.jsx";
import Button from "../../components/common/Button.jsx";
import EmptyState from "../../components/common/EmptyState.jsx";
import Input from "../../components/common/Input.jsx";
import RoomCard from "../../components/common/RoomCard.jsx";
import Skeleton from "../../components/common/Skeleton.jsx";
import { useAuth } from "../../context/AuthContext.jsx";
import { useConfirm } from "../../context/ConfirmContext.jsx";
import { useToast } from "../../context/ToastContext.jsx";

const initialForm = { block: "", roomNumber: "", floor: "", status: "available" };

export default function MyRooms() {
	const { user } = useAuth();
	const confirm = useConfirm();
	const showToast = useToast();
	const [rooms, setRooms] = useState([]);
	const [loading, setLoading] = useState(true);
	const [form, setForm] = useState(initialForm);
	const [editingId, setEditingId] = useState(null);
	const [saving, setSaving] = useState(false);

	const loadRooms = useCallback(async () => {
		try {
			const { data } = await api.get("/rooms/mine");
			setRooms(data.rooms || []);
		} catch (error) {
			showToast(error.response?.data?.message || "Unable to load your rooms.", "error");
		} finally {
			setLoading(false);
		}
	}, [showToast]);

	useEffect(() => {
		// Intentional mount fetch for the room list.
		// eslint-disable-next-line react-hooks/set-state-in-effect
		loadRooms();
	}, [loadRooms]);

	const handleSubmit = async (event) => {
		event.preventDefault();
		const cleanRoom = form.roomNumber.trim().toUpperCase();
		if (!/^[A-F][0-9]{3}$/.test(cleanRoom)) {
			showToast("Invalid room number format. Must start with a letter (A-F) followed by 3 digits (e.g. A101).", "error");
			return;
		}

		setSaving(true);
		try {
			const payload = { ...form, roomNumber: cleanRoom };
			const response = editingId ? await api.put(`/rooms/${editingId}`, payload) : await api.post("/rooms", payload);
			showToast(response.data.message, "success");
			setForm(initialForm);
			setEditingId(null);
			await loadRooms();
		} catch (error) {
			showToast(error.response?.data?.message || "Unable to save room.", "error");
		} finally {
			setSaving(false);
		}
	};

	const handleEdit = (room) => {
		setEditingId(room._id);
		setForm({ block: room.block, roomNumber: room.roomNumber, floor: room.floor, status: room.status });
	};

	const handleDelete = async (room) => {
		const ok = await confirm({ title: "Delete room", message: `Delete room ${room.block || ""} / ${room.roomNumber}?`, confirmLabel: "Delete room", danger: true });
		if (!ok) return;
		try {
			const response = await api.delete(`/rooms/${room._id}`);
			showToast(response.data.message, "success");
			await loadRooms();
		} catch (error) {
			showToast(error.response?.data?.message || "Unable to delete room.", "error");
		}
	};

	return (
		<section className="page-shell">
			<div className="page-head">
				<div>
					<p className="eyebrow">My rooms</p>
					<h1>Manage your room listings</h1>
					<p className="muted">Create, edit, and delete the rooms you own.</p>
				</div>
				<Badge value={user?.role || "user"} />
			</div>

			<div className="surface form-card">
				{rooms.length > 0 && !editingId && user?.role === "user" ? (
					<div className="single-room-notice">
						<p className="eyebrow">Active Room Ownership</p>
						<h3>You currently hold Room {rooms[0].block || ""} / {rooms[0].roomNumber}</h3>
						<p className="muted">Each student can hold only one room at a time. To change your room details or floor, click <strong>Edit</strong> on your room card below.</p>
					</div>
				) : (
					<form className="form-grid" onSubmit={handleSubmit}>
						<Input label="Block" value={form.block} onChange={(event) => setForm((current) => ({ ...current, block: event.target.value }))} placeholder="Block A" />
						<Input label="Room number" value={form.roomNumber} onChange={(event) => setForm((current) => ({ ...current, roomNumber: event.target.value }))} placeholder="A101 (Letter A-F + 3 digits)" required />
						<Input label="Floor" value={form.floor} onChange={(event) => setForm((current) => ({ ...current, floor: event.target.value }))} required />
						{user?.role === "admin" || user?.role === "superadmin" ? (
							<label className="field">
								<span className="field-label">Status</span>
								<select className="field-control" value={form.status} onChange={(event) => setForm((current) => ({ ...current, status: event.target.value }))}>
									<option value="available">Available</option>
									<option value="pending-swap">Pending swap</option>
									<option value="swapped">Swapped</option>
								</select>
							</label>
						) : null}
						<div className="room-actions">
							<Button type="submit" disabled={saving}>{saving ? "Saving" : (editingId ? "Update room" : "Create room")}</Button>
							{editingId ? <Button type="button" variant="ghost" onClick={() => { setEditingId(null); setForm(initialForm); }}>Cancel edit</Button> : null}
						</div>
					</form>
				)}
			</div>

			{loading ? <Skeleton lines={4} /> : rooms.length ? (
				<div className="card-grid stagger-list">
					{rooms.map((room, index) => <div key={room._id} style={{ animationDelay: `${index * 50}ms` }}><RoomCard room={room} showActions onEdit={handleEdit} onDelete={handleDelete} /></div>)}
				</div>
			) : (
				<EmptyState title="No rooms listed yet" message="Create your first room listing to start receiving swap requests." actionLabel="Create a room" onAction={() => document.querySelector(".form-card")?.scrollIntoView({ behavior: "smooth" })} icon="⌁" />
			)}
		</section>
	);
}
