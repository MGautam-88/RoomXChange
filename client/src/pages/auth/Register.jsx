import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../../api/axios.js";
import Button from "../../components/common/Button.jsx";
import Input from "../../components/common/Input.jsx";
import { useAuth } from "../../context/AuthContext.jsx";
import { useToast } from "../../context/ToastContext.jsx";

export default function Register() {
	const { updateUser } = useAuth();
	const showToast = useToast();
	const navigate = useNavigate();

	const [form, setForm] = useState({
		name: "",
		rollNumber: "",
		password: "",
		allotedRoom: "",
		currentRoom: "",
	});
	const [otp, setOtp] = useState("");
	const [otpToken, setOtpToken] = useState("");
	const [otpSent, setOtpSent] = useState(false);
	const [resendCount, setResendCount] = useState(0);
	const [cooldown, setCooldown] = useState(0);
	const [loading, setLoading] = useState(false);
	const [submitting, setSubmitting] = useState(false);

	// Timer for 60s resend cooldown
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
		const cleanAlloted = form.allotedRoom.trim().toUpperCase();
		if (!/^[A-F][1-4](0[1-9]|1[0-9]|2[0-5])$/.test(cleanAlloted)) {
			showToast("Alloted room format must be 1 letter (A-F), 1 floor digit (1-4), and 2 room digits from 01 to 25 (e.g. A101 to F425).", "error");
			return;
		}

		let cleanCurrent = form.currentRoom.trim().toUpperCase();
		if (cleanCurrent && !/^[A-F][1-4](0[1-9]|1[0-9]|2[0-5])$/.test(cleanCurrent)) {
			showToast("Current room format must be 1 letter (A-F), 1 floor digit (1-4), and 2 room digits from 01 to 25 (e.g. A101 to F425).", "error");
			return;
		}

		setLoading(true);
		try {
			const payload = {
				...form,
				allotedRoom: cleanAlloted,
				currentRoom: cleanCurrent || cleanAlloted,
			};
			const { data } = await api.post("/auth/send-register-otp", payload);
			setOtpToken(data.otpToken);
			setResendCount(0);
			setCooldown(60);
			setOtpSent(true);
			showToast(data.message, "success");
		} catch (error) {
			showToast(error.response?.data?.message || "Unable to send registration OTP.", "error");
		} finally {
			setLoading(false);
		}
	};

	const handleResendOtp = async () => {
		if (cooldown > 0 || resendCount >= 3) return;
		setLoading(true);
		try {
			const { data } = await api.post("/auth/resend-register-otp", { otpToken });
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

	const handleCompleteRegistration = async (event) => {
		event.preventDefault();
		if (!otp || otp.length !== 4) {
			showToast("Please enter the 4-digit OTP sent to your college email.", "error");
			return;
		}

		setSubmitting(true);
		try {
			const cleanAlloted = form.allotedRoom.trim().toUpperCase();
			const cleanCurrent = form.currentRoom.trim().toUpperCase() || cleanAlloted;

			const { data } = await api.post("/auth/register-with-otp", {
				...form,
				allotedRoom: cleanAlloted,
				currentRoom: cleanCurrent,
				otpToken,
				otp,
			});

			if (data.token && data.user) {
				localStorage.setItem("roomxchange-auth", JSON.stringify({ token: data.token, user: data.user }));
				updateUser(data.user);
			}

			showToast(data.message, "success");
			navigate("/");
		} catch (error) {
			showToast(error.response?.data?.message || "Registration failed. Invalid or expired OTP.", "error");
		} finally {
			setSubmitting(false);
		}
	};

	const handleEditDetails = () => {
		setOtpSent(false);
		setOtp("");
		setOtpToken("");
		setResendCount(0);
		setCooldown(0);
	};

	return (
		<section className="auth-page">
			<form className="auth-card surface" onSubmit={otpSent ? handleCompleteRegistration : handleSendOtp}>
				<p className="eyebrow">Create account</p>
				<h1>Register</h1>
				<p className="muted">Enter your details to register and receive a 4-digit verification OTP on your college email.</p>

				<Input
					label="Full name"
					value={form.name}
					onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
					disabled={otpSent}
					required
				/>
				<Input
					label="Roll Number"
					type="text"
					value={form.rollNumber}
					onChange={(event) => setForm((current) => ({ ...current, rollNumber: event.target.value.toLowerCase().trim().slice(0, 8) }))}
					placeholder="23bcs001"
					maxLength={8}
					disabled={otpSent}
					required
				/>
				<Input
					label="Password"
					type="password"
					value={form.password}
					onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))}
					disabled={otpSent}
					required
				/>

				<div className="form-grid">
					<Input
						label="Alloted Room Code"
						value={form.allotedRoom}
						onChange={(event) => {
							const val = event.target.value;
							if (!val) {
								setForm((current) => ({ ...current, allotedRoom: "" }));
								return;
							}
							const upper = val.toUpperCase().trim();
							if (!/^[A-F]/.test(upper)) return;
							const block = upper[0];
							if (upper.length === 1) {
								setForm((current) => ({ ...current, allotedRoom: block }));
								return;
							}
							const floorChar = upper[1];
							if (!/[1-4]/.test(floorChar)) {
								setForm((current) => ({ ...current, allotedRoom: block }));
								return;
							}
							if (upper.length === 2) {
								setForm((current) => ({ ...current, allotedRoom: block + floorChar }));
								return;
							}
							const d3 = upper[2];
							if (!/[0-9]/.test(d3) || Number(d3) > 2) {
								setForm((current) => ({ ...current, allotedRoom: block + floorChar }));
								return;
							}
							if (upper.length === 3) {
								setForm((current) => ({ ...current, allotedRoom: block + floorChar + d3 }));
								return;
							}
							const d4 = upper[3];
							if (!/[0-9]/.test(d4)) {
								setForm((current) => ({ ...current, allotedRoom: block + floorChar + d3 }));
								return;
							}
							const roomNum = Number(d3 + d4);
							if (roomNum < 1 || roomNum > 25) {
								setForm((current) => ({ ...current, allotedRoom: block + floorChar + d3 }));
								return;
							}
							setForm((current) => ({ ...current, allotedRoom: block + floorChar + d3 + d4 }));
						}}
						placeholder="A101"
						maxLength={4}
						disabled={otpSent}
						required
					/>
					<Input
						label="Current Room Code (Optional)"
						value={form.currentRoom}
						onChange={(event) => {
							const val = event.target.value;
							if (!val) {
								setForm((current) => ({ ...current, currentRoom: "" }));
								return;
							}
							const upper = val.toUpperCase().trim();
							if (!/^[A-F]/.test(upper)) return;
							const block = upper[0];
							if (upper.length === 1) {
								setForm((current) => ({ ...current, currentRoom: block }));
								return;
							}
							const floorChar = upper[1];
							if (!/[1-4]/.test(floorChar)) {
								setForm((current) => ({ ...current, currentRoom: block }));
								return;
							}
							if (upper.length === 2) {
								setForm((current) => ({ ...current, currentRoom: block + floorChar }));
								return;
							}
							const d3 = upper[2];
							if (!/[0-9]/.test(d3) || Number(d3) > 2) {
								setForm((current) => ({ ...current, currentRoom: block + floorChar }));
								return;
							}
							if (upper.length === 3) {
								setForm((current) => ({ ...current, currentRoom: block + floorChar + d3 }));
								return;
							}
							const d4 = upper[3];
							if (!/[0-9]/.test(d4)) {
								setForm((current) => ({ ...current, currentRoom: block + floorChar + d3 }));
								return;
							}
							const roomNum = Number(d3 + d4);
							if (roomNum < 1 || roomNum > 25) {
								setForm((current) => ({ ...current, currentRoom: block + floorChar + d3 }));
								return;
							}
							setForm((current) => ({ ...current, currentRoom: block + floorChar + d3 + d4 }));
						}}
						placeholder="Defaults to Alloted Room"
						maxLength={4}
						disabled={otpSent}
					/>
				</div>

				{otpSent ? (
					<div style={{ margin: "8px 0 0", padding: "14px 16px", background: "rgba(201, 243, 29, 0.05)", border: "1px solid rgba(201, 243, 29, 0.2)", borderRadius: "8px" }}>
						<p className="muted" style={{ fontSize: "0.88rem", marginBottom: "10px" }}>
							An OTP has been sent to <strong>{form.rollNumber}@iiitdmj.ac.in</strong> (valid for 15 mins; please also check your spam folder).
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
							<button type="button" onClick={handleEditDetails} style={{ background: "none", border: "none", color: "var(--text-2)", cursor: "pointer", padding: 0 }}>
								Edit Details
							</button>
						</div>
					</div>
				) : null}

				<div className="stack gap-12" style={{ marginTop: "12px" }}>
					{!otpSent ? (
						<Button type="submit" disabled={loading}>{loading ? "Sending OTP..." : "Send OTP"}</Button>
					) : (
						<Button type="submit" disabled={submitting || otp.length !== 4}>
							{submitting ? "Verifying & Registering..." : "Register"}
						</Button>
					)}
					<p className="muted">Already registered? <Link to="/login">Login</Link></p>
				</div>
			</form>
		</section>
	);
}
