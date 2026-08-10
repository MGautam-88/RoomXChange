import { useMemo, useState } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import Button from "../components/common/Button.jsx";
import ProfileModal from "../components/common/ProfileModal.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { useToast } from "../context/ToastContext.jsx";
import { formatDisplayName, getUserInitials } from "../utils/nameHelpers.js";

const navLinkClass = ({ isActive }) => `nav-link ${isActive ? "nav-link-active" : ""}`;

export default function Navbar({ publicMode = false }) {
	const { isAuthenticated, user, logout } = useAuth();
	const toast = useToast();
	const navigate = useNavigate();
	const [profileOpen, setProfileOpen] = useState(false);
	const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

	const appLinks = useMemo(() => {
		const items = [
			{ to: "/", label: "Home" },
			{ to: "/preferences", label: "Preferences" },
			{ to: "/swap", label: "Swap" },
		];
		if (user?.role === "admin" || user?.role === "superadmin") {
			items.push({ to: "/rooms", label: "Browse rooms" });
			items.push({ to: "/admin", label: "Admin" });
		}
		if (user?.role === "superadmin") items.push({ to: "/superadmin", label: "Super admin" });
		return items;
	}, [user?.role]);

	const handleLogout = () => {
		setProfileOpen(false);
		setMobileMenuOpen(false);
		logout();
		toast("You are signed out.", "info");
		navigate("/login");
	};

	const userInitials = getUserInitials(user?.name);
	const displayName = formatDisplayName(user?.name);

	return (
		<>
			<header className="navbar surface">
				<div className="navbar-left">
					<button
						type="button"
						className="mobile-hamburger-btn"
						onClick={() => setMobileMenuOpen(true)}
						aria-label="Open navigation menu"
					>
						<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
							<path d="M4 6h16M4 12h16M4 18h16" />
						</svg>
					</button>

					<Link to="/" className="brand">
						<span className="brand-mark">RX</span>
						<span className="brand-text">RoomXChange</span>
					</Link>
				</div>

				<nav className="nav-links">
					{isAuthenticated ? (
						appLinks.map((item) => (
							<NavLink key={item.to} to={item.to} className={navLinkClass}>
								{item.label}
							</NavLink>
						))
					) : (
						<NavLink to="/" className={navLinkClass}>Home</NavLink>
					)}
				</nav>

				<div className="navbar-actions">
					{isAuthenticated ? (
						<button
							type="button"
							className="profile-pill-button"
							onClick={() => setProfileOpen(true)}
							aria-label="User Profile"
						>
							<span className="profile-avatar-sm">{userInitials}</span>
							<span className="profile-name-text" title={user?.name || "User"}>{displayName}</span>
						</button>
					) : (
						<>
							<Button as={Link} to="/login" variant="ghost">Login</Button>
							<Button as={Link} to="/register">Sign up</Button>
						</>
					)}
				</div>
			</header>

			{/* MOBILE DRAWER NAVIGATION MENU */}
			{mobileMenuOpen && (
				<div className="mobile-drawer-backdrop" onClick={() => setMobileMenuOpen(false)}>
					<aside className="mobile-drawer-panel surface" onClick={(e) => e.stopPropagation()}>
						<div className="mobile-drawer-header">
							<div className="brand">
								<span className="brand-mark">RX</span>
								<span className="brand-text">RoomXChange</span>
							</div>
							<button
								type="button"
								className="icon-button"
								onClick={() => setMobileMenuOpen(false)}
								aria-label="Close menu"
								style={{ fontSize: "1.1rem", padding: "6px" }}
							>
								✕
							</button>
						</div>

						{isAuthenticated && user && (
							<div className="mobile-drawer-user">
								<div className="profile-avatar-sm" style={{ width: 40, height: 40, fontSize: "1rem", flexShrink: 0 }}>
									{userInitials}
								</div>
								<div style={{ overflow: "hidden" }}>
									<div style={{ fontWeight: 700, fontSize: "0.95rem", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
										{displayName}
									</div>
									<div className="muted mono" style={{ fontSize: "0.78rem", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
										{user.email}
									</div>
								</div>
							</div>
						)}

						<nav className="mobile-drawer-links">
							{isAuthenticated ? (
								appLinks.map((item) => (
									<NavLink
										key={item.to}
										to={item.to}
										className={navLinkClass}
										onClick={() => setMobileMenuOpen(false)}
									>
										{item.label}
									</NavLink>
								))
							) : (
								<NavLink to="/" className={navLinkClass} onClick={() => setMobileMenuOpen(false)}>
									Home
								</NavLink>
							)}
						</nav>

						<div className="mobile-drawer-footer">
							{isAuthenticated ? (
								<Button
									type="button"
									variant="danger"
									style={{ width: "100%", justifyContent: "center" }}
									onClick={handleLogout}
								>
									Sign Out
								</Button>
							) : (
								<div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", width: "100%" }}>
									<Button as={Link} to="/login" variant="ghost" onClick={() => setMobileMenuOpen(false)}>
										Login
									</Button>
									<Button as={Link} to="/register" onClick={() => setMobileMenuOpen(false)}>
										Sign up
									</Button>
								</div>
							)}
						</div>
					</aside>
				</div>
			)}

			{profileOpen && isAuthenticated ? (
				<ProfileModal
					user={user}
					onClose={() => setProfileOpen(false)}
					onLogout={handleLogout}
				/>
			) : null}
		</>
	);
}
