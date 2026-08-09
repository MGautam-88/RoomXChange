import User from "../models/User.js";
import Room from "../models/Room.js";
import SwapRequest from "../models/SwapRequest.js";
import { findCycleFromRequest } from "../services/swapAlgorithm.js";

const userProjection = "name email role isVerified allotedRoom currentRoom block floor createdAt updatedAt";
const roomPopulateOptions = { path: "owner", select: userProjection };
const swapPopulateOptions = [
	{ path: "requester", select: userProjection },
	{ path: "targetUser", select: userProjection },
	{ path: "requesterRoom", populate: roomPopulateOptions },
	{ path: "targetRoom", populate: roomPopulateOptions },
];

const startOfWeekUtc = (date = new Date()) => {
	const day = date.getUTCDay();
	const diffToMonday = day === 0 ? 6 : day - 1;
	const start = new Date(date);
	start.setUTCDate(date.getUTCDate() - diffToMonday);
	start.setUTCHours(0, 0, 0, 0);
	return start;
};

const startOfMonthUtc = (date = new Date()) => {
	const start = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1, 0, 0, 0, 0));
	return start;
};

const monthWindowEndUtc = (date = new Date()) => {
	const end = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 1, 0, 0, 0, 0));
	return end;
};

// GET /api/admin/users
export const getAllUsers = async (req, res) => {
	try {
		const users = await User.find({}).select(userProjection).sort({ createdAt: -1 });
		return res.json({ users });
	} catch (error) {
		return res.status(500).json({ message: "Failed to fetch users.", error: error.message });
	}
};

// GET /api/admin/rooms
export const getAllRooms = async (req, res) => {
	try {
		const rooms = await Room.find({}).populate(roomPopulateOptions).sort({ createdAt: -1 });
		return res.json({ rooms });
	} catch (error) {
		return res.status(500).json({ message: "Failed to fetch rooms.", error: error.message });
	}
};

// GET /api/admin/swaps
export const getAllSwapRequests = async (req, res) => {
	try {
		const swaps = await SwapRequest.find({}).populate(swapPopulateOptions).sort({ createdAt: -1 });

		const enrichedSwaps = swaps.map((swap) => {
			const swapObj = swap.toObject();
			const cycle = findCycleFromRequest(swap, swaps);

			if (cycle && cycle.length > 1) {
				swapObj.chainLength = cycle.length;
				swapObj.mappings = cycle.map((item) => ({
					user: {
						id: item.requester?._id,
						name: item.requester?.name || "Student",
						email: item.requester?.email || "",
					},
					currentRoom: item.requesterRoom?.roomNumber || "—",
					newRoom: item.targetRoom?.roomNumber || "—",
					status: item.status || "pending",
				}));
			} else {
				swapObj.chainLength = 2;
				swapObj.mappings = [
					{
						user: {
							id: swap.requester?._id,
							name: swap.requester?.name || "Student",
							email: swap.requester?.email || "",
						},
						currentRoom: swap.requesterRoom?.roomNumber || "—",
						newRoom: swap.targetRoom?.roomNumber || "—",
						status: swap.status || "pending",
					},
					{
						user: {
							id: swap.targetUser?._id,
							name: swap.targetUser?.name || "Student",
							email: swap.targetUser?.email || "",
						},
						currentRoom: swap.targetRoom?.roomNumber || "—",
						newRoom: swap.requesterRoom?.roomNumber || "—",
						status: "pending",
					},
				];
			}

			return swapObj;
		});

		return res.json({ swaps: enrichedSwaps });
	} catch (error) {
		return res.status(500).json({ message: "Failed to fetch swap requests.", error: error.message });
	}
};

// PATCH /api/admin/users/:id/role
export const updateUserRole = async (req, res) => {
	try {
		const { role } = req.body;
		const { id } = req.params;

		if (!["user", "admin"].includes(role)) {
			return res.status(400).json({ message: "Role must be either user or admin." });
		}

		const user = await User.findById(id);
		if (!user) {
			return res.status(404).json({ message: "User not found." });
		}

		if (user.role === "superadmin") {
			return res.status(400).json({ message: "Superadmin role cannot be changed here." });
		}

		user.role = role;
		await user.save();

		const updatedUser = await User.findById(id).select(userProjection);

		return res.json({ message: "User role updated successfully.", user: updatedUser });
	} catch (error) {
		return res.status(500).json({ message: "Failed to update user role.", error: error.message });
	}
};

// DELETE /api/admin/admins/:id
export const removeAdmin = async (req, res) => {
	try {
		const { id } = req.params;

		if (req.user.id === id) {
			return res.status(400).json({ message: "You cannot remove your own account." });
		}

		const user = await User.findById(id);

		if (!user) {
			return res.status(404).json({ message: "User not found." });
		}

		if (user.role !== "admin") {
			return res.status(400).json({ message: "Only admin accounts can be removed here." });
		}

		await user.deleteOne();

		return res.json({ message: "Admin removed successfully." });
	} catch (error) {
		return res.status(500).json({ message: "Failed to remove admin.", error: error.message });
	}
};

// GET /api/admin/analytics
export const getAnalytics = async (req, res) => {
	try {
		const now = new Date();
		const weekStart = startOfWeekUtc(now);
		const monthStart = startOfMonthUtc(now);
		const nextMonthStart = monthWindowEndUtc(now);

		const [totalUsers, totalRooms, roomsByStatus, weeklyCompletedSwaps, monthlyCompletedSwaps, mostActiveBlocks] = await Promise.all([
			User.countDocuments({}),
			Room.countDocuments({}),
			Room.aggregate([
				{ $group: { _id: "$status", count: { $sum: 1 } } },
				{ $sort: { count: -1, _id: 1 } },
			]),
			SwapRequest.countDocuments({ status: "completed", updatedAt: { $gte: weekStart, $lte: now } }),
			SwapRequest.countDocuments({ status: "completed", updatedAt: { $gte: monthStart, $lt: nextMonthStart } }),
			Room.aggregate([
				{ $group: { _id: "$block", count: { $sum: 1 } } },
				{ $sort: { count: -1, _id: 1 } },
				{ $limit: 10 },
			]),
		]);

		return res.json({
			totalUsers,
			totalRooms,
			roomsByStatus,
			swapsCompletedThisWeek: weeklyCompletedSwaps,
			swapsCompletedThisMonth: monthlyCompletedSwaps,
			mostActiveBlocks,
		});
	} catch (error) {
		return res.status(500).json({ message: "Failed to fetch analytics.", error: error.message });
	}
};
