import { useEffect, useState } from "react";
import api from "../../api/axios.js";
import Badge from "../../components/common/Badge.jsx";
import Button from "../../components/common/Button.jsx";
import EmptyState from "../../components/common/EmptyState.jsx";
import Skeleton from "../../components/common/Skeleton.jsx";
import { useAuth } from "../../context/AuthContext.jsx";
import { useToast } from "../../context/ToastContext.jsx";

export default function Swap() {
	const { user } = useAuth();
	const showToast = useToast();
	const [suggestions, setSuggestions] = useState([]);
	const [loading, setLoading] = useState(true);
	const [selectedSwap, setSelectedSwap] = useState(null);
	const [submitting, setSubmitting] = useState(false);

	const loadSuggestions = async () => {
		try {
			const { data } = await api.get("/swaps/suggestions");
			setSuggestions(data.suggestions || []);
		} catch (error) {
			showToast(error.response?.data?.message || "Unable to load swap suggestions.", "error");
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => {
		loadSuggestions();
	}, []);

	const handleExecuteSwap = async (swap) => {
		setSubmitting(true);
		try {
			if (swap.requestIds && swap.requestIds.length >= 2) {
				const response = await api.post("/swaps/cycles/execute", { requestIds: swap.requestIds });
				showToast(response.data.message, "success");
			} else {
				showToast("Swap request sent to partner user successfully!", "success");
			}
			setSelectedSwap(null);
			await loadSuggestions();
		} catch (error) {
			showToast(error.response?.data?.message || "Unable to execute swap.", "error");
		} finally {
			setSubmitting(false);
		}
	};

	return (
		<section className="page-shell">
			<div className="page-head">
				<div>
					<p className="eyebrow">Room Exchanges</p>
					<h1>Swap</h1>
					<p className="muted">Discover and confirm multi-party room swaps matched for you.</p>
				</div>
				<Badge value={user?.role || "user"} />
			</div>

			{/* Subtle Recommendation Note */}
			<p className="muted" style={{ fontSize: "0.92rem", margin: "-8px 0 20px" }}>
				<strong style={{ color: "var(--text-1)" }}>Note:</strong> Swaps are arranged by participant count. Try to choose swaps at the top involving the highest number of users, as it helps everyone resolve their room trades simultaneously!
			</p>

			{loading ? (
				<Skeleton lines={5} />
			) : suggestions.length ? (
				/* Vertical full-width cards stack */
				<div style={{ display: "flex", flexDirection: "column", gap: "16px", width: "100%" }}>
					{suggestions.map((item, index) => {
						const isTopItem = index === 0;
						return (
							<article
								key={item.id}
								className={`surface room-card hover-lift swap-card-clickable ${isTopItem ? "top-recommended-card" : ""}`}
								onClick={() => setSelectedSwap(item)}
								style={{
									cursor: "pointer",
									width: "100%",
									display: "flex",
									alignItems: "center",
									justifyContent: "space-between",
									gap: "24px",
									padding: "20px 28px",
									flexWrap: "wrap",
								}}
							>
								<div style={{ display: "flex", alignItems: "center", gap: "24px", minWidth: "220px" }}>
									<div>
										<p className="eyebrow">Room You Receive</p>
										<h2 className="mono accent" style={{ fontSize: "2.4rem", margin: 0, lineHeight: 1 }}>
											{item.roomToReceive}
										</h2>
									</div>
								</div>

								<div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
									<Badge value={`${item.usersCount} Users Involved`} tone={isTopItem ? "accent" : "muted"} />
									<span className="muted" style={{ fontSize: "0.92rem" }}>
										{item.usersCount}-Way Swap Cycle
									</span>
									{isTopItem ? <span className="badge badge-ok">Top Pick</span> : null}
								</div>

								<div style={{ display: "flex", alignItems: "center", gap: "16px", marginLeft: "auto" }}>
									<small className="muted" style={{ display: "none", media: "(min-width: 640px)" }}>
										Click to view mapping &rarr;
									</small>
									<Button type="button" variant="ghost" size="sm">
										View Mapping
									</Button>
								</div>
							</article>
						);
					})}
				</div>
			) : (
				<EmptyState
					title="Currently, no rooms are available matching your choices."
					message="We'll notify you via email as soon as a suitable room is found."
					icon="⇄"
				/>
			)}

			{/* Swap Mapping Modal */}
			{selectedSwap ? (
				<div className="modal-backdrop" onClick={() => setSelectedSwap(null)}>
					<div className="modal-card profile-modal-card" style={{ width: "min(560px, 100%)" }} onClick={(e) => e.stopPropagation()}>
						<div className="modal-header">
							<div>
								<p className="eyebrow">{selectedSwap.usersCount}-User Swap Chain</p>
								<h2 className="profile-name">Complete Swap Mapping</h2>
							</div>
							<button type="button" className="icon-button" onClick={() => setSelectedSwap(null)} aria-label="Close">
								✕
							</button>
						</div>

						<div className="modal-body profile-modal-body">
							<p className="muted" style={{ marginBottom: "14px" }}>
								Below is the full mapping of all participating users and their room transfers after this swap:
							</p>

							<div className="table-wrap surface">
								<table className="data-table">
									<thead>
										<tr>
											<th>User</th>
											<th>Current Room</th>
											<th>New Room</th>
										</tr>
									</thead>
									<tbody>
										{selectedSwap.mappings.map((m) => (
											<tr key={m.user.id}>
												<td>
													<strong>{m.user.name}</strong>
													{m.user.id === user?.id ? <span className="badge badge-accent" style={{ marginLeft: "8px", fontSize: "0.75rem" }}>You</span> : null}
												</td>
												<td className="mono">{m.currentRoom}</td>
												<td className="mono accent"><strong>{m.newRoom}</strong></td>
											</tr>
										))}
									</tbody>
								</table>
							</div>
						</div>

						<div className="modal-footer profile-modal-footer">
							<Button type="button" onClick={() => handleExecuteSwap(selectedSwap)} disabled={submitting} style={{ width: "100%" }}>
								{submitting ? "Processing Swap..." : "Confirm & Execute Swap"}
							</Button>
						</div>
					</div>
				</div>
			) : null}
		</section>
	);
}
