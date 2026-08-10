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
import { useToast } from "../../context/ToastContext.jsx";

const barWidth = (value, total) => `${total ? Math.max((value / total) * 100, 6) : 6}%`;

export default function AdminDashboard({ isSuperAdmin = false }) {
	const { user } = useAuth();
	const showToast = useToast();
	const [activeTab, setActiveTab] = useState("overview");

	const [data, setData] = useState({ users: [], rooms: [], swaps: [], analytics: null, reports: [] });
	const [loading, setLoading] = useState(true);
	const [userSearch, setUserSearch] = useState("");
	const [reportStatusFilter, setReportStatusFilter] = useState("all");
	const [updatingReportId, setUpdatingReportId] = useState(null);
	const [selectedSwap, setSelectedSwap] = useState(null);

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

	if (loading) return <Skeleton lines={8} />;

	return (
		<section className="page-shell">
			<div className="page-head">
				<div>
					<p className="eyebrow">{isSuperAdmin ? "Super Admin Console" : "Admin Console"}</p>
					<h1>{isSuperAdmin ? "Governance & System Management" : "Operational Console"}</h1>
					<p className="muted">
						{isSuperAdmin
							? "Manage users, resolve room conflict reports, and govern system roles."
							: "Review room conflict reports, inspect registered users and rooms, and monitor swap activity."}
					</p>
				</div>
				<Badge value={user?.role || (isSuperAdmin ? "superadmin" : "admin")} />
			</div>

			{/* Sub-Navigation Tabs */}
			<div style={{ display: "flex", gap: "10px", borderBottom: "1px solid var(--border-color)", paddingBottom: "12px", marginBottom: "20px" }}>
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
					style={{ position: "relative", display: "inline-flex", alignItems: "center", gap: "6px" }}
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
					<UsersIcon size={16} /> Users Directory ({data.users.length})
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
											display: "inline-flex",
											alignItems: "center",
											gap: "6px",
										}}
									>
										<DotIcon size={7} color="#4ade80" /> {statusTotals.total || data.rooms.length} Rooms Total
									</span>
								</div>

								{analytics?.roomsByStatus?.length ? (
									analytics.roomsByStatus.map((item) => {
										const isAvailable = item._id?.toLowerCase().includes("available");
										return (
											<div key={item._id} className="bar-row" style={{ marginBottom: "14px", alignItems: "center" }}>
												<div style={{ display: "flex", alignItems: "center", gap: "8px", width: "130px" }}>
													<DotIcon size={8} color={isAvailable ? "#4ade80" : "#f97316"} />
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
									<EmptyState title="No analytics yet" message="Status data will populate as users register rooms." />
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
											display: "inline-flex",
											alignItems: "center",
											gap: "6px",
										}}
									>
										<DotIcon size={7} color="#4ade80" /> Campus Blocks
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
									<EmptyState title="No block data" message="Block activity will appear after room registration." />
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

			{/* USERS & ROOMS DIRECTORY TAB */}
			{activeTab === "users" && (
				<section className="surface dashboard-panel">
					<div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px", flexWrap: "wrap", gap: "16px" }}>
						<h2>Registered Users & Rooms Directory</h2>
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
									<th>Status</th>
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
										<td>{item.isVerified ? <span style={{ color: "#4ade80", fontWeight: 600 }}>Verified</span> : <span className="muted">Unverified</span>}</td>
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
						<h2>Swap Requests Overview</h2>
						<p className="muted" style={{ fontSize: "0.88rem" }}>
							Click any request row to inspect full room exchange details and student profiles.
						</p>
					</div>
					<div className="table-wrap">
						<table className="data-table">
							<thead>
								<tr>
									<th>Requester</th>
									<th>Requester Room</th>
									<th>Target Student</th>
									<th>Target Room</th>
									<th>Status</th>
									<th>Date</th>
									<th>Action</th>
								</tr>
							</thead>
							<tbody>
								{data.swaps.map((item) => (
									<tr
										key={item._id}
										onClick={() => setSelectedSwap(item)}
										style={{ cursor: "pointer", transition: "background 150ms ease" }}
										className="hover-row"
									>
										<td style={{ fontWeight: 600 }}>{item.requester?.name || "—"}</td>
										<td className="mono" style={{ fontWeight: 600 }}>{item.requesterRoom?.roomNumber || "—"}</td>
										<td style={{ fontWeight: 600 }}>{item.targetUser?.name || "—"}</td>
										<td className="mono" style={{ fontWeight: 600 }}>{item.targetRoom?.roomNumber || "—"}</td>
										<td><Badge value={item.status} pulse={item.status === "pending"} /></td>
										<td className="muted" style={{ fontSize: "0.82rem" }}>
											{new Date(item.createdAt).toLocaleDateString()}
										</td>
										<td>
											<Button
												type="button"
												variant="secondary"
												size="sm"
												onClick={(e) => {
													e.stopPropagation();
													setSelectedSwap(item);
												}}
											>
												View details
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
					onClose={() => setSelectedSwap(null)}
					title="Complete Swap Mapping"
					footer={
						<div style={{ display: "flex", justifyContent: "flex-end", width: "100%" }}>
							<Button type="button" variant="secondary" onClick={() => setSelectedSwap(null)}>
								Close
							</Button>
						</div>
					}
				>
					{(() => {
						const mappings = selectedSwap.mappings || [
							{
								user: { id: selectedSwap.requester?._id, name: selectedSwap.requester?.name, email: selectedSwap.requester?.email },
								currentRoom: selectedSwap.requesterRoom?.roomNumber || "—",
								newRoom: selectedSwap.targetRoom?.roomNumber || "—",
								status: selectedSwap.status || "pending",
							},
							{
								user: { id: selectedSwap.targetUser?._id, name: selectedSwap.targetUser?.name, email: selectedSwap.targetUser?.email },
								currentRoom: selectedSwap.targetRoom?.roomNumber || "—",
								newRoom: selectedSwap.requesterRoom?.roomNumber || "—",
								status: "pending",
							},
						];
						const chainLength = selectedSwap.chainLength || mappings.length;

						return (
							<div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
								<div>
									<p className="eyebrow" style={{ color: "var(--color-accent, #c9f31d)", fontSize: "0.75rem", marginBottom: "4px" }}>
										{chainLength}-USER SWAP CHAIN
									</p>
									<p className="muted" style={{ fontSize: "0.85rem" }}>
										Below is the full mapping of all participating users, their room transfers, and their individual confirmation statuses:
									</p>
								</div>

								<div className="table-wrap surface" style={{ borderRadius: "12px", overflow: "hidden", border: "1px solid var(--border-color)" }}>
									<table className="data-table">
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
														{m.user?.email && (
															<span className="mono muted" style={{ display: "block", fontSize: "0.78rem" }}>
																Roll: {m.user.email.split("@")[0].toUpperCase()}
															</span>
														)}
													</td>
													<td className="mono" style={{ fontSize: "0.95rem" }}>{m.currentRoom || "—"}</td>
													<td className="mono accent" style={{ fontSize: "0.95rem", color: "var(--color-accent, #c9f31d)" }}>
														<strong>{m.newRoom || "—"}</strong>
													</td>
													<td>
														<Badge value={m.status || "pending"} pulse={m.status === "pending"} />
													</td>
												</tr>
											))}
										</tbody>
									</table>
								</div>

								<div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "0.8rem", color: "var(--text-2)", borderTop: "1px solid var(--border-color)", paddingTop: "12px", marginTop: "4px" }}>
									<span>Request ID: <span className="mono">{selectedSwap._id}</span></span>
									<span>Submitted: {new Date(selectedSwap.createdAt).toLocaleString()}</span>
								</div>
							</div>
						);
					})()}
				</Modal>
			)}
		</section>
	);
}
