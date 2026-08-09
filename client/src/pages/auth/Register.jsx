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

	// Conflict handling state
	const [conflictState, setConflictState] = useState(null);
	const [conflictType, setConflictType] = useState("alloted_room");
	const [reportMessage, setReportMessage] = useState("");
	const [submittingReport, setSubmittingReport] = useState(false);
	const [reportSubmitted, setReportSubmitted] = useState(false);

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

	// Synchronize report message when conflict type changes
	useEffect(() => {
		if (!conflictState) return;
		const nameStr = form.name || "User";
		const rollStr = form.rollNumber || "Student";
		const allotedStr = conflictState.allotedRoom || "N/A";
		const currentStr = conflictState.currentRoom || "N/A";

		if (conflictType === "alloted_room") {
			setReportMessage(
				`I am ${nameStr} (${rollStr}). I attempted to sign up using Allotted Room ${allotedStr}, but the system reported that this room is already claimed by another user. This allotted room belongs to me. Please resolve this ownership conflict.`
			);
		} else if (conflictType === "current_room") {
			setReportMessage(
				`I am ${nameStr} (${rollStr}). I attempted to sign up using Current Living Room ${currentStr}, but the system reported that this room is already claimed by another user. This current room belongs to me. Please resolve this ownership conflict.`
			);
		} else {
			setReportMessage(
				`I am ${nameStr} (${rollStr}). I attempted to sign up using Allotted Room ${allotedStr} and Current Room ${currentStr}, but the system reported that these room codes are already claimed by another user. Both rooms belong to me. Please resolve this ownership conflict.`
			);
		}
	}, [conflictType, conflictState, form.name, form.rollNumber]);

	const handleSendOtp = async (event) => {
		event.preventDefault();
		const cleanAlloted = form.allotedRoom.trim().toUpperCase();
		if (!/^[A-F][1-4](0[1-9]|1[0-9]|2[0-5])$/.test(cleanAlloted)) {
			showToast(
				"Alloted room format must be 1 letter (A-F), 1 floor digit (1-4), and 2 room digits from 01 to 25 (e.g. A101 to F425).",
				"error"
			);
			return;
		}

		let cleanCurrent = form.currentRoom.trim().toUpperCase();
		if (cleanCurrent && !/^[A-F][1-4](0[1-9]|1[0-9]|2[0-5])$/.test(cleanCurrent)) {
			showToast(
				"Current room format must be 1 letter (A-F), 1 floor digit (1-4), and 2 room digits from 01 to 25 (e.g. A101 to F425).",
				"error"
			);
			return;
		}

		setLoading(true);
		setConflictState(null);
		setReportSubmitted(false);

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
			const errData = error.response?.data;
			if (errData?.roomConflict) {
				setConflictState({
					allotedRoom: errData.allotedRoom,
					currentRoom: errData.currentRoom,
					allotedConflict: errData.allotedConflict,
					currentConflict: errData.currentConflict,
				});
				if (errData.allotedConflict && errData.currentConflict) {
					setConflictType("both_rooms");
				} else if (errData.currentConflict) {
					setConflictType("current_room");
				} else {
					setConflictType("alloted_room");
				}
				showToast(errData.message || "Room code conflict detected.", "error");
			} else {
				showToast(errData?.message || "Unable to send registration OTP.", "error");
			}
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
		setConflictState(null);
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
			const errData = error.response?.data;
			if (errData?.roomConflict) {
				setConflictState({
					allotedRoom: errData.allotedRoom,
					currentRoom: errData.currentRoom,
					allotedConflict: errData.allotedConflict,
					currentConflict: errData.currentConflict,
				});
				showToast(errData.message || "Room code conflict detected.", "error");
			} else {
				showToast(errData?.message || "Registration failed. Invalid or expired OTP.", "error");
			}
		} finally {
			setSubmitting(false);
		}
	};

	const handleSubmitConflictReport = async () => {
		if (!reportMessage.trim()) {
			showToast("Please enter a message for the admin report.", "error");
			return;
		}
		setSubmittingReport(true);
		try {
			const reporterEmail = `${form.rollNumber.trim().toLowerCase()}@iiitdmj.ac.in`;
			await api.post("/reports/public", {
				reporterName: form.name,
				reporterEmail,
				conflictType,
				allotedRoom: conflictState.allotedRoom,
				currentRoom: conflictState.currentRoom,
				message: reportMessage,
			});
			setReportSubmitted(true);
			showToast("Report submitted to Admin & Super Admin console successfully!", "success");
		} catch (error) {
			showToast(error.response?.data?.message || "Failed to submit report.", "error");
		} finally {
			setSubmittingReport(false);
		}
	};

	const handleEditDetails = () => {
		setOtpSent(false);
		setOtp("");
		setOtpToken("");
		setResendCount(0);
		setCooldown(0);
		setConflictState(null);
		setReportSubmitted(false);
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
					disabled={otpSent || Boolean(conflictState)}
					required
				/>
				<Input
					label="Roll Number"
					type="text"
					value={form.rollNumber}
					onChange={(event) => setForm((current) => ({ ...current, rollNumber: event.target.value.toLowerCase().trim().slice(0, 8) }))}
					placeholder="23bcs001"
					maxLength={8}
					disabled={otpSent || Boolean(conflictState)}
					required
				/>
				<Input
					label="Password"
					type="password"
					value={form.password}
					onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))}
					disabled={otpSent || Boolean(conflictState)}
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
						disabled={otpSent || Boolean(conflictState)}
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
						disabled={otpSent || Boolean(conflictState)}
					/>
				</div>

				{/* Room Conflict & Report to Admin Section */}
				{conflictState ? (
					<div
						style={{
							margin: "12px 0",
							padding: "16px",
							background: "rgba(239, 68, 68, 0.08)",
							border: "1px solid rgba(239, 68, 68, 0.3)",
							borderRadius: "10px",
						}}
					>
						<div style={{ display: "flex", alignItems: "center", gap: "8px", color: "var(--color-danger)", fontWeight: 600, marginBottom: "8px" }}>
							<span>⚠️</span>
							<span>Room Already Registered</span>
						</div>
						<p className="muted" style={{ fontSize: "0.88rem", marginBottom: "14px", lineHeight: "1.4" }}>
							The room code(s) you entered (Allotted: <strong>{conflictState.allotedRoom}</strong>, Current: <strong>{conflictState.currentRoom}</strong>) are already assigned to a registered user in our database.
						</p>

						{!reportSubmitted ? (
							<div className="stack gap-12">
								<p style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--text-1)" }}>Report ownership to Admin & Super Admin:</p>
								<div className="stack gap-8">
									<label style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "0.88rem", cursor: "pointer" }}>
										<input
											type="radio"
											name="conflictType"
											value="alloted_room"
											checked={conflictType === "alloted_room"}
											onChange={() => setConflictType("alloted_room")}
										/>
										<span>Allotted room (<strong>{conflictState.allotedRoom}</strong>) belongs to me</span>
									</label>
									<label style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "0.88rem", cursor: "pointer" }}>
										<input
											type="radio"
											name="conflictType"
											value="current_room"
											checked={conflictType === "current_room"}
											onChange={() => setConflictType("current_room")}
										/>
										<span>Current room (<strong>{conflictState.currentRoom}</strong>) belongs to me</span>
									</label>
									<label style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "0.88rem", cursor: "pointer" }}>
										<input
											type="radio"
											name="conflictType"
											value="both_rooms"
											checked={conflictType === "both_rooms"}
											onChange={() => setConflictType("both_rooms")}
										/>
										<span>Both Allotted & Current room belong to me</span>
									</label>
								</div>

								<div style={{ marginTop: "8px" }}>
									<label className="input-label">Report details</label>
									<textarea
										rows={3}
										value={reportMessage}
										onChange={(e) => setReportMessage(e.target.value)}
										style={{
											width: "100%",
											padding: "10px",
											background: "var(--surface-color)",
											border: "1px solid var(--border-color)",
											borderRadius: "8px",
											color: "var(--text-1)",
											fontFamily: "inherit",
											fontSize: "0.85rem",
											resize: "vertical",
										}}
									/>
								</div>

								<div style={{ display: "flex", gap: "10px", marginTop: "4px" }}>
									<Button type="button" variant="accent" disabled={submittingReport} onClick={handleSubmitConflictReport}>
										{submittingReport ? "Submitting Report..." : "Report to Admin"}
									</Button>
									<Button type="button" variant="secondary" onClick={handleEditDetails}>
										Change Room Codes
									</Button>
								</div>
							</div>
						) : (
							<div style={{ padding: "12px", background: "rgba(34, 197, 94, 0.1)", border: "1px solid rgba(34, 197, 94, 0.3)", borderRadius: "8px", marginTop: "8px" }}>
								<p style={{ color: "#4ade80", fontWeight: 600, fontSize: "0.9rem", marginBottom: "4px" }}>
									✓ Report Submitted to Admin & Super Admin Console
								</p>
								<p className="muted" style={{ fontSize: "0.85rem" }}>
									The admin team has received your room ownership claim and will resolve it shortly. You can edit your details or try registering with another room code.
								</p>
								<div style={{ marginTop: "10px" }}>
									<Button type="button" variant="secondary" size="sm" onClick={handleEditDetails}>
										Edit Details & Try Again
									</Button>
								</div>
							</div>
						)}
					</div>
				) : null}

				{/* OTP Verification Box */}
				{otpSent && !conflictState ? (
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

				{!conflictState ? (
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
				) : null}
			</form>
		</section>
	);
}
