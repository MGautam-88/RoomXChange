import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import Button from "../../components/common/Button.jsx";
import Input from "../../components/common/Input.jsx";
import { useAuth } from "../../context/AuthContext.jsx";
import { useToast } from "../../context/ToastContext.jsx";

export default function VerifyOtp() {
	const { verifyOtp, resendOtp } = useAuth();
	const showToast = useToast();
	const navigate = useNavigate();
	const location = useLocation();
	const [form, setForm] = useState({ rollNumber: location.state?.rollNumber || location.state?.email || "", otp: "" });
	const [loading, setLoading] = useState(false);

	const handleVerify = async (event) => {
		event.preventDefault();
		setLoading(true);
		try {
			const response = await verifyOtp(form);
			showToast(response.message, "success");
			navigate("/");
		} catch (error) {
			showToast(error.response?.data?.message || "Unable to verify the code.", "error");
		} finally {
			setLoading(false);
		}
	};

	const handleResend = async () => {
		try {
			const response = await resendOtp({ rollNumber: form.rollNumber, purpose: "signup" });
			showToast(response.message, "success");
		} catch (error) {
			showToast(error.response?.data?.message || "Unable to resend the code.", "error");
		}
	};

	return (
		<section className="auth-page">
			<form className="auth-card surface" onSubmit={handleVerify}>
				<p className="eyebrow">Verify account</p>
				<h1>Enter your OTP</h1>
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
				<div className="stack gap-12">
					<Button type="submit" disabled={loading}>{loading ? "Verifying" : "Verify OTP"}</Button>
					<Button type="button" variant="ghost" onClick={handleResend}>Resend code</Button>
					<p className="muted"><Link to="/login">Back to login</Link></p>
				</div>
			</form>
		</section>
	);
}
