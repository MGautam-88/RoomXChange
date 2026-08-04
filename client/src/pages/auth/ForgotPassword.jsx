import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../../api/axios.js";
import Button from "../../components/common/Button.jsx";
import Input from "../../components/common/Input.jsx";
import { useToast } from "../../context/ToastContext.jsx";

export default function ForgotPassword() {
	const showToast = useToast();
	const navigate = useNavigate();

	const [rollNumber, setRollNumber] = useState("");
	const [otp, setOtp] = useState("");
	const [newPassword, setNewPassword] = useState("");
	const [otpToken, setOtpToken] = useState("");
	const [otpSent, setOtpSent] = useState(false);
	const [resendCount, setResendCount] = useState(0);
	const [cooldown, setCooldown] = useState(0);
	const [loading, setLoading] = useState(false);
	const [submitting, setSubmitting] = useState(false);

	useEffect(() => {
		let timer;
		if (cooldown > 0) {
			timer = setInterval(() => {
				setCooldown((prev) => prev - 1);
			}, 1000);
		}
		return () => clearInterval(timer);
	}, [cooldown]);

	const handleSendOtp = async (event) => {
		event.preventDefault();
		if (!rollNumber) return;

		setLoading(true);
		try {
			const { data } = await api.post("/auth/send-reset-otp", { rollNumber });
			setOtpToken(data.otpToken);
			setResendCount(0);
			setCooldown(60);
			setOtpSent(true);
			showToast(data.message, "success");
		} catch (error) {
			showToast(error.response?.data?.message || "Unable to send reset OTP.", "error");
		} finally {
			setLoading(false);
		}
	};

	const handleResendOtp = async () => {
		if (cooldown > 0 || resendCount >= 3) return;
		setLoading(true);
		try {
			const { data } = await api.post("/auth/resend-reset-otp", { otpToken });
			setOtpToken(data.otpToken);
			setResendCount(data.resendCount);
			setCooldown(60);
			showToast(data.message, "success");
		} catch (error) {
			showToast(error.response?.data?.message || "Unable to resend OTP.", "error");
		} finally {
			setLoading(false);
		}
	};

	const handleResetPasswordSubmit = async (event) => {
		event.preventDefault();
		if (!otp || otp.length !== 4) {
			showToast("Please enter the 4-digit OTP code.", "error");
			return;
		}

		if (!newPassword || newPassword.length < 6) {
			showToast("New password must be at least 6 characters.", "error");
			return;
		}

		setSubmitting(true);
		try {
			const { data } = await api.post("/auth/reset-password-with-otp", {
				rollNumber,
				otpToken,
				otp,
				newPassword,
			});
			showToast(data.message, "success");
			navigate("/login");
		} catch (error) {
			showToast(error.response?.data?.message || "Failed to reset password.", "error");
		} finally {
			setSubmitting(false);
		}
	};

	const handleEditRoll = () => {
		setOtpSent(false);
		setOtp("");
		setNewPassword("");
		setOtpToken("");
		setResendCount(0);
		setCooldown(0);
	};

	return (
		<section className="auth-page">
			<form className="auth-card surface" onSubmit={otpSent ? handleResetPasswordSubmit : handleSendOtp}>
				<p className="eyebrow">Reset access</p>
				<h1>Request reset OTP</h1>
				<p className="muted">Enter your roll number to receive a 4-digit reset OTP on your college email.</p>

				<Input
					label="Roll Number"
					type="text"
					value={rollNumber}
					onChange={(event) => setRollNumber(event.target.value.toLowerCase().trim().slice(0, 8))}
					placeholder="23bcs001"
					maxLength={8}
					disabled={otpSent}
					required
				/>

				{otpSent ? (
					<div style={{ margin: "8px 0 0", padding: "14px 16px", background: "rgba(201, 243, 29, 0.05)", border: "1px solid rgba(201, 243, 29, 0.2)", borderRadius: "8px" }}>
						<p className="muted" style={{ fontSize: "0.88rem", marginBottom: "10px" }}>
							An OTP has been sent to <strong>{rollNumber}@iiitdmj.ac.in</strong> (valid for 15 mins; please also check your spam folder).
						</p>

						<Input
							label="4-Digit OTP"
							type="text"
							inputMode="numeric"
							value={otp}
							onChange={(event) => setOtp(event.target.value.replace(/[^0-9]/g, "").slice(0, 4))}
							maxLength={4}
							required
						/>

						<Input
							label="New Password"
							type="password"
							value={newPassword}
							onChange={(event) => setNewPassword(event.target.value)}
							placeholder="At least 6 characters"
							required
						/>

						<div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: "0.88rem", marginTop: "8px" }}>
							{cooldown > 0 ? (
								<span className="muted">Resend OTP in {cooldown}s</span>
							) : resendCount < 3 ? (
								<button type="button" onClick={handleResendOtp} disabled={loading} style={{ background: "none", border: "none", color: "var(--color-accent)", cursor: "pointer", padding: 0 }}>
									{loading ? "Sending..." : `Resend OTP (${3 - resendCount} left)`}
								</button>
							) : (
								<span style={{ color: "var(--color-danger)" }}>Max 3 resends reached.</span>
							)}
							<button type="button" onClick={handleEditRoll} style={{ background: "none", border: "none", color: "var(--text-2)", cursor: "pointer", padding: 0 }}>
								Edit Roll Number
							</button>
						</div>
					</div>
				) : null}

				<div className="stack gap-12" style={{ marginTop: "12px" }}>
					{!otpSent ? (
						<Button type="submit" disabled={loading}>{loading ? "Sending OTP..." : "Send OTP"}</Button>
					) : (
						<Button type="submit" disabled={submitting || otp.length !== 4 || !newPassword}>
							{submitting ? "Resetting password..." : "Reset Password"}
						</Button>
					)}
					<Button as={Link} to="/login" variant="ghost">Back to login</Button>
				</div>
			</form>
		</section>
	);
}