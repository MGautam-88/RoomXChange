import { useEffect } from "react";
import { BrowserRouter } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext.jsx";
import { ToastProvider } from "./context/ToastContext.jsx";
import { ConfirmProvider } from "./context/ConfirmContext.jsx";
import { SocketProvider } from "./context/SocketContext.jsx";
import AppRouter from "./router.jsx";

function MouseGlowTracker() {
	useEffect(() => {
		const handleMouseMove = (e) => {
			document.documentElement.style.setProperty("--mouse-x", `${e.clientX}px`);
			document.documentElement.style.setProperty("--mouse-y", `${e.clientY}px`);
		};
		window.addEventListener("mousemove", handleMouseMove, { passive: true });
		return () => window.removeEventListener("mousemove", handleMouseMove);
	}, []);

	return null;
}

function App() {
	return (
		<BrowserRouter>
			<AuthProvider>
				<SocketProvider>
					<ToastProvider>
						<ConfirmProvider>
							<MouseGlowTracker />
							<AppRouter />
						</ConfirmProvider>
					</ToastProvider>
				</SocketProvider>
			</AuthProvider>
		</BrowserRouter>
	);
}

export default App;
