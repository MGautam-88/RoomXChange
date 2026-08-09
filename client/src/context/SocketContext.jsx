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

	// Initial REST fetch for room count
	useEffect(() => {
		let mounted = true;
		(async () => {
			try {
				const { data } = await api.get("/rooms/available-count");
				if (mounted && typeof data.count === "number") {
					setAvailableCount(data.count);
				}
			} catch (err) {
				console.error("Failed to fetch live room count:", err.message);
			}
		})();
		return () => {
			mounted = false;
		};
	}, []);

	useEffect(() => {
		if (!ready) return undefined;
		const socketUrl = (import.meta.env.VITE_API_URL || "http://localhost:5500/api").replace(/\/api$/, "");
		const client = io(socketUrl, { transports: ["websocket"], auth: { token, userId: user?.id } });
		client.on("connect", () => setSocket(client));
		client.on("rooms:available-count", ({ count }) => setAvailableCount(count));
		client.on("notification", (payload) => {
			setNotifications((current) => [{ id: crypto.randomUUID(), read: false, createdAt: new Date().toISOString(), ...payload }, ...current]);
		});
		return () => client.disconnect();
	}, [ready, token, user?.id]);

	const markAllNotificationsRead = () => setNotifications((current) => current.map((item) => ({ ...item, read: true })));

	const value = useMemo(() => ({ socket, availableCount, notifications, markAllNotificationsRead }), [socket, availableCount, notifications]);
	return <SocketContext.Provider value={value}>{children}</SocketContext.Provider>;
}

export const useSocket = () => {
	const context = useContext(SocketContext);
	if (!context) throw new Error("useSocket must be used within SocketProvider");
	return context;
};