import { useCallback, useEffect, useMemo, useState } from "react";
import api from "../../api/axios.js";
import Badge from "../../components/common/Badge.jsx";
import Button from "../../components/common/Button.jsx";
import EmptyState from "../../components/common/EmptyState.jsx";
import Input from "../../components/common/Input.jsx";
import Skeleton from "../../components/common/Skeleton.jsx";
import { useAuth } from "../../context/AuthContext.jsx";
import { useConfirm } from "../../context/ConfirmContext.jsx";
import { useToast } from "../../context/ToastContext.jsx";

const barWidth = (value, total) => `${total ? Math.max((value / total) * 100, 6) : 6}%`;

export default function SuperAdminDashboard() {
	const { user } = useAuth();
	const confirm = useConfirm();
	const showToast = useToast();
	const [activeTab, setActiveTab] = useState("overview");
	const [data, setData] = useState({ users: [], rooms: [], swaps: [], reports: [], analytics: null });
	const [loading, setLoading] = useState(true);
	const [savingRoleId, setSavingRoleId] = useState(null);
	const [userSearch, setUserSearch] = useState("");
	const [reportFilter, setReportFilter] = useState("all");
	const [updatingReportId, setUpdatingReportId] = useState(null);

	// Edit User Modal State
	const [editingUser, setEditingUser] = useState(null);
	const [editForm, setEditForm] = useState({ name: "", email: "", allotedRoom: "", currentRoom: "" });
	const [savingEdit, setSavingEdit] = useState(false);

	const loadData = useCallback(async () => {
		try {
			const [usersRes, roomsRes, swapsRes, reportsRes, analyticsRes] = await Promise.all([
				api.get("/admin/users"),
				api.get("/admin/rooms"),
				api.get("/admin/swaps"),
				api.get("/reports"),
				api.get("/admin/analytics"),
			]);
			setData({
				users: usersRes.data.users || [],
				rooms: roomsRes.data.rooms || [],
				swaps: swapsRes.data.swaps || [],
				reports: reportsRes.data.reports || [],
				analytics: analyticsRes.data,
			});
		} catch (error) {
			showToast(error.response?.data?.message || "Unable to load super admin data.", "error");
		} finally {
			setLoading(false);
		}
	}, [showToast]);

	useEffect(() => {
		loadData();
	}, [loadData]);

	const updateRole = async (targetUser, role) => {
		const ok = await confirm({ title: "Update role", message: `Set ${targetUser.name}'s role to ${role}?`, confirmLabel: "Update role" });
		if (!ok) return;
		setSavingRoleId(targetUser._id);
		try {
			const response = await api.patch(`/admin/users/${targetUser._id}/role`, { role });
			showToast(response.data.message, "success");
			await loadData();
		} catch (error) {
			showToast(error.response?.data?.message || "Unable to update role.", "error");
		} finally {
			setSavingRoleId(null);
		}
	};

	const handleDeleteUser = async (targetUser) => {
		const ok = await confirm({
			title: "Delete User Account",
			message: `Are you sure you want to permanently delete ${targetUser.name} (${targetUser.email}) and all their room listings?`,
			confirmLabel: "Delete User",
			danger: true,
		});
		if (!ok) return;
		try {
			const res = await api.delete(`/admin/users/${targetUser._id}`);
			showToast(res.data.message, "success");
			await loadData();
		} catch (error) {
			showToast(error.response?.data?.message || "Failed to delete user.", "error");
		}
	};

	const handleOpenEditUser = (u) => {
		setEditingUser(u);
		setEditForm({
			name: u.name || "",
			email: u.email || "",
			allotedRoom: u.allotedRoom || "",
			currentRoom: u.currentRoom || "",
		});
	};

	const handleSaveEditUser = async (event) => {
		event.preventDefault();
		if (!editingUser) return;
		setSavingEdit(true);
		try {
			const res = await api.put(`/admin/users/${editingUser._id}`, editForm);
			showToast(res.data.message, "success");
			setEditingUser(null);
			await loadData();
		} catch (error) {
			showToast(error.response?.data?.message || "Failed to update user details.", "error");
		} finally {
			setSavingEdit(false);
		}
	};

	const handleUpdateReportStatus = async (reportId, newStatus) => {
		setUpdatingReportId(reportId);
		try {
			const res = await api.patch(`/reports/${reportId}/status`, { status: newStatus });
			showToast(res.data.message, "success");
			await loadData();
		} catch (error) {
			showToast(error.response?.data?.message || "Failed to update report status.", "error");
		} finally {
			setUpdatingReportId(null);
		}
	};

	const handleDeleteReport = async (reportId) => {
		if (!window.confirm("Are you sure you want to delete this report?")) return;
		try {
			const res = await api.delete(`/reports/${reportId}`);
			showToast(res.data.message, "success");
			await loadData();
		} catch (error) {
			showToast(error.response?.data?.message || "Failed to delete report.", "error");
		}
	};

	const filteredUsers = useMemo(() => {
		if (!userSearch.trim()) return data.users;
		const query = userSearch.toLowerCase();
		return data.users.filter(
			(u) =>
				u.name.toLowerCase().includes(query) ||
				u.email.toLowerCase().includes(query) ||
				(u.allotedRoom && u.allotedRoom.toLowerCase().includes(query)) ||
				(u.currentRoom && u.currentRoom.toLowerCase().includes(query))
		);
	}, [data.users, userSearch]);

	const filteredReports = useMemo(() => {
		if (reportFilter === "all") return data.reports;
		return data.reports.filter((r) => r.status === reportFilter);
	}, [data.reports, reportFilter]);

	const analytics = data.analytics;
	const statusTotals = useMemo(() => ({ total: analytics?.roomsByStatus?.reduce((sum, item) => sum + item.count, 0) || 0 }), [analytics]);

	if (loading) return <Skeleton lines={8} />;

	return (
		<section className="page-shell">
			<div className="page-head">
				<div>
					<p className="eyebrow">Super Admin Console</p>
					<h1>Campus Governance & Full Control</h1>
					<p className="muted">Manage user roles, edit user details, process conflict reports, and govern system operations.</p>
				</div>
				<Badge value={user?.role || "superadmin"} />
			</div>

			{/* Sub-nav Tabs */}
			<div style={{ display: "flex", gap: "8px", borderBottom: "1px solid var(--border-color)", paddingBottom: "12px", marginBottom: "20px", flexWrap: "wrap" }}>
				{[
					{ id: "overview", label: "Overview" },
					{ id: "reports", label: `Reports & Issues (${data.reports.filter(r => r.status === 'pending').length} Pending)` },
					{ id: "users", label: `Users & Roles (${data.users.length})` },
					{ id: "rooms", label: `Rooms (${data.rooms.length})` },
					{ id: "swaps", label: `Swaps (${data.swaps.length})` },
				].map((tab) => (
					<button
						key={tab.id}
						type="button"
						className={`sidebar-link ${activeTab === tab.id ? "sidebar-link-active" : ""}`}
						style={{ padding: "8px 16px", borderRadius: "8px", cursor: "pointer" }}
						onClick={() => setActiveTab(tab.id)}
					>
						{tab.label}
					</button>
				))}
			</div>

			{/* TAB 1: OVERVIEW */}
			{activeTab === "overview" && (
				<div className="stack gap-20">
					<div className="metric-grid">
						{[
							{ label: "Total Users", value: analytics?.totalUsers || 0 },
							{ label: "Total Rooms", value: analytics?.totalRooms || 0 },
							{ label: "Pending Conflict Reports", value: data.reports.filter((r) => r.status === "pending").length },
							{ label: "Completed Swaps (Month)", value: analytics?.swapsCompletedThisMonth || 0 },
						].map((item) => (
							<div key={item.label} className="surface metric-card">
								<p className="eyebrow">{item.label}</p>
								<h2>{item.value}</h2>
							</div>
						))}
					</div>

					<div className="dashboard-stack">
						<section className="surface dashboard-panel">
							<h2>Room Status Summary</h2>
							{analytics?.roomsByStatus?.length ? (
								analytics.roomsByStatus.map((item) => (
									<div key={item._id} className="bar-row">
										<span>{item._id}</span>
										<div className="bar-track">
											<div className="bar-fill" style={{ width: barWidth(item.count, statusTotals.total) }} />
										</div>
										<strong>{item.count}</strong>
									</div>
								))
							) : (
								<EmptyState title="No analytics available" message="Metrics will appear once rooms exist." icon="▣" />
							)}
						</section>

						<section className="surface dashboard-panel">
							<h2>Active Dorm Blocks</h2>
							{analytics?.mostActiveBlocks?.length ? (
								analytics.mostActiveBlocks.map((item) => (
									<div key={item._id} className="bar-row">
										<span>{item._id || "Unassigned"}</span>
										<div className="bar-track">
											<div className="bar-fill" style={{ width: barWidth(item.count, analytics.mostActiveBlocks[0]?.count || 1) }} />
										</div>
										<strong>{item.count}</strong>
									</div>
								))
							) : (
								<EmptyState title="No block data" message="Block activity will appear after room registration." icon="▤" />
							)}
						</section>
					</div>
				</div>
			)}

			{/* TAB 2: REPORTS & ISSUES */}
			{activeTab === "reports" && (
				<section className="surface dashboard-panel">
					<div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px", flexWrap: "wrap", gap: "12px" }}>
						<h2>Reported Room Conflicts & Issues</h2>
						<div style={{ display: "flex", gap: "8px" }}>
							{["all", "pending", "investigating", "resolved", "dismissed"].map((status) => (
								<button
									key={status}
									type="button"
									onClick={() => setReportFilter(status)}
									style={{
										padding: "4px 10px",
										borderRadius: "6px",
										fontSize: "0.8rem",
										textTransform: "capitalize",
										border: "1px solid var(--border-color)",
										background: reportFilter === status ? "var(--color-accent)" : "transparent",
										color: reportFilter === status ? "#000" : "var(--text-1)",
										cursor: "pointer",
									}}
								>
									{status}
								</button>
							))}
						</div>
					</div>

					{filteredReports.length ? (
						<div className="table-wrap">
							<table className="data-table">
								<thead>
									<tr>
										<th>Reporter</th>
										<th>Email</th>
										<th>Issue Type</th>
										<th>Alloted</th>
										<th>Current</th>
										<th>Details</th>
										<th>Status</th>
										<th>Actions</th>
									</tr>
								</thead>
								<tbody>
									{filteredReports.map((report) => (
										<tr key={report._id}>
											<td style={{ fontWeight: 600 }}>{report.reporterName}</td>
											<td>{report.reporterEmail}</td>
											<td>
												<span style={{ fontSize: "0.8rem", padding: "2px 6px", borderRadius: "4px", background: "rgba(255,255,255,0.06)" }}>
													{report.issueType?.replace(/_/g, " ")}
												</span>
											</td>
											<td className="mono">{report.allotedRoom || "—"}</td>
											<td className="mono">{report.currentRoom || "—"}</td>
											<td style={{ maxWidth: "220px", fontSize: "0.85rem" }}>{report.message}</td>
											<td>
												<Badge value={report.status} pulse={report.status === "pending"} />
											</td>
											<td className="table-actions">
												{report.status !== "investigating" && (
													<Button
														type="button"
														variant="secondary"
														size="sm"
														disabled={updatingReportId === report._id}
														onClick={() => handleUpdateReportStatus(report._id, "investigating")}
													>
														Investigate
													</Button>
												)}
												{report.status !== "resolved" && (
													<Button
														type="button"
														variant="secondary"
														size="sm"
														disabled={updatingReportId === report._id}
														onClick={() => handleUpdateReportStatus(report._id, "resolved")}
													>
														Resolve
													</Button>
												)}
												{report.status !== "dismissed" && (
													<Button
														type="button"
														variant="ghost"
														size="sm"
														disabled={updatingReportId === report._id}
														onClick={() => handleUpdateReportStatus(report._id, "dismissed")}
													>
														Dismiss
													</Button>
												)}
												<Button
													type="button"
													variant="danger"
													size="sm"
													onClick={() => handleDeleteReport(report._id)}
												>
													Delete
												</Button>
											</td>
										</tr>
									))}
								</tbody>
							</table>
						</div>
					) : (
						<EmptyState title="No conflict reports" message="No reports match the selected status." icon="📋" />
					)}
				</section>
			)}

			{/* TAB 3: USERS & ROLES */}
			{activeTab === "users" && (
				<section className="surface dashboard-panel">
					<div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px", flexWrap: "wrap", gap: "12px" }}>
						<h2>User Management & Governance</h2>
						<input
							type="text"
							placeholder="Search by name, email, or room..."
							value={userSearch}
							onChange={(e) => setUserSearch(e.target.value)}
							style={{ padding: "6px 12px", borderRadius: "6px", border: "1px solid var(--border-color)", background: "var(--surface-2)", color: "var(--text-1)", fontSize: "0.88rem" }}
						/>
					</div>

					<div className="table-wrap">
						<table className="data-table">
							<thead>
								<tr>
									<th>Name</th>
									<th>Email</th>
									<th>Alloted Room</th>
									<th>Current Room</th>
									<th>Role</th>
									<th>Actions</th>
								</tr>
							</thead>
							<tbody>
								{filteredUsers.map((item) => (
									<tr key={item._id}>
										<td style={{ fontWeight: 600 }}>{item.name}</td>
										<td>{item.email}</td>
										<td className="mono">{item.allotedRoom || "—"}</td>
										<td className="mono">{item.currentRoom || "—"}</td>
										<td><Badge value={item.role} /></td>
										<td className="table-actions">
											{item.role !== "superadmin" ? (
												<>
													<Button
														type="button"
														variant="secondary"
														size="sm"
														disabled={savingRoleId === item._id}
														onClick={() => updateRole(item, item.role === "admin" ? "user" : "admin")}
													>
														{item.role === "admin" ? "Demote to User" : "Promote to Admin"}
													</Button>

													<Button
														type="button"
														variant="ghost"
														size="sm"
														onClick={() => handleOpenEditUser(item)}
													>
														Edit User
													</Button>

													<Button
														type="button"
														variant="danger"
														size="sm"
														onClick={() => handleDeleteUser(item)}
													>
														Delete User
													</Button>
												</>
											) : (
												<span className="muted" style={{ fontSize: "0.85rem" }}>Protected Super Admin</span>
											)}
										</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>
				</section>
			)}

			{/* TAB 4: ROOMS */}
			{activeTab === "rooms" && (
				<section className="surface dashboard-panel">
					<h2>Room Management</h2>
					<div className="table-wrap">
						<table className="data-table">
							<thead>
								<tr>
									<th>Owner</th>
									<th>Block</th>
									<th>Room Number</th>
									<th>Floor</th>
									<th>Status</th>
								</tr>
							</thead>
							<tbody>
								{data.rooms.map((item) => (
									<tr key={item._id}>
										<td>{item.owner?.name || "—"}</td>
										<td>{item.block || "—"}</td>
										<td className="mono" style={{ fontWeight: 600 }}>{item.roomNumber}</td>
										<td>{item.floor || "—"}</td>
										<td><Badge value={item.status} pulse={item.status === "pending-swap"} /></td>
									</tr>
								))}
							</tbody>
						</table>
					</div>
				</section>
			)}

			{/* TAB 5: SWAP REQUESTS */}
			{activeTab === "swaps" && (
				<section className="surface dashboard-panel">
					<h2>All Campus Swap Requests</h2>
					<div className="table-wrap">
						<table className="data-table">
							<thead>
								<tr>
									<th>Requester</th>
									<th>Target Student</th>
									<th>Requester Room</th>
									<th>Target Room</th>
									<th>Status</th>
								</tr>
							</thead>
							<tbody>
								{data.swaps.map((item) => (
									<tr key={item._id}>
										<td>{item.requester?.name || "—"}</td>
										<td>{item.targetUser?.name || "—"}</td>
										<td className="mono">{item.requesterRoom?.roomNumber || "—"}</td>
										<td className="mono">{item.targetRoom?.roomNumber || "—"}</td>
										<td><Badge value={item.status} pulse={item.status === "pending"} /></td>
									</tr>
								))}
							</tbody>
						</table>
					</div>
				</section>
			)}

			{/* EDIT USER MODAL */}
			{editingUser && (
				<div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: "20px" }}>
					<form className="surface auth-card" style={{ maxWidth: "460px", width: "100%" }} onSubmit={handleSaveEditUser}>
						<div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
							<h2 style={{ margin: 0, fontSize: "1.2rem" }}>Edit User Details</h2>
							<button type="button" onClick={() => setEditingUser(null)} style={{ background: "none", border: "none", color: "var(--text-2)", fontSize: "1.2rem", cursor: "pointer" }}>✕</button>
						</div>

						<Input
							label="Name"
							value={editForm.name}
							onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))}
							required
						/>
						<Input
							label="Email"
							value={editForm.email}
							onChange={(e) => setEditForm((f) => ({ ...f, email: e.target.value }))}
							required
						/>
						<Input
							label="Alloted Room"
							value={editForm.allotedRoom}
							onChange={(e) => setEditForm((f) => ({ ...f, allotedRoom: e.target.value.toUpperCase() }))}
							placeholder="A101"
							maxLength={4}
							required
						/>
						<Input
							label="Current Room"
							value={editForm.currentRoom}
							onChange={(e) => setEditForm((f) => ({ ...f, currentRoom: e.target.value.toUpperCase() }))}
							placeholder="A101"
							maxLength={4}
							required
						/>

						<div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "16px" }}>
							<Button type="button" variant="ghost" onClick={() => setEditingUser(null)}>Cancel</Button>
							<Button type="submit" disabled={savingEdit}>{savingEdit ? "Saving..." : "Save Details"}</Button>
						</div>
					</form>
				</div>
			)}
		</section>
	);
}
