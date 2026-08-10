import { useCallback, useEffect, useMemo, useState } from "react";
import api from "../../api/axios.js";
import Badge from "../../components/common/Badge.jsx";
import Button from "../../components/common/Button.jsx";
import EmptyState from "../../components/common/EmptyState.jsx";
import Input from "../../components/common/Input.jsx";
import Modal from "../../components/common/Modal.jsx";
import Skeleton from "../../components/common/Skeleton.jsx";
import {
	CalendarIcon,
	DotIcon,
	FlagIcon,
	OverviewIcon,
	RoomIcon,
	SettingsIcon,
	SwapIcon,
	UsersIcon,
	ZapIcon,
} from "../../components/common/Icons.jsx";
import { useAuth } from "../../context/AuthContext.jsx";
import { useConfirm } from "../../context/ConfirmContext.jsx";
import { useToast } from "../../context/ToastContext.jsx";

const barWidth = (value, total) => `${total ? Math.max((value / total) * 100, 6) : 6}%`;

export default function SuperAdminDashboard() {
	const { user } = useAuth();
	const confirm = useConfirm();
	const showToast = useToast();
	const [activeTab, setActiveTab] = useState("overview");

	const [data, setData] = useState({ users: [], rooms: [], swaps: [], analytics: null, reports: [] });
	const [loading, setLoading] = useState(true);
	const [userSearch, setUserSearch] = useState("");
	const [reportStatusFilter, setReportStatusFilter] = useState("all");
	const [updatingReportId, setUpdatingReportId] = useState(null);
	const [savingRoleId, setSavingRoleId] = useState(null);
	const [selectedSwap, setSelectedSwap] = useState(null);
	const [reverifyModalConfig, setReverifyModalConfig] = useState(null);
	const [superAdminPassword, setSuperAdminPassword] = useState("");

	const loadData = useCallback(async () => {
		try {
			const [usersRes, roomsRes, swapsRes, analyticsRes, reportsRes] = await Promise.all([
				api.get("/admin/users"),
				api.get("/admin/rooms"),
				api.get("/admin/swaps"),
				api.get("/admin/analytics"),
				api.get("/reports"),
			]);
			setData({
				users: usersRes.data.users || [],
				rooms: roomsRes.data.rooms || [],
				swaps: swapsRes.data.swaps || [],
				analytics: analyticsRes.data,
				reports: reportsRes.data.reports || [],
			});
		} catch (error) {
			showToast(error.response?.data?.message || "Unable to load console data.", "error");
		} finally {
			setLoading(false);
		}
	}, [showToast]);

	useEffect(() => {
		loadData();
	}, [loadData]);

	const analytics = data.analytics;
	const statusTotals = useMemo(
		() => ({ total: analytics?.roomsByStatus?.reduce((sum, item) => sum + item.count, 0) || 0 }),
		[analytics]
	);

	const pendingReportsCount = useMemo(
		() => data.reports.filter((r) => r.status === "pending").length,
		[data.reports]
	);

	// Filtered & Roll-Number-Sorted users for directory
	const filteredUsers = useMemo(() => {
		let list = data.users;
		if (userSearch.trim()) {
			const query = userSearch.toLowerCase().trim();
			list = list.filter(
				(u) =>
					u.name?.toLowerCase().includes(query) ||
					u.email?.toLowerCase().includes(query) ||
					u.email?.split("@")[0]?.toLowerCase().includes(query) ||
					u.allotedRoom?.toLowerCase().includes(query) ||
					u.currentRoom?.toLowerCase().includes(query) ||
					u.block?.toLowerCase().includes(query) ||
					u.role?.toLowerCase().includes(query)
			);
		}
		return [...list].sort((a, b) => {
			const rollA = (a.email ? a.email.split("@")[0] : "").toLowerCase();
			const rollB = (b.email ? b.email.split("@")[0] : "").toLowerCase();
			return rollA.localeCompare(rollB, undefined, { numeric: true });
		});
	}, [data.users, userSearch]);

	// Filtered reports
	const filteredReports = useMemo(() => {
		if (reportStatusFilter === "all") return data.reports;
		return data.reports.filter((r) => r.status === reportStatusFilter);
	}, [data.reports, reportStatusFilter]);

	// Update Report status handler
	const handleUpdateReportStatus = async (reportId, newStatus) => {
		setUpdatingReportId(reportId);
		try {
			await api.patch(`/reports/${reportId}/status`, { status: newStatus });
			showToast(`Report status updated to ${newStatus}.`, "success");
			await loadData();
		} catch (error) {
			showToast(error.response?.data?.message || "Failed to update report status.", "error");
		} finally {
			setUpdatingReportId(null);
		}
	};

	const promoteUserToAdmin = async (targetUser) => {
		const ok = await confirm({
			title: "Promote User to Admin",
			message: `Are you sure you want to promote ${targetUser.name} to Admin role?`,
			confirmLabel: "Promote to Admin",
		});
		if (!ok) return;
		setSavingRoleId(targetUser._id);
		try {
			const response = await api.patch(`/admin/users/${targetUser._id}/role`, { role: "admin" });
			showToast(response.data.message, "success");
			await loadData();
		} catch (error) {
			showToast(error.response?.data?.message || "Unable to promote user.", "error");
		} finally {
			setSavingRoleId(null);
		}
	};

	const handleCloseReverifyModal = useCallback(() => {
		setReverifyModalConfig(null);
		setSuperAdminPassword("");
	}, []);

	const promoteAdminToSuperAdmin = (targetUser) => {
		setReverifyModalConfig({
			targetUser,
			newRole: "superadmin",
			title: "Promote to Super Admin",
			actionText: "Promote to Super Admin",
			description: `You are granting full Super Admin privileges to ${targetUser.name}.`,
		});
		setSuperAdminPassword("");
	};

	const demoteSuperAdminToAdmin = (targetUser) => {
		setReverifyModalConfig({
			targetUser,
			newRole: "admin",
			title: "Demote Super Admin to Admin",
			actionText: "Demote to Admin",
			description: `You are demoting ${targetUser.name} from Super Admin to Admin.`,
		});
		setSuperAdminPassword("");
	};

	const handleConfirmRoleReverification = async (e) => {
		if (e) e.preventDefault();
		if (!reverifyModalConfig || !superAdminPassword.trim()) return;

		const { targetUser, newRole } = reverifyModalConfig;
		setSavingRoleId(targetUser._id);
		try {
			const response = await api.patch(`/admin/users/${targetUser._id}/role`, {
				role: newRole,
				password: superAdminPassword,
			});
			showToast(response.data.message, "success");
			setReverifyModalConfig(null);
			setSuperAdminPassword("");
			await loadData();
		} catch (error) {
			showToast(error.response?.data?.message || "Super Admin password verification failed.", "error");
		} finally {
			setSavingRoleId(null);
		}
	};

	const removeAdmin = async (targetUser) => {
		const ok = await confirm({
			title: "Remove Admin Rights",
			message: `Are you sure you want to remove admin access for ${targetUser.name}? User will become a normal user.`,
			confirmLabel: "Remove Admin",
			danger: true,
		});
		if (!ok) return;
		setSavingRoleId(targetUser._id);
		try {
			const response = await api.delete(`/admin/admins/${targetUser._id}`);
			showToast(response.data.message, "success");
			await loadData();
		} catch (error) {
			showToast(error.response?.data?.message || "Unable to remove admin.", "error");
		} finally {
			setSavingRoleId(null);
		}
	};

	const deleteUser = async (targetUser) => {
		const ok = await confirm({
			title: "Delete User Account",
			message: `Are you sure you want to permanently delete ${targetUser.name} and remove all their data from the database?`,
			confirmLabel: "Delete User",
			danger: true,
		});
		if (!ok) return;
		setSavingRoleId(targetUser._id);
		try {
			const response = await api.delete(`/admin/users/${targetUser._id}`);
			showToast(response.data.message, "success");
			await loadData();
		} catch (error) {
			showToast(error.response?.data?.message || "Unable to delete user.", "error");
		} finally {
			setSavingRoleId(null);
		}
	};

	if (loading) return <Skeleton lines={8} />;

	return (
		<section className="page-shell">
			<div className="page-head">
				<div>
					<p className="eyebrow">Super Admin Console</p>
					<h1>Governance & User Management</h1>
					<p className="muted">
						Super Admin privileges: Full governance, role management, room conflict resolutions, and system health oversight.
					</p>
				</div>
				<Badge value={user?.role || "superadmin"} />
			</div>

			{/* Sub-Navigation Tabs */}
			<div style={{ display: "flex", gap: "10px", borderBottom: "1px solid var(--border-color)", paddingBottom: "12px", marginBottom: "20px", flexWrap: "wrap" }}>
				<button
					type="button"
					className={`button ${activeTab === "overview" ? "button-accent" : "button-ghost"}`}
					onClick={() => setActiveTab("overview")}
					style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}
				>
					<OverviewIcon size={16} /> Overview
				</button>
				<button
					type="button"
					className={`button ${activeTab === "reports" ? "button-accent" : "button-ghost"}`}
					onClick={() => setActiveTab("reports")}
					style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}
				>
					<FlagIcon size={16} /> Conflict Reports
					{pendingReportsCount > 0 && (
						<span
							style={{
								marginLeft: "6px",
								padding: "2px 6px",
								borderRadius: "10px",
								background: "var(--color-danger, #ef4444)",
								color: "#fff",
								fontSize: "0.75rem",
								fontWeight: 700,
							}}
						>
							{pendingReportsCount}
						</span>
					)}
				</button>
				<button
					type="button"
					className={`button ${activeTab === "users" ? "button-accent" : "button-ghost"}`}
					onClick={() => setActiveTab("users")}
					style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}
				>
					<SettingsIcon size={16} /> User Governance & Directory ({data.users.length})
				</button>
				<button
					type="button"
					className={`button ${activeTab === "swaps" ? "button-accent" : "button-ghost"}`}
					onClick={() => setActiveTab("swaps")}
					style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}
				>
					<SwapIcon size={16} /> Swap Requests ({data.swaps.length})
				</button>
			</div>

			{/* OVERVIEW TAB */}
			{activeTab === "overview" && (
				<div style={{ display: "flex", flexDirection: "column", gap: "28px" }}>
					{/* Top 5 Metric Cards Row */}
					<div className="admin-metric-grid" style={{ gap: "18px" }}>
						{[
							{
								label: "TOTAL USERS",
								value: analytics?.totalUsers || data.users.length,
								subtext: "Registered accounts",
								icon: <UsersIcon size={18} color="var(--color-accent, #c9f31d)" />,
							},
							{
								label: "TOTAL ROOMS",
								value: analytics?.totalRooms || data.rooms.length,
								subtext: "Listed campus rooms",
								icon: <RoomIcon size={18} color="var(--color-accent, #c9f31d)" />,
							},
							{
								label: "PENDING REPORTS",
								value: pendingReportsCount,
								subtext: "Requires review",
								icon: <FlagIcon size={18} color={pendingReportsCount > 0 ? "var(--color-danger, #ef4444)" : "var(--color-accent, #c9f31d)"} />,
								isAlert: pendingReportsCount > 0,
							},
							{
								label: "SWAPS (WEEK)",
								value: analytics?.swapsCompletedThisWeek || 0,
								subtext: "Completed this week",
								icon: <ZapIcon size={18} color="var(--color-accent, #c9f31d)" />,
							},
							{
								label: "SWAPS (MONTH)",
								value: analytics?.swapsCompletedThisMonth || 0,
								subtext: "Completed this month",
								icon: <CalendarIcon size={18} color="var(--color-accent, #c9f31d)" />,
							},
						].map((item) => (
							<div
								key={item.label}
								className="surface metric-card"
								style={{
									padding: "20px 22px",
									borderRadius: "16px",
									display: "flex",
									flexDirection: "column",
									justify: "space-between",
									minHeight: "120px",
									background: "linear-gradient(180deg, rgba(255, 255, 255, 0.03) 0%, rgba(255, 255, 255, 0.01) 100%)",
									border: "1px solid var(--border-color)",
								}}
							>
								<div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
									<p className="eyebrow" style={{ fontSize: "0.7rem", letterSpacing: "0.12em", fontWeight: 700 }}>
										{item.label}
									</p>
									<span style={{ display: "grid", placeItems: "center" }}>{item.icon}</span>
								</div>
								<div style={{ marginTop: "8px" }}>
									<h2
										style={{
											fontSize: "2.2rem",
											fontWeight: 800,
											color: item.isAlert ? "var(--color-danger, #ef4444)" : "var(--color-accent, #c9f31d)",
											lineHeight: 1,
										}}
									>
										{item.value}
									</h2>
									<p style={{ fontSize: "0.78rem", color: "var(--text-2)", marginTop: "6px" }}>{item.subtext}</p>
								</div>
							</div>
						))}
					</div>

					{/* Lower Analytics Panels Grid */}
					<div className="dashboard-stack" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px", alignItems: "stretch" }}>
						<section
							className="surface dashboard-panel"
							style={{
								padding: "24px",
								borderRadius: "18px",
								display: "flex",
								flexDirection: "column",
								justify: "space-between",
								background: "linear-gradient(180deg, rgba(255, 255, 255, 0.02) 0%, rgba(255, 255, 255, 0.01) 100%)",
								border: "1px solid var(--border-color)",
							}}
						>
							<div>
								<div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
									<h2 style={{ fontSize: "1.25rem", fontWeight: 700 }}>Room Status Breakdown</h2>
									<span
										style={{
											fontSize: "0.78rem",
											padding: "4px 12px",
											borderRadius: "999px",
											background: "rgba(201, 243, 29, 0.08)",
											border: "1px solid rgba(201, 243, 29, 0.25)",
											color: "var(--color-accent, #c9f31d)",
											fontWeight: 600,
										}}
									>
										🟢 {statusTotals.total || data.rooms.length} Rooms Total
									</span>
								</div>

								{analytics?.roomsByStatus?.length ? (
									analytics.roomsByStatus.map((item) => {
										const isAvailable = item._id?.toLowerCase().includes("available");
										return (
											<div key={item._id} className="bar-row" style={{ marginBottom: "14px", alignItems: "center" }}>
												<div style={{ display: "flex", alignItems: "center", gap: "8px", width: "130px" }}>
													<span
														style={{
															width: "8px",
															height: "8px",
															borderRadius: "999px",
															background: isAvailable ? "#4ade80" : "#f97316",
															display: "inline-block",
														}}
													/>
													<span style={{ textTransform: "capitalize", fontWeight: 600, fontSize: "0.92rem" }}>
														{item._id}
													</span>
												</div>
												<div className="bar-track" style={{ flex: 1, height: "8px", borderRadius: "999px" }}>
													<div
														className="bar-fill"
														style={{
															width: barWidth(item.count, statusTotals.total),
															background: isAvailable
																? "linear-gradient(90deg, #c9f31d 0%, #4ade80 100%)"
																: "linear-gradient(90deg, #c9f31d 0%, #f97316 100%)",
														}}
													/>
												</div>
												<strong style={{ fontSize: "1.05rem", minWidth: "24px", textAlign: "right" }}>{item.count}</strong>
											</div>
										);
									})
								) : (
									<EmptyState title="No analytics available" message="Status metrics will appear once rooms are populated." icon="▣" />
								)}
							</div>
						</section>

						<section
							className="surface dashboard-panel"
							style={{
								padding: "24px",
								borderRadius: "18px",
								display: "flex",
								flexDirection: "column",
								justify: "space-between",
								background: "linear-gradient(180deg, rgba(255, 255, 255, 0.02) 0%, rgba(255, 255, 255, 0.01) 100%)",
								border: "1px solid var(--border-color)",
							}}
						>
							<div>
								<div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
									<h2 style={{ fontSize: "1.25rem", fontWeight: 700 }}>Most Active Blocks</h2>
									<span
										style={{
											fontSize: "0.78rem",
											padding: "4px 12px",
											borderRadius: "999px",
											background: "rgba(201, 243, 29, 0.08)",
											border: "1px solid rgba(201, 243, 29, 0.25)",
											color: "var(--color-accent, #c9f31d)",
											fontWeight: 600,
										}}
									>
										🟢 Campus Blocks
									</span>
								</div>

								{analytics?.mostActiveBlocks?.length ? (
									analytics.mostActiveBlocks.map((item) => (
										<div key={item._id} className="bar-row" style={{ marginBottom: "14px", alignItems: "center" }}>
											<span style={{ fontWeight: 600, fontSize: "0.92rem", width: "130px" }}>
												Block {item._id || "Unassigned"}
											</span>
											<div className="bar-track" style={{ flex: 1, height: "8px", borderRadius: "999px" }}>
												<div
													className="bar-fill"
													style={{
														width: barWidth(item.count, analytics.mostActiveBlocks[0]?.count || 1),
														background: "linear-gradient(90deg, #c9f31d 0%, #86efac 100%)",
													}}
												/>
											</div>
											<strong style={{ fontSize: "1.05rem", minWidth: "24px", textAlign: "right" }}>{item.count}</strong>
										</div>
									))
								) : (
									<EmptyState title="No block data" message="Block activity will appear after room registration." icon="▤" />
								)}
							</div>
						</section>
					</div>
				</div>
			)}

			{/* REPORTS CONSOLE TAB */}
			{activeTab === "reports" && (
				<section className="surface dashboard-panel">
					<div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px", flexWrap: "wrap", gap: "12px" }}>
						<div>
							<h2>Room Ownership Conflict Reports</h2>
							<p className="muted" style={{ fontSize: "0.88rem" }}>
								Issues submitted by students during registration when room codes are already claimed.
							</p>
						</div>
						<div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
							<span className="muted" style={{ fontSize: "0.88rem" }}>Filter:</span>
							<select
								value={reportStatusFilter}
								onChange={(e) => setReportStatusFilter(e.target.value)}
								style={{
									padding: "6px 12px",
									background: "var(--surface-color)",
									border: "1px solid var(--border-color)",
									borderRadius: "6px",
									color: "var(--text-1)",
								}}
							>
								<option value="all">All Reports ({data.reports.length})</option>
								<option value="pending">Pending</option>
								<option value="investigating">Investigating</option>
								<option value="resolved">Resolved</option>
								<option value="dismissed">Dismissed</option>
							</select>
						</div>
					</div>

					{filteredReports.length ? (
						<div className="table-wrap">
							<table className="data-table">
								<thead>
									<tr>
										<th>Reporter</th>
										<th>Conflict Type</th>
										<th>Rooms</th>
										<th>Report Message</th>
										<th>Submitted</th>
										<th>Status</th>
										<th>Actions</th>
									</tr>
								</thead>
								<tbody>
									{filteredReports.map((report) => (
										<tr key={report._id}>
											<td>
												<div style={{ fontWeight: 600 }}>{report.reporterName}</div>
												<div className="muted" style={{ fontSize: "0.82rem" }}>{report.reporterEmail}</div>
											</td>
											<td>
												<Badge value={(report.conflictType || "alloted_room").replace("_", " ")} />
											</td>
											<td>
												<div className="mono" style={{ fontSize: "0.85rem" }}>
													{report.allotedRoom ? <div>Allotted: {report.allotedRoom}</div> : null}
													{report.currentRoom ? <div>Current: {report.currentRoom}</div> : null}
												</div>
											</td>
											<td style={{ maxWidth: "280px" }}>
												<p style={{ fontSize: "0.85rem", margin: 0, lineHeight: 1.4 }}>{report.message}</p>
											</td>
											<td className="muted" style={{ fontSize: "0.82rem" }}>
												{new Date(report.createdAt).toLocaleDateString()}
											</td>
											<td>
												<Badge
													value={report.status}
													pulse={report.status === "pending"}
													variant={report.status === "resolved" ? "success" : report.status === "pending" ? "danger" : "default"}
												/>
											</td>
											<td>
												<div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
													{report.status !== "resolved" && (
														<Button
															type="button"
															variant="accent"
															size="sm"
															disabled={updatingReportId === report._id}
															onClick={() => handleUpdateReportStatus(report._id, "resolved")}
														>
															Mark Resolved
														</Button>
													)}
													{report.status === "pending" && (
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
												</div>
											</td>
										</tr>
									))}
								</tbody>
							</table>
						</div>
					) : (
						<EmptyState title="No conflict reports" message="No reports match the selected status filter." />
					)}
				</section>
			)}

			{/* USER GOVERNANCE & DIRECTORY TAB */}
			{activeTab === "users" && (
				<section className="surface dashboard-panel">
					<div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px", flexWrap: "wrap", gap: "16px" }}>
						<div>
							<h2 style={{ fontSize: "1.3rem", fontWeight: 700 }}>User Directory & Role Governance</h2>
							<p className="muted" style={{ fontSize: "0.88rem", marginTop: "4px" }}>
								View all users, inspect room allocations, and promote or demote platform roles.
							</p>
						</div>
						<div style={{ width: "340px", flexShrink: 0 }}>
							<Input
								placeholder="Search by name, roll, room code, role..."
								value={userSearch}
								onChange={(e) => setUserSearch(e.target.value)}
							/>
						</div>
					</div>

					<div className="table-wrap">
						<table className="data-table">
							<thead>
								<tr>
									<th>Student Name</th>
									<th>Roll Number</th>
									<th>Allotted Room</th>
									<th>Current Room</th>
									<th>Block / Floor</th>
									<th>Role</th>
									<th>Governance Actions</th>
								</tr>
							</thead>
							<tbody>
								{filteredUsers.map((item) => (
									<tr key={item._id}>
										<td style={{ fontWeight: 600 }}>{item.name}</td>
										<td className="mono" style={{ fontWeight: 600 }}>{item.email ? item.email.split("@")[0] : "—"}</td>
										<td className="mono" style={{ fontWeight: 600 }}>{item.allotedRoom || "—"}</td>
										<td className="mono" style={{ color: "var(--color-accent)", fontWeight: 600 }}>
											{item.currentRoom || item.allotedRoom || "—"}
										</td>
										<td style={{ fontSize: "0.85rem" }}>
											<div>Block {item.block || "—"}</div>
											<div className="muted">{item.floor || "—"}</div>
										</td>
										<td><Badge value={item.role} /></td>
										<td className="table-actions">
											{item.role === "superadmin" ? (
												(item._id === user?.id || item._id === user?._id) ? (
													<span className="muted" style={{ fontSize: "0.85rem", display: "inline-block", padding: "8px 0" }}>Current Super Admin</span>
												) : (
													<div style={{ display: "grid", gridTemplateColumns: "195px 135px", gap: "12px", alignItems: "center" }}>
														<Button
															type="button"
															variant="danger"
															size="sm"
															style={{ width: "100%", justifyContent: "center", fontSize: "0.85rem", padding: "8px 12px" }}
															disabled={savingRoleId === item._id}
															onClick={() => demoteSuperAdminToAdmin(item)}
														>
															Demote to Admin
														</Button>
													</div>
												)
											) : item.role === "admin" ? (
												<div style={{ display: "grid", gridTemplateColumns: "195px 135px", gap: "12px", alignItems: "center" }}>
													<Button
														type="button"
														variant="secondary"
														size="sm"
														style={{ width: "100%", justifyContent: "center", fontSize: "0.85rem", padding: "8px 12px" }}
														disabled={savingRoleId === item._id}
														onClick={() => promoteAdminToSuperAdmin(item)}
													>
														Promote to Super Admin
													</Button>
													<Button
														type="button"
														variant="danger"
														size="sm"
														style={{ width: "100%", justifyContent: "center", fontSize: "0.85rem", padding: "8px 12px" }}
														disabled={savingRoleId === item._id}
														onClick={() => removeAdmin(item)}
													>
														Remove Admin
													</Button>
												</div>
											) : (
												<div style={{ display: "grid", gridTemplateColumns: "195px 135px", gap: "12px", alignItems: "center" }}>
													<Button
														type="button"
														variant="secondary"
														size="sm"
														style={{ width: "100%", justifyContent: "center", fontSize: "0.85rem", padding: "8px 12px" }}
														disabled={savingRoleId === item._id}
														onClick={() => promoteUserToAdmin(item)}
													>
														Promote to Admin
													</Button>
													<Button
														type="button"
														variant="danger"
														size="sm"
														style={{ width: "100%", justifyContent: "center", fontSize: "0.85rem", padding: "8px 12px" }}
														disabled={savingRoleId === item._id}
														onClick={() => deleteUser(item)}
													>
														Delete User
													</Button>
												</div>
											)}
										</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>
				</section>
			)}

			{/* SWAP REQUESTS TAB */}
			{activeTab === "swaps" && (
				<section className="surface dashboard-panel">
					<div style={{ marginBottom: "16px" }}>
						<h2>All Swap Requests ({data.swaps.length})</h2>
						<p className="muted" style={{ fontSize: "0.88rem" }}>
							Platform-wide listing of all peer-to-peer room swap submissions and status.
						</p>
					</div>

					<div className="table-wrap">
						<table className="data-table">
							<thead>
								<tr>
									<th>Requester</th>
									<th>Target Student</th>
									<th>Status</th>
									<th>Submitted</th>
									<th>Actions</th>
								</tr>
							</thead>
							<tbody>
								{data.swaps.map((item) => (
									<tr key={item._id}>
										<td>
											<div style={{ fontWeight: 600 }}>{item.requester?.name || "Student"}</div>
											<div className="mono muted" style={{ fontSize: "0.8rem" }}>
												{item.requester?.email ? item.requester.email.split("@")[0] : "—"} ({item.requesterRoom?.roomNumber || "—"})
											</div>
										</td>
										<td>
											<div style={{ fontWeight: 600 }}>{item.targetUser?.name || "Student"}</div>
											<div className="mono muted" style={{ fontSize: "0.8rem" }}>
												{item.targetUser?.email ? item.targetUser.email.split("@")[0] : "—"} ({item.targetRoom?.roomNumber || "—"})
											</div>
										</td>
										<td><Badge value={item.status} pulse={item.status === "pending"} /></td>
										<td style={{ fontSize: "0.85rem" }}>{new Date(item.createdAt).toLocaleDateString()}</td>
										<td>
											<Button
												type="button"
												variant="secondary"
												size="sm"
												onClick={() => setSelectedSwap(item)}
											>
												Swap Details
											</Button>
										</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>
				</section>
			)}

			{/* SWAP DETAILS MODAL */}
			{selectedSwap && (
				<Modal
					open={Boolean(selectedSwap)}
					title="Swap Request Details"
					onClose={() => setSelectedSwap(null)}
					footer={
						<div style={{ display: "flex", justifyContent: "flex-end" }}>
							<Button type="button" variant="secondary" onClick={() => setSelectedSwap(null)}>
								Close
							</Button>
						</div>
					}
				>
					{(() => {
						const mappings = selectedSwap.mappings || [
							{
								user: { name: selectedSwap.requester?.name, email: selectedSwap.requester?.email },
								currentRoom: selectedSwap.requesterRoom?.roomNumber,
								newRoom: selectedSwap.targetRoom?.roomNumber,
								status: selectedSwap.status,
							},
							{
								user: { name: selectedSwap.targetUser?.name, email: selectedSwap.targetUser?.email },
								currentRoom: selectedSwap.targetRoom?.roomNumber,
								newRoom: selectedSwap.requesterRoom?.roomNumber,
								status: "pending",
							},
						];
						return (
							<div>
								<p className="muted" style={{ fontSize: "0.88rem", marginBottom: "16px" }}>
									Chain length: <strong style={{ color: "var(--text-1)" }}>{selectedSwap.chainLength || mappings.length}-user swap chain</strong>
								</p>
								<div className="table-wrap" style={{ marginBottom: "16px" }}>
									<table className="data-table" style={{ fontSize: "0.9rem" }}>
										<thead>
											<tr>
												<th>User</th>
												<th>Current Room</th>
												<th>New Room</th>
												<th>Status</th>
											</tr>
										</thead>
										<tbody>
											{mappings.map((m, idx) => (
												<tr key={m.user?.id || idx}>
													<td>
														<strong style={{ fontSize: "0.95rem" }}>{m.user?.name || "Student"}</strong>
													</td>
													<td className="mono">{m.currentRoom || "—"}</td>
													<td className="mono">{m.newRoom || "—"}</td>
													<td>
														<Badge value={m.status || "pending"} pulse={m.status === "pending"} />
													</td>
												</tr>
											))}
										</tbody>
									</table>
								</div>
							</div>
						);
					})()}
				</Modal>
			)}

			{reverifyModalConfig && (
				<Modal
					open={Boolean(reverifyModalConfig)}
					title={`Super Admin Reverification`}
					onClose={handleCloseReverifyModal}
					footer={
						<div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
							<Button
								type="button"
								variant="ghost"
								onClick={handleCloseReverifyModal}
							>
								Cancel
							</Button>
							<Button
								type="button"
								variant={reverifyModalConfig?.newRole === "admin" ? "danger" : "accent"}
								disabled={!superAdminPassword.trim() || savingRoleId === reverifyModalConfig?.targetUser?._id}
								onClick={handleConfirmRoleReverification}
							>
								{savingRoleId === reverifyModalConfig?.targetUser?._id ? "Verifying..." : `Verify & ${reverifyModalConfig?.actionText}`}
							</Button>
						</div>
					}
				>
					<form onSubmit={handleConfirmRoleReverification}>
						<p style={{ marginBottom: "12px", fontSize: "0.95rem", lineHeight: 1.5 }}>
							{reverifyModalConfig?.description}
						</p>
						<p style={{ marginBottom: "20px", fontSize: "0.85rem" }} className="muted">
							Please enter your Super Admin account password to re-verify your identity before granting or removing governance privileges.
						</p>
						<Input
							label="Super Admin Password"
							type="password"
							placeholder="Enter your password to verify"
							value={superAdminPassword}
							onChange={(e) => setSuperAdminPassword(e.target.value)}
							autoFocus
						/>
					</form>
				</Modal>
			)}
		</section>
	);
}
