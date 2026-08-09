import Room from "../models/Room.js";
import { emitAvailableRoomsCount } from "../sockets/index.js";

const canManageRoom = (req, room) => {
	if (!room) return false;
	if (["admin", "superadmin"].includes(req.user?.role)) return true;
	return room.owner.toString() === req.user?.id;
};

// POST /api/rooms
export const createRoom = async (req, res) => {
	try {
		const { block, roomNumber, floor, status } = req.body;

		if (!roomNumber || !floor) {
			return res.status(400).json({ message: "Room number and floor are required." });
		}

		const formattedRoom = roomNumber.trim().toUpperCase();
		if (!/^[A-F][0-9]{3}$/.test(formattedRoom)) {
			return res.status(400).json({
				message: "Invalid room format. Room code must start with a letter from A-F followed by 3 digits (e.g. A101).",
			});
		}

		if (!["admin", "superadmin"].includes(req.user.role)) {
			const existingRoom = await Room.findOne({ owner: req.user.id });
			if (existingRoom) {
				return res.status(409).json({
					message: `You already hold a registered room (Room ${existingRoom.roomNumber}). A student can only hold one room at a time.`,
				});
			}
		}

		const room = await Room.create({
			owner: req.user.id,
			block,
			roomNumber,
			floor,
			status,
		});

		const populatedRoom = await Room.findById(room._id).populate("owner", "name email role");
		await emitAvailableRoomsCount();

		return res.status(201).json({
			message: "Room created successfully.",
			room: populatedRoom,
		});
	} catch (error) {
		return res.status(500).json({ message: "Failed to create room.", error: error.message });
	}
};

// GET /api/rooms
export const getRooms = async (req, res) => {
	try {
		const filter = ["admin", "superadmin"].includes(req.user.role) ? {} : { status: "available" };

		const rooms = await Room.find(filter)
			.populate("owner", "name email role")
			.sort({ createdAt: -1 });

		return res.json({ rooms });
	} catch (error) {
		return res.status(500).json({ message: "Failed to fetch rooms.", error: error.message });
	}
};

// GET /api/rooms/mine
export const getMyRooms = async (req, res) => {
	try {
		const rooms = await Room.find({ owner: req.user.id })
			.populate("owner", "name email role")
			.sort({ createdAt: -1 });

		return res.json({ rooms });
	} catch (error) {
		return res.status(500).json({ message: "Failed to fetch your rooms.", error: error.message });
	}
};

// GET /api/rooms/:id
export const getRoomById = async (req, res) => {
	try {
		const room = await Room.findById(req.params.id).populate("owner", "name email role");

		if (!room) {
			return res.status(404).json({ message: "Room not found." });
		}

		if (!["admin", "superadmin"].includes(req.user.role) && room.status !== "available" && room.owner.toString() !== req.user.id) {
			return res.status(403).json({ message: "You do not have access to this room." });
		}

		return res.json({ room });
	} catch (error) {
		return res.status(500).json({ message: "Failed to fetch room.", error: error.message });
	}
};

// PUT /api/rooms/:id
export const updateRoom = async (req, res) => {
	try {
		const room = await Room.findById(req.params.id);

		if (!room) {
			return res.status(404).json({ message: "Room not found." });
		}

		if (!canManageRoom(req, room)) {
			return res.status(403).json({ message: "You are not allowed to update this room." });
		}

		const { block, roomNumber, floor, status } = req.body;

		if (block !== undefined) room.block = block;
		if (roomNumber !== undefined) room.roomNumber = roomNumber;
		if (floor !== undefined) room.floor = floor;

		if (["admin", "superadmin"].includes(req.user.role) && status !== undefined) {
			room.status = status;
		}

		await room.save();

		const updatedRoom = await Room.findById(room._id).populate("owner", "name email role");
		await emitAvailableRoomsCount();

		return res.json({
			message: "Room updated successfully.",
			room: updatedRoom,
		});
	} catch (error) {
		return res.status(500).json({ message: "Failed to update room.", error: error.message });
	}
};

// DELETE /api/rooms/:id
export const deleteRoom = async (req, res) => {
	try {
		const room = await Room.findById(req.params.id);

		if (!room) {
			return res.status(404).json({ message: "Room not found." });
		}

		if (!canManageRoom(req, room)) {
			return res.status(403).json({ message: "You are not allowed to delete this room." });
		}

		await room.deleteOne();
		await emitAvailableRoomsCount();

		return res.json({ message: "Room deleted successfully." });
	} catch (error) {
		return res.status(500).json({ message: "Failed to delete room.", error: error.message });
	}
};

// GET /api/rooms/count (Public)
export const getAvailableRoomsCount = async (req, res) => {
	try {
		const rooms = await Room.find({ status: "available" }).populate("owner", "isVerified");
		const count = rooms.filter((r) => r.owner && r.owner.isVerified).length;
		return res.json({ count });
	} catch (error) {
		return res.status(500).json({ message: "Failed to fetch room count.", error: error.message });
	}
};

