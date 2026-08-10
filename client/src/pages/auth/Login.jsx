import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Button from "../../components/common/Button.jsx";
import Input from "../../components/common/Input.jsx";
import { useAuth } from "../../context/AuthContext.jsx";
import { useToast } from "../../context/ToastContext.jsx";
import { formatDisplayName } from "../../utils/nameHelpers.js";

export default function Login() {
	const { login } = useAuth();
	const showToast = useToast();
	const navigate = useNavigate();
	const [form, setForm] = useState({ rollNumber: "", password: "" });
	const [loading, setLoading] = useState(false);
	const [unverifiedRoll, setUnverifiedRoll] = useState(null);

	const handleSubmit = async (event) => {
		event.preventDefault();
		setLoading(true);
		setUnverifiedRoll(null);
		try {
			const response = await login(form);
			const displayName = formatDisplayName(response?.user?.name);
			showToast(response?.message || `Welcome back, ${displayName}!`, "success");
			navigate("/");
		} catch (error) {
			const msg = error.response?.data?.message || "Unable to sign in.";
			showToast(msg, "error");
			if (error.response?.status === 403 || msg.toLowerCase().includes("verify")) {
				setUnverifiedRoll(form.rollNumber);
			}
		} finally {
			setLoading(false);
		}
	};

	return (
		<section className="auth-page">
			<form className="auth-card surface" onSubmit={handleSubmit}>
				<p className="eyebrow">Welcome back</p>
				<h1>Login</h1>
				<p className="muted">Use your college roll number and password.</p>
				<Input
					label="Roll Number"
					type="text"
					value={form.rollNumber}
					onChange={(event) => setForm((current) => ({ ...current, rollNumber: event.target.value.toLowerCase().trim() }))}
					placeholder="23bcs001"
					required
				/>
				<Input
					label="Password"
					type="password"
					value={form.password}
					onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))}
					required
				/>
				<div className="stack gap-12">
					<Button type="submit" disabled={loading}>{loading ? "Signing in" : "Login"}</Button>
					{unverifiedRoll && (
						<Button
							type="button"
							variant="secondary"
							onClick={() => navigate("/verify-otp", { state: { rollNumber: unverifiedRoll } })}
						>
							Verify OTP for {unverifiedRoll}
						</Button>
					)}
					<Button as={Link} to="/forgot-password" variant="ghost">Forgot password</Button>
					<p className="muted">No account yet? <Link to="/register">Create one</Link></p>
				</div>
			</form>
		</section>
	);
}
