import { NavLink } from "react-router-dom";
import Badge from "../components/common/Badge.jsx";
import { useAuth } from "../context/AuthContext.jsx";

const navLinkClass = ({ isActive }) => `sidebar-link ${isActive ? "sidebar-link-active" : ""}`;

export default function Sidebar() {
	const { user } = useAuth();
	const isAdmin = user?.role === "admin" || user?.role === "superadmin";
	return (
		<aside className="sidebar surface">
			<div>
				<p className="eyebrow">Dashboard</p>
				<h2>{user?.name || "RoomXChange"}</h2>
				<Badge value={user?.role || "user"} />
			</div>
			<nav className="sidebar-nav">
				<NavLink to="/preferences" className={navLinkClass}>Preferences</NavLink>
				<NavLink to="/swap" className={navLinkClass}>Swap</NavLink>
				{isAdmin ? <NavLink to="/rooms" className={navLinkClass}>Browse rooms</NavLink> : null}
				{isAdmin ? <NavLink to="/admin" className={navLinkClass}>Admin console</NavLink> : null}
				{user?.role === "superadmin" ? <NavLink to="/superadmin" className={navLinkClass}>Super admin</NavLink> : null}
			</nav>
		</aside>
	);
}
