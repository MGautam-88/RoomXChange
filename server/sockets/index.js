import jwt from "jsonwebtoken";
import { Server } from "socket.io";
import Room from "../models/Room.js";
import User from "../models/User.js";

let ioInstance = null;

const getUserRoomName = (userId) => `user:${userId}`;

const getConnectedUserId = (socket) => {
	const token = socket.handshake?.auth?.token;
	const userId = socket.handshake?.auth?.userId;

	if (token) {
		try {
			const decoded = jwt.verify(token, process.env.JWT_SECRET);
			return decoded.id;
		} catch (error) {
			return userId || null;
		}
	}

	return userId || null;
};

const getVerifiedAvailableRoomsCount = async () => {
	const count = await User.countDocuments({ isVerified: true });
	return count;
};

export const initSocketServer = (httpServer) => {
	ioInstance = new Server(httpServer, {
		cors: {
			origin: process.env.CLIENT_URL || "http://localhost:5173",
			credentials: true,
		},
	});

	ioInstance.on("connection", async (socket) => {
		const userId = getConnectedUserId(socket);

		if (userId) {
			socket.join(getUserRoomName(userId));
			socket.data.userId = userId;
		}

		const availableRoomsCount = await getVerifiedAvailableRoomsCount();
		socket.emit("rooms:available-count", { count: availableRoomsCount });

		socket.on("disconnect", () => {
			// Room membership is cleaned up automatically by Socket.IO.
		});
	});

	return ioInstance;
};

export const getSocketServer = () => ioInstance;

export const emitAvailableRoomsCount = async () => {
	if (!ioInstance) return;

	const count = await getVerifiedAvailableRoomsCount();
	ioInstance.emit("rooms:available-count", { count });
};

export const emitUserNotification = (userId, payload) => {
	if (!ioInstance || !userId) return;
	ioInstance.to(getUserRoomName(userId)).emit("notification", payload);
};

export const emitCycleProposal = (userIds, payload) => {
	if (!ioInstance || !Array.isArray(userIds)) return;
	for (const userId of userIds) {
		emitUserNotification(userId, payload);
	}
};
