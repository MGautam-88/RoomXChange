import { useEffect, useState } from "react";

function SingleToast({ toast, onDismiss }) {
	const [isHovered, setIsHovered] = useState(false);

	useEffect(() => {
		if (isHovered) return undefined;
		const timer = setTimeout(() => {
			onDismiss(toast.id);
		}, 3800);
		return () => clearTimeout(timer);
	}, [toast.id, isHovered, onDismiss]);

	return (
		<article
			className={`toast toast-${toast.variant}`}
			onMouseEnter={() => setIsHovered(true)}
			onMouseLeave={() => setIsHovered(false)}
		>
			<div className="toast-copy">{toast.message}</div>
			<button
				type="button"
				className="icon-button"
				onClick={() => onDismiss(toast.id)}
				aria-label="Dismiss toast"
			>
				×
			</button>
		</article>
	);
}

export default function ToastContainer({ toasts, onDismiss }) {
	return (
		<div className="toast-stack" aria-live="polite" aria-atomic="true">
			{toasts.map((toast) => (
				<SingleToast key={toast.id} toast={toast} onDismiss={onDismiss} />
			))}
		</div>
	);
}