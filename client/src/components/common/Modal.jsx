import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";

export default function Modal({ open, title, children, footer, onClose }) {
	const panelRef = useRef(null);
	const onCloseRef = useRef(onClose);

	useEffect(() => {
		onCloseRef.current = onClose;
	}, [onClose]);

	useEffect(() => {
		if (!open) return undefined;
		const previousOverflow = document.body.style.overflow;
		document.body.style.overflow = "hidden";
		const handleKeyDown = (event) => {
			if (event.key === "Escape") onCloseRef.current?.();
			if (event.key === "Tab" && panelRef.current) {
				const focusable = panelRef.current.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
				if (!focusable.length) return;
				const first = focusable[0];
				const last = focusable[focusable.length - 1];
				if (event.shiftKey && document.activeElement === first) {
					event.preventDefault();
					last.focus();
				} else if (!event.shiftKey && document.activeElement === last) {
					event.preventDefault();
					first.focus();
				}
			}
		};
		document.addEventListener("keydown", handleKeyDown);
		window.setTimeout(() => {
			if (panelRef.current && !panelRef.current.contains(document.activeElement)) {
				const target = panelRef.current.querySelector('[autofocus], input:not([type="hidden"]), textarea, select, button');
				target?.focus();
			}
		}, 10);
		return () => {
			document.body.style.overflow = previousOverflow;
			document.removeEventListener("keydown", handleKeyDown);
		};
	}, [open]);

	if (!open) return null;

	return createPortal(
		<div className="modal-backdrop" onMouseDown={onClose}>
			<section ref={panelRef} className="modal-card" onMouseDown={(event) => event.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="modal-title">
				<header className="modal-header">
					<h2 id="modal-title">{title}</h2>
					<button type="button" className="icon-button" onClick={onClose} aria-label="Close modal">×</button>
				</header>
				<div className="modal-body">{children}</div>
				{footer ? <footer className="modal-footer">{footer}</footer> : null}
			</section>
		</div>,
		document.body
	);
}