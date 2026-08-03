import { useState } from "react";
import FormFieldError from "./FormFieldError.jsx";

export default function Input({ label, error, hint, multiline = false, className = "", type, ...props }) {
	const [showPassword, setShowPassword] = useState(false);
	const isPasswordType = type === "password";
	const currentType = isPasswordType ? (showPassword ? "text" : "password") : type;
	const Field = multiline ? "textarea" : "input";

	return (
		<label className={`field ${className}`.trim()}>
			{label ? <span className="field-label">{label}</span> : null}
			<div className="field-input-wrapper">
				<Field className="field-control" type={currentType} {...props} />
				{isPasswordType && (
					<button
						type="button"
						className="password-toggle-btn"
						onClick={(e) => {
							e.preventDefault();
							setShowPassword((prev) => !prev);
						}}
						aria-label={showPassword ? "Hide password" : "Show password"}
						title={showPassword ? "Hide password" : "Show password"}
					>
						{showPassword ? (
							<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
								<path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
								<line x1="1" y1="1" x2="23" y2="23" />
							</svg>
						) : (
							<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
								<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
								<circle cx="12" cy="12" r="3" />
							</svg>
						)}
					</button>
				)}
			</div>
			{hint ? <span className="field-hint">{hint}</span> : null}
			<FormFieldError>{error}</FormFieldError>
		</label>
	);
}