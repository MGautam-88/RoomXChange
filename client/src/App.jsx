import { BrowserRouter } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext.jsx";
import { ToastProvider } from "./context/ToastContext.jsx";
import { ConfirmProvider } from "./context/ConfirmContext.jsx";
import { SocketProvider } from "./context/SocketContext.jsx";
import AppRouter from "./router.jsx";

function App() {
	return (
		<BrowserRouter>
			<AuthProvider>
				<SocketProvider>
					<ToastProvider>
						<ConfirmProvider>
							<AppRouter />
						</ConfirmProvider>
					</ToastProvider>
				</SocketProvider>
			</AuthProvider>
		</BrowserRouter>
	);
}

export default App;
