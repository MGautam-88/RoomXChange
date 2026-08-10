import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { io } from "socket.io-client";
import api from "../api/axios.js";
import { useAuth } from "./AuthContext.jsx";

const SocketContext = createContext(null);

export function SocketProvider({ children }) {
	const { token, user, ready } = useAuth();
	const [socket, setSocket] = useState(null);
	const [availableCount, setAvailableCount] = useState(0);
	const [notifications, setNotifications] = useState([]);

	// REST fetch & periodic polling for available room count (works seamlessly on Vercel serverless)
	useEffect(() => {
		let mounted = true;
		const fetchCount = async () => {
			try {
				const { data } = await api.get("/rooms/available-count");
				if (mounted && typeof data?.count === "number") {
					setAvailableCount(data.count);
				}
			} catch {
				// Quietly ignore polling errors
			}
		};

		fetchCount();
		const interval = setInterval(fetchCount, 20000);

		return () => {
			mounted = false;
			clearInterval(interval);
		};
	}, []);

	const userId = user?._id || user?.id;

	useEffect(() => {
		if (!ready || !token || !userId) return undefined;
		const socketUrl = (import.meta.env.VITE_API_URL || "http://localhost:5500/api").replace(/\/api$/, "");

		// Vercel serverless functions do not host persistent WebSockets / Socket.io servers.
		// Skip socket.io connection on vercel.app backends to prevent 404 console errors.
		if (socketUrl.includes("vercel.app") || import.meta.env.VITE_DISABLE_SOCKET === "true") {
			return undefined;
		}

		const client = io(socketUrl, {
			transports: ["polling", "websocket"],
			reconnectionAttempts: 2,
			reconnectionDelay: 3000,
			auth: { token, userId },
		});

		client.on("connect", () => setSocket(client));
		client.on("connect_error", () => {
			// Quietly handle connection errors
		});
		client.on("rooms:available-count", ({ count }) => setAvailableCount(count));
		client.on("notification", (payload) => {
			setNotifications((current) => [{ id: crypto.randomUUID(), read: false, createdAt: new Date().toISOString(), ...payload }, ...current]);
		});

		return () => client.disconnect();
	}, [ready, token, userId]);

	const markAllNotificationsRead = () => setNotifications((current) => current.map((item) => ({ ...item, read: true })));

	const value = useMemo(() => ({ socket, availableCount, notifications, markAllNotificationsRead }), [socket, availableCount, notifications]);
	return <SocketContext.Provider value={value}>{children}</SocketContext.Provider>;
}

export const useSocket = () => {
	const context = useContext(SocketContext);
	if (!context) throw new Error("useSocket must be used within SocketProvider");
	return context;
};