import { Route, Routes, useLocation } from "react-router-dom";
import Home from "./pages/Home.jsx";
import Login from "./pages/auth/Login.jsx";
import Register from "./pages/auth/Register.jsx";
import ForgotPassword from "./pages/auth/ForgotPassword.jsx";
import BrowseRooms from "./pages/rooms/BrowseRooms.jsx";
import Preferences from "./pages/rooms/Preferences.jsx";
import RoomDetail from "./pages/rooms/RoomDetail.jsx";
import Swap from "./pages/rooms/Swap.jsx";
import UserDashboard from "./pages/dashboard/UserDashboard.jsx";
import AdminDashboard from "./pages/dashboard/AdminDashboard.jsx";
import SuperAdminDashboard from "./pages/dashboard/SuperAdminDashboard.jsx";
import ProtectedRoute from "./components/common/ProtectedRoute.jsx";
import PublicLayout from "./layout/PublicLayout.jsx";
import MainLayout from "./layout/MainLayout.jsx";
import DashboardLayout from "./layout/DashboardLayout.jsx";
import NotFound from "./pages/NotFound.jsx";

const AnimatedPage = ({ children }) => {
	const location = useLocation();
	return (
		<div key={location.pathname} className="page-enter">
			{children}
		</div>
	);
};

export default function AppRouter() {
	return (
		<Routes>
			<Route element={<PublicLayout />}>
				<Route index element={<AnimatedPage><Home /></AnimatedPage>} />
				<Route path="/login" element={<AnimatedPage><Login /></AnimatedPage>} />
				<Route path="/register" element={<AnimatedPage><Register /></AnimatedPage>} />
				<Route path="/forgot-password" element={<AnimatedPage><ForgotPassword /></AnimatedPage>} />
			</Route>

			<Route element={<ProtectedRoute />}>
				<Route element={<MainLayout />}>
					<Route path="/rooms" element={<ProtectedRoute roles={["admin", "superadmin"]}><AnimatedPage><BrowseRooms /></AnimatedPage></ProtectedRoute>} />
					<Route path="/rooms/:roomId" element={<ProtectedRoute roles={["admin", "superadmin"]}><AnimatedPage><RoomDetail /></AnimatedPage></ProtectedRoute>} />
					<Route path="/preferences" element={<AnimatedPage><Preferences /></AnimatedPage>} />
					<Route path="/swap" element={<AnimatedPage><Swap /></AnimatedPage>} />
				</Route>

				<Route element={<DashboardLayout />}>
					<Route path="/dashboard" element={<ProtectedRoute roles={["admin", "superadmin"]}><AnimatedPage><UserDashboard /></AnimatedPage></ProtectedRoute>} />
					<Route path="/admin" element={<ProtectedRoute roles={["admin", "superadmin"]}><AnimatedPage><AdminDashboard /></AnimatedPage></ProtectedRoute>} />
					<Route path="/superadmin" element={<ProtectedRoute roles={["superadmin"]}><AnimatedPage><SuperAdminDashboard /></AnimatedPage></ProtectedRoute>} />
				</Route>
			</Route>
			<Route path="*" element={<NotFound />} />
		</Routes>
	);
}
