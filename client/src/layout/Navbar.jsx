import { useMemo, useState } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import Button from "../components/common/Button.jsx";
import ProfileModal from "../components/common/ProfileModal.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { useToast } from "../context/ToastContext.jsx";

const navLinkClass = ({ isActive }) => `nav-link ${isActive ? "nav-link-active" : ""}`;

export default function Navbar({ publicMode = false }) {
	const { isAuthenticated, user, logout } = useAuth();
	const toast = useToast();
	const navigate = useNavigate();
	const [profileOpen, setProfileOpen] = useState(false);

	const appLinks = useMemo(() => {
		const items = [
			{ to: "/", label: "Home" },
			{ to: "/preferences", label: "Preferences" },
			{ to: "/swap", label: "Swap" },
		];
		if (user?.role === "admin" || user?.role === "superadmin") {
			items.push({ to: "/dashboard", label: "Dashboard" });
			items.push({ to: "/admin", label: "Admin" });
		}
		if (user?.role === "superadmin") items.push({ to: "/superadmin", label: "Super admin" });
		return items;
	}, [user?.role]);

	const handleLogout = () => {
		setProfileOpen(false);
		logout();
		toast("You are signed out.", "info");
		navigate("/login");
	};

	const userInitials = user?.name
		? user.name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
		: "U";

	const currentRoomDisplay = (user?.currentRoom || user?.allotedRoom || "101A").slice(0, 4);

	return (
		<>
			<header className="navbar surface">
				<Link to="/" className="brand">
					<span className="brand-mark">RX</span>
					<span className="brand-text">RoomXChange</span>
				</Link>

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
							<span className="profile-name-text">{user?.name || "User"}</span>
						</button>
					) : (
						<>
							<Button as={Link} to="/login" variant="ghost">Login</Button>
							<Button as={Link} to="/register">Sign up</Button>
						</>
					)}
				</div>
			</header>

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
