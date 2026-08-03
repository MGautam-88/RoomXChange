import Button from "./Button.jsx";

export default function EmptyState({ title, message, actionLabel, onAction, icon = "□" }) {
	return (
		<section className="empty-state surface">
			<div className="empty-icon">{icon}</div>
			<div>
				<h3>{title}</h3>
				<p className="muted">{message}</p>
			</div>
			{actionLabel ? <Button onClick={onAction}>{actionLabel}</Button> : null}
		</section>
	);
}