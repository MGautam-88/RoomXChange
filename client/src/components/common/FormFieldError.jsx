export default function FormFieldError({ children }) {
	if (!children) return null;
	return <div className="field-error">{children}</div>;
}