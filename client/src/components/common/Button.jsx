export default function Button({ as: Component = "button", variant = "primary", size = "md", className = "", children, ...props }) {
	return <Component className={`button button-${variant} button-${size} ${className}`.trim()} {...props}>{children}</Component>;
}