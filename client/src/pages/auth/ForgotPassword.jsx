import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Button from "../../components/common/Button.jsx";
import Input from "../../components/common/Input.jsx";
import { useAuth } from "../../context/AuthContext.jsx";
import { useToast } from "../../context/ToastContext.jsx";

export default function ForgotPassword() {
	const { forgotPassword } = useAuth();
	const showToast = useToast();
	const navigate = useNavigate();
	const [form, setForm] = useState({ rollNumber: "" });
	const [loading, setLoading] = useState(false);

	const handleSubmit = async (event) => {
		event.preventDefault();
		setLoading(true);
		try {
			const response = await forgotPassword(form);
			showToast(response.message, "success");
			navigate("/reset-password", { state: { rollNumber: form.rollNumber } });
		} catch (error) {
			showToast(error.response?.data?.message || "Unable to request password reset.", "error");
		} finally {
			setLoading(false);
		}
	};

	return (
		<section className="auth-page">
			<form className="auth-card surface" onSubmit={handleSubmit}>
				<p className="eyebrow">Reset access</p>
				<h1>Request a reset code</h1>
				<p className="muted">We send a one-time code to your college email.</p>
				<Input
					label="Roll Number"
					type="text"
					value={form.rollNumber}
					onChange={(event) => setForm({ rollNumber: event.target.value })}
					placeholder="23bcs001"
					required
				/>
				<div className="stack gap-12">
					<Button type="submit" disabled={loading}>{loading ? "Sending code" : "Send reset code"}</Button>
					<Button as={Link} to="/login" variant="ghost">Back to login</Button>
				</div>
			</form>
		</section>
	);
}