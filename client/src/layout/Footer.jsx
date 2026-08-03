import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";

export default function Footer() {
	const { isAuthenticated } = useAuth();

	return (
		<footer className="app-footer">
			<div className="footer-container">
				<div className="footer-watermark" aria-hidden="true">
					RoomXChange
				</div>

				<div className="footer-bottom">
					<div className="footer-copyright">
						© {new Date().getFullYear()} RoomXChange, Inc. All rights reserved.
					</div>

					<div className="footer-rx-badge">
						<span className="badge-bracket">&#123;</span>
						<span className="badge-code">RX</span>
						<span className="badge-bracket">&#125;</span>
					</div>

					<div className="footer-links">
						<Link to="/">Home</Link>
						{isAuthenticated ? (
							<>
								<Link to="/preferences">Preferences</Link>
								<Link to="/swap">Swap</Link>
							</>
						) : (
							<>
								<Link to="/register">Register</Link>
								<Link to="/login">Login</Link>
							</>
						)}
						<a href="#privacy">Privacy</a>
						<a href="#terms">Terms</a>
					</div>
				</div>
			</div>
		</footer>
	);
}
