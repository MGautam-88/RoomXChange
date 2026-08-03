import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import Button from "../../components/common/Button.jsx";
import Input from "../../components/common/Input.jsx";
import { useAuth } from "../../context/AuthContext.jsx";
import { useToast } from "../../context/ToastContext.jsx";

export default function ResetPassword() {
	const { resetPassword } = useAuth();
	const showToast = useToast();
	const navigate = useNavigate();
	const location = useLocation();
	const [form, setForm] = useState({ rollNumber: location.state?.rollNumber || location.state?.email || "", otp: "", newPassword: "" });
	const [loading, setLoading] = useState(false);

	const handleSubmit = async (event) => {
		event.preventDefault();
		setLoading(true);
		try {
			const response = await resetPassword(form);
			showToast(response.message, "success");
			navigate("/login");
		} catch (error) {
			showToast(error.response?.data?.message || "Unable to reset password.", "error");
		} finally {
			setLoading(false);
		}
	};

	return (
		<section className="auth-page">
			<form className="auth-card surface" onSubmit={handleSubmit}>
				<p className="eyebrow">Reset password</p>
				<h1>Use your OTP code to set a new password</h1>
				<Input
					label="Roll Number"
					type="text"
					value={form.rollNumber}
					onChange={(event) => setForm((current) => ({ ...current, rollNumber: event.target.value }))}
					placeholder="23bcs001"
					required
				/>
				<Input
					label="OTP"
					inputMode="numeric"
					value={form.otp}
					onChange={(event) => setForm((current) => ({ ...current, otp: event.target.value }))}
					required
				/>
				<Input
					label="New password"
					type="password"
					value={form.newPassword}
					onChange={(event) => setForm((current) => ({ ...current, newPassword: event.target.value }))}
					required
				/>
				<div className="stack gap-12">
					<Button type="submit" disabled={loading}>{loading ? "Updating password" : "Reset password"}</Button>
					<Button as={Link} to="/login" variant="ghost">Back to login</Button>
				</div>
			</form>
		</section>
	);
}