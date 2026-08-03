const statusMap = {
	available: { label: "Available", tone: "ok" },
	"pending-swap": { label: "Pending swap", tone: "warn" },
	swapped: { label: "Swapped", tone: "muted" },
	pending: { label: "Pending", tone: "warn" },
	accepted: { label: "Accepted", tone: "ok" },
	rejected: { label: "Rejected", tone: "bad" },
	cancelled: { label: "Cancelled", tone: "bad" },
	completed: { label: "Completed", tone: "ok" },
	user: { label: "User", tone: "muted" },
	admin: { label: "Admin", tone: "accent" },
	superadmin: { label: "Super admin", tone: "accent" },
};

export default function Badge({ value, tone, children, pulse = false }) {
	const resolved = statusMap[value] || { label: value, tone: tone || "muted" };
	return <span className={`badge badge-${tone || resolved.tone} ${pulse ? "badge-pulse" : ""}`.trim()}>{children || resolved.label}</span>;
}