import { useCallback, useEffect, useMemo, useState } from "react";
import api from "../../api/axios.js";
import Badge from "../../components/common/Badge.jsx";
import Button from "../../components/common/Button.jsx";
import EmptyState from "../../components/common/EmptyState.jsx";
import Skeleton from "../../components/common/Skeleton.jsx";
import { useAuth } from "../../context/AuthContext.jsx";
import { useConfirm } from "../../context/ConfirmContext.jsx";
import { useToast } from "../../context/ToastContext.jsx";

export default function SuperAdminDashboard() {
	const { user } = useAuth();
	const confirm = useConfirm();
	const showToast = useToast();
	const [data, setData] = useState({ users: [], rooms: [], swaps: [], analytics: null });
	const [loading, setLoading] = useState(true);
	const [savingRoleId, setSavingRoleId] = useState(null);

	const load = useCallback(async () => {
		try {
			const [usersResponse, roomsResponse, swapsResponse, analyticsResponse] = await Promise.all([api.get("/admin/users"), api.get("/admin/rooms"), api.get("/admin/swaps"), api.get("/admin/analytics")]);
			setData({ users: usersResponse.data.users || [], rooms: roomsResponse.data.rooms || [], swaps: swapsResponse.data.swaps || [], analytics: analyticsResponse.data });
		} catch (error) {
			showToast(error.response?.data?.message || "Unable to load super admin data.", "error");
		} finally {
			setLoading(false);
		}
	}, [showToast]);

	useEffect(() => {
		// Intentional mount fetch for dashboard data.
		// eslint-disable-next-line react-hooks/set-state-in-effect
		load();
	}, [load]);

	const analytics = data.analytics;
	const roomStatusSummary = useMemo(() => analytics?.roomsByStatus || [], [analytics]);

	const updateRole = async (targetUser, role) => {
		const ok = await confirm({ title: "Update role", message: `Set ${targetUser.name} to ${role}?`, confirmLabel: "Update role" });
		if (!ok) return;
		setSavingRoleId(targetUser._id);
		try {
			const response = await api.patch(`/admin/users/${targetUser._id}/role`, { role });
			showToast(response.data.message, "success");
			await load();
		} catch (error) {
			showToast(error.response?.data?.message || "Unable to update role.", "error");
		} finally {
			setSavingRoleId(null);
		}
	};

	const removeAdmin = async (targetUser) => {
		const ok = await confirm({ title: "Remove admin", message: `Remove admin access for ${targetUser.name}?`, confirmLabel: "Remove admin", danger: true });
		if (!ok) return;
		try {
			const response = await api.delete(`/admin/admins/${targetUser._id}`);
			showToast(response.data.message, "success");
			await load();
		} catch (error) {
			showToast(error.response?.data?.message || "Unable to remove admin.", "error");
		}
	};

	if (loading) return <Skeleton lines={8} />;

	return (
		<section className="page-shell">
			<div className="page-head">
				<div>
					<p className="eyebrow">Super admin</p>
					<h1>Governance and analytics</h1>
					<p className="muted">Manage roles and review the health of the room swap network.</p>
				</div>
				<Badge value={user?.role || "superadmin"} />
			</div>

			<div className="metric-grid">
				{[
					{ label: "Users", value: analytics?.totalUsers || 0 },
					{ label: "Rooms", value: analytics?.totalRooms || 0 },
					{ label: "Week swaps", value: analytics?.swapsCompletedThisWeek || 0 },
					{ label: "Month swaps", value: analytics?.swapsCompletedThisMonth || 0 },
				].map((item) => <div key={item.label} className="surface metric-card"><p className="eyebrow">{item.label}</p><h2>{item.value}</h2></div>)}
			</div>

			<section className="surface dashboard-panel">
				<h2>Rooms by status</h2>
				{roomStatusSummary.length ? roomStatusSummary.map((item) => <div key={item._id} className="bar-row"><span>{item._id}</span><strong>{item.count}</strong></div>) : <EmptyState title="No analytics available" message="Status metrics will appear once rooms are populated." icon="▣" />}
			</section>

			<section className="surface dashboard-panel">
				<h2>Users</h2>
				<div className="table-wrap"><table className="data-table"><thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Action</th></tr></thead><tbody>{data.users.map((item) => (
					<tr key={item._id}>
						<td>{item.name}</td>
						<td>{item.email}</td>
						<td><Badge value={item.role} /></td>
						<td className="table-actions">
							{item.role !== "superadmin" ? <Button type="button" variant="secondary" size="sm" disabled={savingRoleId === item._id} onClick={() => updateRole(item, item.role === "admin" ? "user" : "admin")}>{item.role === "admin" ? "Demote to user" : "Promote to admin"}</Button> : <span className="muted">Protected</span>}
							{item.role === "admin" ? <Button type="button" variant="danger" size="sm" disabled={savingRoleId === item._id} onClick={() => removeAdmin(item)}>Remove admin</Button> : null}
						</td>
					</tr>
				))}</tbody></table></div>
			</section>

			<section className="surface dashboard-panel">
				<h2>Rooms</h2>
				<div className="table-wrap"><table className="data-table"><thead><tr><th>Owner</th><th>Block</th><th>Room</th><th>Status</th></tr></thead><tbody>{data.rooms.map((item) => <tr key={item._id}><td>{item.owner?.name || "—"}</td><td>{item.block || "—"}</td><td className="mono">{item.roomNumber}</td><td><Badge value={item.status} pulse={item.status === "pending-swap"} /></td></tr>)}</tbody></table></div>
			</section>

			<section className="surface dashboard-panel">
				<h2>Swap requests</h2>
				<div className="table-wrap"><table className="data-table"><thead><tr><th>Requester</th><th>Target</th><th>Status</th></tr></thead><tbody>{data.swaps.map((item) => <tr key={item._id}><td>{item.requester?.name || "—"}</td><td>{item.targetUser?.name || "—"}</td><td><Badge value={item.status} pulse={item.status === "pending"} /></td></tr>)}</tbody></table></div>
			</section>
		</section>
	);
}
