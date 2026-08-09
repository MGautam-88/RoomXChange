import { useEffect, useMemo, useState } from "react";
import api from "../../api/axios.js";
import Badge from "../../components/common/Badge.jsx";
import EmptyState from "../../components/common/EmptyState.jsx";
import Skeleton from "../../components/common/Skeleton.jsx";
import { useAuth } from "../../context/AuthContext.jsx";
import { useToast } from "../../context/ToastContext.jsx";

const barWidth = (value, total) => `${total ? Math.max((value / total) * 100, 6) : 6}%`;

export default function AdminDashboard() {
	const { user } = useAuth();
	const showToast = useToast();
	const [data, setData] = useState({ users: [], rooms: [], swaps: [], analytics: null });
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		let mounted = true;
		(async () => {
			try {
				const [usersResponse, roomsResponse, swapsResponse, analyticsResponse] = await Promise.all([api.get("/admin/users"), api.get("/admin/rooms"), api.get("/admin/swaps"), api.get("/admin/analytics")]);
				if (mounted) setData({ users: usersResponse.data.users || [], rooms: roomsResponse.data.rooms || [], swaps: swapsResponse.data.swaps || [], analytics: analyticsResponse.data });
			} catch (error) {
				showToast(error.response?.data?.message || "Unable to load admin data.", "error");
			} finally {
				if (mounted) setLoading(false);
			}
		})();
		return () => { mounted = false; };
	}, [showToast]);

	const analytics = data.analytics;
	const statusTotals = useMemo(() => ({ total: analytics?.roomsByStatus?.reduce((sum, item) => sum + item.count, 0) || 0 }), [analytics]);

	if (loading) return <Skeleton lines={8} />;

	return (
		<section className="page-shell">
			<div className="page-head">
				<div>
					<p className="eyebrow">Admin dashboard</p>
					<h1>Operational overview</h1>
					<p className="muted">Read-only admin visibility for users, rooms, and swap activity.</p>
				</div>
				<Badge value={user?.role || "admin"} />
			</div>

			<div className="metric-grid">
				{[
					{ label: "Users", value: analytics?.totalUsers || 0 },
					{ label: "Rooms", value: analytics?.totalRooms || 0 },
					{ label: "Swaps week", value: analytics?.swapsCompletedThisWeek || 0 },
					{ label: "Swaps month", value: analytics?.swapsCompletedThisMonth || 0 },
				].map((item) => <div key={item.label} className="surface metric-card"><p className="eyebrow">{item.label}</p><h2>{item.value}</h2></div>)}
			</div>

			<div className="dashboard-stack">
				<section className="surface dashboard-panel">
					<h2>Room status</h2>
					{analytics?.roomsByStatus?.length ? analytics.roomsByStatus.map((item) => <div key={item._id} className="bar-row"><span>{item._id}</span><div className="bar-track"><div className="bar-fill" style={{ width: barWidth(item.count, statusTotals.total) }} /></div><strong>{item.count}</strong></div>) : <EmptyState title="No analytics yet" message="Status data will appear after rooms are created." icon="▣" />}
				</section>
				<section className="surface dashboard-panel">
					<h2>Most active blocks</h2>
					{analytics?.mostActiveBlocks?.length ? analytics.mostActiveBlocks.map((item) => <div key={item._id} className="bar-row"><span>{item._id || "Unassigned"}</span><div className="bar-track"><div className="bar-fill" style={{ width: barWidth(item.count, analytics.mostActiveBlocks[0]?.count || 1) }} /></div><strong>{item.count}</strong></div>) : <EmptyState title="No block data" message="Block activity will appear after room creation." icon="▤" />}
				</section>
			</div>

			<div className="dashboard-stack">
				<section className="surface dashboard-panel">
					<h2>Users</h2>
					<div className="table-wrap"><table className="data-table"><thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Verified</th></tr></thead><tbody>{data.users.map((item) => <tr key={item._id}><td>{item.name}</td><td>{item.email}</td><td><Badge value={item.role} /></td><td>{item.isVerified ? "Yes" : "No"}</td></tr>)}</tbody></table></div>
				</section>
				<section className="surface dashboard-panel">
					<h2>Swap requests</h2>
					<div className="table-wrap"><table className="data-table"><thead><tr><th>Requester</th><th>Target</th><th>Status</th></tr></thead><tbody>{data.swaps.map((item) => <tr key={item._id}><td>{item.requester?.name || "—"}</td><td>{item.targetUser?.name || "—"}</td><td><Badge value={item.status} pulse={item.status === "pending"} /></td></tr>)}</tbody></table></div>
				</section>
			</div>
		</section>
	);
}
