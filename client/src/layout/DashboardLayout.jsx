import { Outlet } from "react-router-dom";
import Navbar from "./Navbar.jsx";
import Sidebar from "./Sidebar.jsx";
import Footer from "./Footer.jsx";

export default function DashboardLayout() {
	return (
		<div className="app-frame">
			<Navbar />
			<div className="dashboard-layout">
				<Sidebar />
				<main className="app-main dashboard-main">
					<Outlet />
				</main>
			</div>
			<Footer />
		</div>
	);
}