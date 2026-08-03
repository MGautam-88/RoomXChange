import Button from "./Button.jsx";
import Modal from "./Modal.jsx";

export default function ConfirmDialog({ open, title, message, confirmLabel, cancelLabel, danger, onConfirm, onCancel }) {
	return (
		<Modal
			open={open}
			title={title}
			onClose={onCancel}
			footer={<div className="confirm-actions"><Button type="button" variant="ghost" onClick={onCancel}>{cancelLabel}</Button><Button type="button" variant={danger ? "danger" : "primary"} onClick={onConfirm}>{confirmLabel}</Button></div>}
		>
			<p className="muted">{message}</p>
		</Modal>
	);
}