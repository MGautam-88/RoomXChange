import { Outlet } from "react-router-dom";
import Navbar from "./Navbar.jsx";
import Footer from "./Footer.jsx";

export default function PublicLayout() {
	return (
		<div className="app-frame">
			<Navbar publicMode />
			<main className="app-main">
				<Outlet />
			</main>
			<Footer />
		</div>
	);
}