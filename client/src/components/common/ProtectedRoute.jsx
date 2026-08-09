import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext.jsx";

const roleRedirect = (role) => {
	if (role === "superadmin") return "/superadmin";
	if (role === "admin") return "/admin";
	return "/swap";
};

export default function ProtectedRoute({ roles, children }) {
	const { isAuthenticated, user, ready } = useAuth();
	const location = useLocation();
	if (!ready) return <div className="screen-shell">Loading...</div>;
	if (!isAuthenticated) return <Navigate to="/login" replace state={{ from: location }} />;
	if (roles && !roles.includes(user?.role)) return <Navigate to={roleRedirect(user?.role)} replace />;
	return children ? children : <Outlet />;
}