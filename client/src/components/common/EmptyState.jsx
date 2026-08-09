import Button from "./Button.jsx";

export default function EmptyState({ title, message, actionLabel, onAction, icon }) {
	return (
		<section className="empty-state surface">
			<div className="empty-icon">
				{icon || (
					<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
						<path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
					</svg>
				)}
			</div>
			<div>
				<h3>{title}</h3>
				<p className="muted">{message}</p>
			</div>
			{actionLabel ? <Button onClick={onAction}>{actionLabel}</Button> : null}
		</section>
	);
}