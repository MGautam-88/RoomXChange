import { useEffect, useState } from "react";
import api from "../../api/axios.js";
import Badge from "../../components/common/Badge.jsx";
import Button from "../../components/common/Button.jsx";
import Input from "../../components/common/Input.jsx";
import { useAuth } from "../../context/AuthContext.jsx";
import { useToast } from "../../context/ToastContext.jsx";

const FLOOR_OPTIONS = [
	"Ground floor (1xx)",
	"First floor (2xx)",
	"Second floor (3xx)",
	"Top floor (4xx)",
];

const BLOCK_OPTIONS = ["A", "B", "C", "D", "E", "F"];

export default function Preferences() {
	const { user, updateUser } = useAuth();
	const showToast = useToast();

	const [isEditing, setIsEditing] = useState(false);

	const [form, setForm] = useState({
		allotedRoom: user?.allotedRoom || "A101",
		currentRoom: user?.currentRoom || "A101",
	});

	const [selectedFloors, setSelectedFloors] = useState(user?.preferredFloors || []);
	const [selectedBlocks, setSelectedBlocks] = useState(user?.preferredBlocks || []);
	const [saving, setSaving] = useState(false);

	useEffect(() => {
		if (user) {
			setForm({
				allotedRoom: user.allotedRoom || "A101",
				currentRoom: user.currentRoom || user.allotedRoom || "A101",
			});
			setSelectedFloors(user.preferredFloors || []);
			setSelectedBlocks(user.preferredBlocks || []);
		}
	}, [user]);

	const toggleFloor = (option) => {
		if (option === "None") {
			setSelectedFloors([]);
			return;
		}
		const next = selectedFloors.includes(option)
			? selectedFloors.filter((item) => item !== option)
			: [...selectedFloors, option];

		// If user selects all floor options, automatically set selection to None (empty array)
		if (next.length === FLOOR_OPTIONS.length) {
			setSelectedFloors([]);
		} else {
			setSelectedFloors(next);
		}
	};

	const toggleBlock = (option) => {
		if (option === "None") {
			setSelectedBlocks([]);
			return;
		}
		const next = selectedBlocks.includes(option)
			? selectedBlocks.filter((item) => item !== option)
			: [...selectedBlocks, option];

		// If user selects all block options, automatically set selection to None (empty array)
		if (next.length === BLOCK_OPTIONS.length) {
			setSelectedBlocks([]);
		} else {
			setSelectedBlocks(next);
		}
	};

	const handleSubmit = async (event) => {
		event.preventDefault();
		const cleanAlloted = form.allotedRoom.trim().toUpperCase();
		const cleanCurrent = form.currentRoom.trim().toUpperCase();

		if (!/^[A-F][0-9]{3}$/.test(cleanAlloted)) {
			showToast("Alloted room format must be 1 letter (A-F) followed by 3 digits (e.g. A101).", "error");
			return;
		}

		if (!/^[A-F][0-9]{3}$/.test(cleanCurrent)) {
			showToast("Current room format must be 1 letter (A-F) followed by 3 digits (e.g. A101).", "error");
			return;
		}

		const finalFloors = selectedFloors.length === FLOOR_OPTIONS.length ? [] : selectedFloors;
		const finalBlocks = selectedBlocks.length === BLOCK_OPTIONS.length ? [] : selectedBlocks;

		if (finalFloors.length === 0 && finalBlocks.length === 0) {
			showToast("You cannot select 'None' for both Floor and Block preferences simultaneously. Please select at least one preferred Floor or Block.", "error");
			return;
		}

		setSaving(true);
		try {
			const { data } = await api.put("/auth/preferences", {
				allotedRoom: cleanAlloted,
				currentRoom: cleanCurrent,
				preferredFloors: finalFloors,
				preferredBlocks: finalBlocks,
			});
			showToast("Preferences saved successfully.", "success");
			updateUser(data.user);
			setIsEditing(false);
		} catch (error) {
			showToast(error.response?.data?.message || "Unable to update preferences.", "error");
		} finally {
			setSaving(false);
		}
	};

	const isFloorNoneSelected = selectedFloors.length === 0;
	const isBlockNoneSelected = selectedBlocks.length === 0;

	return (
		<section className="page-shell">
			<div className="page-head">
				<div>
					<p className="eyebrow">User Preferences</p>
					<h1>Preferences</h1>
					<p className="muted">Configure your room details and target swap preferences.</p>
				</div>
				<Badge value={user?.role || "user"} />
			</div>

			<div className="surface form-card">
				{!isEditing ? (
					/* Read-Only Preferences Summary View */
					<div className="stack gap-20">
						<div className="profile-rooms-container" style={{ gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
							<div className="profile-room-box">
								<span className="eyebrow">Alloted Room Code</span>
								<span className="profile-room-val mono">{user?.allotedRoom || "A101"}</span>
							</div>
							<div className="profile-room-box">
								<span className="eyebrow">Current Room Code</span>
								<span className="profile-room-val mono">{user?.currentRoom || user?.allotedRoom || "A101"}</span>
							</div>
						</div>

						<div className="field">
							<span className="field-label">Preferred Floor(s)</span>
							<div className="pref-pill-group">
								{user?.preferredFloors && user.preferredFloors.length > 0 ? (
									user.preferredFloors.map((floor) => (
										<span key={floor} className="pref-pill" style={{ background: "rgba(255, 255, 255, 0.05)", borderColor: "rgba(255, 255, 255, 0.12)", color: "var(--text-1)" }}>
											{floor}
										</span>
									))
								) : (
									<span className="pref-pill" style={{ background: "rgba(255, 255, 255, 0.03)", color: "var(--text-2)" }}>None</span>
								)}
							</div>
						</div>

						<div className="field">
							<span className="field-label">Preferred Block(s)</span>
							<div className="pref-pill-group">
								{user?.preferredBlocks && user.preferredBlocks.length > 0 ? (
									user.preferredBlocks.map((block) => (
										<span key={block} className="pref-pill" style={{ background: "rgba(255, 255, 255, 0.05)", borderColor: "rgba(255, 255, 255, 0.12)", color: "var(--text-1)" }}>
											{block.replace(/^Block\s*/i, "")}
										</span>
									))
								) : (
									<span className="pref-pill" style={{ background: "rgba(255, 255, 255, 0.03)", color: "var(--text-2)" }}>None</span>
								)}
							</div>
						</div>

						<div className="room-actions" style={{ marginTop: "12px" }}>
							<Button type="button" onClick={() => setIsEditing(true)}>
								Edit Preferences
							</Button>
						</div>
					</div>
				) : (
					/* Edit Mode Form */
					<form className="stack gap-16" onSubmit={handleSubmit}>
						<div className="form-grid">
							<Input
								label="Alloted Room Code"
								value={form.allotedRoom}
								onChange={(event) => {
									const val = event.target.value;
									if (!val) {
										setForm((current) => ({ ...current, allotedRoom: "" }));
										return;
									}
									const upper = val.toUpperCase().trim();
									if (!/^[A-F]/.test(upper)) return;
									const block = upper[0];
									if (upper.length === 1) {
										setForm((current) => ({ ...current, allotedRoom: block }));
										return;
									}
									const floorChar = upper[1];
									if (!/[1-4]/.test(floorChar)) {
										setForm((current) => ({ ...current, allotedRoom: block }));
										return;
									}
									if (upper.length === 2) {
										setForm((current) => ({ ...current, allotedRoom: block + floorChar }));
										return;
									}
									const d3 = upper[2];
									if (!/[0-9]/.test(d3) || Number(d3) > 2) {
										setForm((current) => ({ ...current, allotedRoom: block + floorChar }));
										return;
									}
									if (upper.length === 3) {
										setForm((current) => ({ ...current, allotedRoom: block + floorChar + d3 }));
										return;
									}
									const d4 = upper[3];
									if (!/[0-9]/.test(d4)) {
										setForm((current) => ({ ...current, allotedRoom: block + floorChar + d3 }));
										return;
									}
									const roomNum = Number(d3 + d4);
									if (roomNum < 1 || roomNum > 25) {
										setForm((current) => ({ ...current, allotedRoom: block + floorChar + d3 }));
										return;
									}
									setForm((current) => ({ ...current, allotedRoom: block + floorChar + d3 + d4 }));
								}}
								placeholder="A101"
								maxLength={4}
								required
							/>
							<Input
								label="Current Room Code"
								value={form.currentRoom}
								onChange={(event) => {
									const val = event.target.value;
									if (!val) {
										setForm((current) => ({ ...current, currentRoom: "" }));
										return;
									}
									const upper = val.toUpperCase().trim();
									if (!/^[A-F]/.test(upper)) return;
									const block = upper[0];
									if (upper.length === 1) {
										setForm((current) => ({ ...current, currentRoom: block }));
										return;
									}
									const floorChar = upper[1];
									if (!/[1-4]/.test(floorChar)) {
										setForm((current) => ({ ...current, currentRoom: block }));
										return;
									}
									if (upper.length === 2) {
										setForm((current) => ({ ...current, currentRoom: block + floorChar }));
										return;
									}
									const d3 = upper[2];
									if (!/[0-9]/.test(d3) || Number(d3) > 2) {
										setForm((current) => ({ ...current, currentRoom: block + floorChar }));
										return;
									}
									if (upper.length === 3) {
										setForm((current) => ({ ...current, currentRoom: block + floorChar + d3 }));
										return;
									}
									const d4 = upper[3];
									if (!/[0-9]/.test(d4)) {
										setForm((current) => ({ ...current, currentRoom: block + floorChar + d3 }));
										return;
									}
									const roomNum = Number(d3 + d4);
									if (roomNum < 1 || roomNum > 25) {
										setForm((current) => ({ ...current, currentRoom: block + floorChar + d3 }));
										return;
									}
									setForm((current) => ({ ...current, currentRoom: block + floorChar + d3 + d4 }));
								}}
								placeholder="A101"
								maxLength={4}
								required
							/>
						</div>

						{/* Question 1: Floor Preferences */}
						<div className="field">
							<span className="field-label">Preferred Floor(s)</span>
							<p className="field-hint">Select one or more preferred floors, or None.</p>
							<div className="pref-pill-group">
								{FLOOR_OPTIONS.map((floor) => {
									const isSelected = selectedFloors.includes(floor);
									return (
										<button
											key={floor}
											type="button"
											className={`pref-pill ${isSelected ? "pref-pill-active" : ""}`}
											onClick={() => toggleFloor(floor)}
										>
											{floor}
										</button>
									);
								})}
								<button
									type="button"
									className={`pref-pill ${isFloorNoneSelected ? "pref-pill-none" : ""}`}
									onClick={() => toggleFloor("None")}
								>
									None
								</button>
							</div>
						</div>

						{/* Question 2: Block Preferences */}
						<div className="field">
							<span className="field-label">Preferred Block(s)</span>
							<p className="field-hint">Select one or more preferred blocks, or None.</p>
							<div className="pref-pill-group">
								{BLOCK_OPTIONS.map((block) => {
									const isSelected = selectedBlocks.includes(block);
									return (
										<button
											key={block}
											type="button"
											className={`pref-pill ${isSelected ? "pref-pill-active" : ""}`}
											onClick={() => toggleBlock(block)}
										>
											{block}
										</button>
									);
								})}
								<button
									type="button"
									className={`pref-pill ${isBlockNoneSelected ? "pref-pill-none" : ""}`}
									onClick={() => toggleBlock("None")}
								>
									None
								</button>
							</div>
						</div>

						<div className="room-actions" style={{ marginTop: "12px", display: "flex", gap: "12px" }}>
							<Button type="submit" disabled={saving}>
								{saving ? "Saving preferences..." : "Save Preferences"}
							</Button>
							<Button type="button" variant="ghost" onClick={() => setIsEditing(false)}>
								Cancel
							</Button>
						</div>
					</form>
				)}
			</div>
		</section>
	);
}
