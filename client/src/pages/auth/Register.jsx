import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Button from "../../components/common/Button.jsx";
import Input from "../../components/common/Input.jsx";
import { useAuth } from "../../context/AuthContext.jsx";
import { useToast } from "../../context/ToastContext.jsx";

export default function Register() {
	const { register } = useAuth();
	const showToast = useToast();
	const navigate = useNavigate();
	const [form, setForm] = useState({
		name: "",
		rollNumber: "",
		password: "",
		allotedRoom: "",
		currentRoom: "",
	});
	const [loading, setLoading] = useState(false);

	const handleSubmit = async (event) => {
		event.preventDefault();
		const cleanAlloted = form.allotedRoom.trim().toUpperCase();
		if (!/^[A-F][0-9]{3}$/.test(cleanAlloted)) {
			showToast("Alloted room format must be 1 letter (A-F) followed by 3 digits (e.g. A101).", "error");
			return;
		}

		let cleanCurrent = form.currentRoom.trim().toUpperCase();
		if (cleanCurrent && !/^[A-F][0-9]{3}$/.test(cleanCurrent)) {
			showToast("Current room format must be 1 letter (A-F) followed by 3 digits (e.g. A101).", "error");
			return;
		}

		if (!cleanCurrent) {
			cleanCurrent = cleanAlloted;
		}

		setLoading(true);
		try {
			const payload = {
				...form,
				allotedRoom: cleanAlloted,
				currentRoom: cleanCurrent,
			};
			const response = await register(payload);
			showToast(response.message, "success");
			navigate("/verify-otp", { state: { rollNumber: form.rollNumber } });
		} catch (error) {
			showToast(error.response?.data?.message || "Unable to create account.", "error");
		} finally {
			setLoading(false);
		}
	};

	return (
		<section className="auth-page">
			<form className="auth-card surface" onSubmit={handleSubmit}>
				<p className="eyebrow">Create account</p>
				<h1>Register</h1>
				<p className="muted">Enter your roll number to receive an account verification OTP on your college email.</p>
				<Input
					label="Full name"
					value={form.name}
					onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
					required
				/>
				<Input
					label="Roll Number"
					type="text"
					value={form.rollNumber}
					onChange={(event) => setForm((current) => ({ ...current, rollNumber: event.target.value }))}
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

				<div className="form-grid">
					<Input
						label="Alloted Room Code"
						value={form.allotedRoom}
						onChange={(event) => setForm((current) => ({ ...current, allotedRoom: event.target.value }))}
						placeholder="A101"
						required
					/>
					<Input
						label="Current Room Code (Optional)"
						value={form.currentRoom}
						onChange={(event) => setForm((current) => ({ ...current, currentRoom: event.target.value }))}
						placeholder="Defaults to Alloted Room"
					/>
				</div>

				<div className="stack gap-12">
					<Button type="submit" disabled={loading}>{loading ? "Creating account" : "Register"}</Button>
					<p className="muted">Already registered? <Link to="/login">Login</Link></p>
				</div>
			</form>
		</section>
	);
}
