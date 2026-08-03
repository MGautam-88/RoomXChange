/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useMemo, useState } from "react";
import ConfirmDialog from "../components/common/ConfirmDialog.jsx";

const ConfirmContext = createContext(null);

export function ConfirmProvider({ children }) {
	const [state, setState] = useState({ open: false, options: null, resolve: null });

	const confirm = (options) => new Promise((resolve) => setState({ open: true, options, resolve }));
	const close = (result) => {
		state.resolve?.(result);
		setState({ open: false, options: null, resolve: null });
	};

	const value = useMemo(() => ({ confirm }), []);

	return (
		<ConfirmContext.Provider value={value}>
			{children}
			<ConfirmDialog
				open={state.open}
				title={state.options?.title || "Confirm action"}
				message={state.options?.message || "Continue with this action?"}
				confirmLabel={state.options?.confirmLabel || "Confirm"}
				cancelLabel={state.options?.cancelLabel || "Cancel"}
				danger={Boolean(state.options?.danger)}
				onConfirm={() => close(true)}
				onCancel={() => close(false)}
			/>
		</ConfirmContext.Provider>
	);
}

export const useConfirm = () => {
	const context = useContext(ConfirmContext);
	if (!context) throw new Error("useConfirm must be used within ConfirmProvider");
	return context.confirm;
};