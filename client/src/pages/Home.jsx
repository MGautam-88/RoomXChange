import { Link } from "react-router-dom";
import Button from "../components/common/Button.jsx";
import AnimatedCounter from "../components/common/AnimatedCounter.jsx";
import { useSocket } from "../context/SocketContext.jsx";
import { useAuth } from "../context/AuthContext.jsx";

const featureCards = [
	{
		badge: "Verified Access",
		title: "Campus Identity Validation",
		copy: "Strict domain verification ensures only authenticated college students can list rooms and initiate exchange requests.",
		icon: (
			<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
				<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
				<path d="m9 12 2 2 4-4" />
			</svg>
		),
	},
	{
		badge: "Multi-Party Matching",
		title: "Smart Swap Chains",
		copy: "Automated cycle discovery finds triangular or N-way room trades when direct 1-on-1 swaps are unavailable.",
		icon: (
			<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
				<path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" />
			</svg>
		),
	},
	{
		badge: "Direct Control",
		title: "Instant Room Listings & Requests",
		copy: "List your room in seconds, select preferred blocks or floors, and send or accept swap requests directly with batchmates.",
		icon: (
			<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
				<rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
				<line x1="9" y1="3" x2="9" y2="21" />
				<path d="M13 8h4M13 12h4M13 16h4" />
			</svg>
		),
	},
];

export default function Home() {
	const { availableCount } = useSocket();
	const { isAuthenticated, user } = useAuth();
	const dashboardPath = user?.role === "superadmin" ? "/superadmin" : user?.role === "admin" ? "/admin" : "/dashboard";

	const currentRoomDisplay = (user?.currentRoom || user?.allotedRoom || "A101").slice(0, 4).toUpperCase();

	return (
		<div className="home-page">
			{/* Top Hero Grid */}
			<section className="hero-grid section" data-reveal>
				<div className="hero-copy">
					<p className="eyebrow">College room swapping, without the noise</p>
					<h1>Manage room swaps with a clear, live system of record.</h1>
					<p className="lead">
						RoomXChange helps students list rooms, request swaps, and complete multi-party cycles with live availability and direct confirmations.
					</p>

					<div className="hero-actions">
						{isAuthenticated ? (
							<>
								<Button as={Link} to="/swap">Go to Swap</Button>
								<Button as={Link} to="/preferences" variant="secondary">Preferences</Button>
								{user?.role === "admin" || user?.role === "superadmin" ? (
									<Button as={Link} to={user?.role === "superadmin" ? "/superadmin" : "/admin"} variant="ghost">Admin Console</Button>
								) : null}
							</>
						) : (
							<>
								<Button as={Link} to="/register">Create account</Button>
								<Button as={Link} to="/login" variant="secondary">Login</Button>
							</>
						)}
					</div>

					<div className="hero-metrics-strip">
						<div className="hero-metric-pill surface">
							<span className="live-dot" />
							<span className="metric-num"><AnimatedCounter value={availableCount} /></span>
							<span className="muted">rooms available right now</span>
						</div>
					</div>
				</div>

				{/* Middle Rightmost Space: Render Current Room ONLY when logged in */}
				{isAuthenticated && (user?.currentRoom || user?.allotedRoom) ? (
					<div className="hero-room-container">
						<span className="hero-room-label">Current Room</span>
						<span className="hero-room-number mono">{(user?.currentRoom || user?.allotedRoom).slice(0, 4).toUpperCase()}</span>
					</div>
				) : null}
			</section>

			{/* 3 High-Value Curated Feature Cards */}
			<section className="section feature-section" data-reveal>
				<div className="section-head">
					<p className="eyebrow">Operational System</p>
					<h2>Engineered specifically for dorm exchanges</h2>
				</div>

				<div className="feature-grid">
					{featureCards.map((item) => (
						<article key={item.title} className="surface feature-card hover-lift">
							<div className="feature-card-header">
								<div className="feature-icon">{item.icon}</div>
								<span className="badge badge-accent">{item.badge}</span>
							</div>
							<h3>{item.title}</h3>
							<p className="muted">{item.copy}</p>
						</article>
					))}
				</div>
			</section>
		</div>
	);
}