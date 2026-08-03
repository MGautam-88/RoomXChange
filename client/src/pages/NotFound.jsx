import { Link } from "react-router-dom";
import Button from "../components/common/Button.jsx";

export default function NotFound() {
	return (
		<section className="page-shell center-shell">
			<div className="surface auth-card text-center">
				<p className="eyebrow">Not found</p>
				<h1>This page does not exist</h1>
				<p className="muted">Check the URL or return to the home page.</p>
				<Button as={Link} to="/">Go home</Button>
			</div>
		</section>
	);
}