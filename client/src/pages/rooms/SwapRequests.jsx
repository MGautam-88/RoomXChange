import { useCallback, useEffect, useMemo, useState } from "react";
import api from "../../api/axios.js";
import Badge from "../../components/common/Badge.jsx";
import Button from "../../components/common/Button.jsx";
import EmptyState from "../../components/common/EmptyState.jsx";
import Skeleton from "../../components/common/Skeleton.jsx";
import SwapRequestCard from "../../components/common/SwapRequestCard.jsx";
import SwapCycleDiagram from "../../components/common/SwapCycleDiagram.jsx";
import { useConfirm } from "../../context/ConfirmContext.jsx";
import { useToast } from "../../context/ToastContext.jsx";

export default function SwapRequests() {
	const confirm = useConfirm();
	const showToast = useToast();
	const [incoming, setIncoming] = useState([]);
	const [outgoing, setOutgoing] = useState([]);
	const [cycles, setCycles] = useState([]);
	const [loading, setLoading] = useState(true);
	const [submitting, setSubmitting] = useState(false);

	const loadData = useCallback(async () => {
		try {
			const [requestsResponse, cyclesResponse] = await Promise.all([api.get("/swaps/mine"), api.get("/swaps/cycles")]);
			setIncoming(requestsResponse.data.incoming || []);
			setOutgoing(requestsResponse.data.outgoing || []);
			setCycles(cyclesResponse.data.cycles || []);
		} catch (error) {
			showToast(error.response?.data?.message || "Unable to load swap requests.", "error");
		} finally {
			setLoading(false);
		}
	}, [showToast]);

	useEffect(() => {
		// Intentional mount fetch for swap state.
		// eslint-disable-next-line react-hooks/set-state-in-effect
		loadData();
	}, [loadData]);

	const totalRequests = useMemo(() => incoming.length + outgoing.length, [incoming, outgoing]);

	const actionWrapper = async (options, handler) => {
		const ok = await confirm(options);
		if (!ok) return;
		setSubmitting(true);
		try {
			await handler();
			await loadData();
		} catch (error) {
			showToast(error.response?.data?.message || "Unable to complete this action.", "error");
		} finally {
			setSubmitting(false);
		}
	};

	const acceptRequest = (request) => actionWrapper({ title: "Accept swap request", message: "Accept this swap request and complete the room exchange?", confirmLabel: "Accept request" }, async () => { const response = await api.patch(`/swaps/${request._id}/accept`); showToast(response.data.message, "success"); });
	const rejectRequest = (request) => actionWrapper({ title: "Reject swap request", message: "Reject this swap request?", confirmLabel: "Reject request", danger: true }, async () => { const response = await api.patch(`/swaps/${request._id}/reject`); showToast(response.data.message, "success"); });
	const cancelRequest = (request) => actionWrapper({ title: "Cancel swap request", message: "Cancel your pending swap request?", confirmLabel: "Cancel request", danger: true }, async () => { const response = await api.patch(`/swaps/${request._id}/cancel`); showToast(response.data.message, "success"); });
	const executeCycle = (cycle) => actionWrapper({ title: "Execute swap cycle", message: "Execute this swap cycle for all listed requests?", confirmLabel: "Execute cycle", danger: true }, async () => { const response = await api.post("/swaps/cycles/execute", { requestIds: cycle.requestIds }); showToast(response.data.message, "success"); });

	return (
		<section className="page-shell">
			<div className="page-head">
				<div>
					<p className="eyebrow">Swap requests</p>
					<h1>Track incoming and outgoing requests</h1>
					<p className="muted">Confirm, reject, or cancel with explicit confirmation before the state changes.</p>
				</div>
				<Badge value="pending" pulse>{totalRequests} total</Badge>
			</div>

			<div className="surface cycle-banner">
				<div>
					<p className="eyebrow">Cycle detector</p>
					<h2>{cycles.length ? "Swap cycles ready for review" : "No swap cycle is currently ready"}</h2>
				</div>
				<SwapCycleDiagram compact />
			</div>

			{loading ? <Skeleton lines={6} /> : (
				<>
					<section className="section">
						<h2>Incoming requests</h2>
						{incoming.length ? <div className="card-grid">{incoming.map((request) => <SwapRequestCard key={request._id} request={request} type="incoming" onAccept={() => acceptRequest(request)} onReject={() => rejectRequest(request)} />)}</div> : <EmptyState title="No incoming requests" message="New requests will appear here when another student targets your room." icon="↺" />}
					</section>
					<section className="section">
						<h2>Outgoing requests</h2>
						{outgoing.length ? <div className="card-grid">{outgoing.map((request) => <SwapRequestCard key={request._id} request={request} type="outgoing" onCancel={() => cancelRequest(request)} />)}</div> : <EmptyState title="No outgoing requests" message="Create a request from a room detail page." icon="↗" />}
					</section>
					<section className="section">
						<h2>Suggested cycles</h2>
						{cycles.length ? <div className="stack gap-16">{cycles.map((cycle, index) => (
							<article key={cycle.requestIds.join("-")} className="surface cycle-card">
								<div className="cycle-head">
									<div>
										<p className="eyebrow mono">Cycle {index + 1}</p>
										<h3>{cycle.users.map((item) => item.name).join(" → ")}</h3>
									</div>
									<Button type="button" disabled={submitting} onClick={() => executeCycle(cycle)}>Execute cycle</Button>
								</div>
								<div className="cycle-rooms mono">{cycle.rooms.map((item) => `${item.requesterRoom.block || "Room"} / ${item.requesterRoom.roomNumber}`).join(" · ")}</div>
							</article>
						))}</div> : <EmptyState title="No cycles to review" message="When requests form a loop, this area will surface the proposal." icon="⟲" />}
					</section>
				</>
			)}
		</section>
	);
}
