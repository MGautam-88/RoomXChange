import { Outlet } from "react-router-dom";
import Navbar from "./Navbar.jsx";
import Footer from "./Footer.jsx";

export default function DashboardLayout() {
	return (
		<div className="app-frame">
			<Navbar />
			<main className="app-main app-main-wide">
				<Outlet />
			</main>
			<Footer />
		</div>
	);
}