import Room from "../models/Room.js";
import "../models/User.js";
import SwapRequest from "../models/SwapRequest.js";
import { executeCycleSwap, executeRequestSwap, getPendingCycleSuggestions } from "../services/swapAlgorithm.js";
import { emitAvailableRoomsCount, emitCycleProposal, emitUserNotification } from "../sockets/index.js";

const populateSwapRequest = (query) =>
	query
		.populate("requester", "name email role")
		.populate("targetUser", "name email role")
		.populate({ path: "requesterRoom", populate: { path: "owner", select: "name email role" } })
		.populate({ path: "targetRoom", populate: { path: "owner", select: "name email role" } });

const isRoomOwner = (room, userId) => room?.owner?.toString() === userId;

export const createSwapRequest = async (req, res) => {
	try {
		const { requesterRoomId, targetRoomId } = req.body;

		if (!requesterRoomId || !targetRoomId) {
			return res.status(400).json({ message: "Requester room and target room are required." });
		}

		const requesterRoom = await Room.findById(requesterRoomId);
		const targetRoom = await Room.findById(targetRoomId);

		if (!requesterRoom || !targetRoom) {
			return res.status(404).json({ message: "One or more rooms were not found." });
		}

		if (!isRoomOwner(requesterRoom, req.user.id)) {
			return res.status(403).json({ message: "You can only request swaps for your own room." });
		}

		if (isRoomOwner(targetRoom, req.user.id)) {
			return res.status(400).json({ message: "Target room must belong to another user." });
		}

		const existingRequest = await SwapRequest.findOne({
			requester: req.user.id,
			requesterRoom: requesterRoomId,
			targetRoom: targetRoomId,
			status: "pending",
		});

		if (existingRequest) {
			return res.status(409).json({ message: "This swap request already exists and is pending." });
		}

		const swapRequest = await SwapRequest.create({
			requester: req.user.id,
			requesterRoom: requesterRoomId,
			targetRoom: targetRoomId,
			targetUser: targetRoom.owner,
		});

		const populatedRequest = await populateSwapRequest(SwapRequest.findById(swapRequest._id));
		const cycleSuggestions = await getPendingCycleSuggestions();
		const matchingCycle = cycleSuggestions.find((cycle) => cycle.requestIds.some((id) => id.toString() === swapRequest._id.toString()));

		emitUserNotification(targetRoom.owner.toString(), {
			type: "swap-request-received",
			message: "You received a new swap request.",
			requestId: swapRequest._id.toString(),
		});

		if (matchingCycle) {
			emitCycleProposal(matchingCycle.userIds.map((id) => id.toString()), {
				type: "swap-cycle-proposed",
				message: "A swap cycle is available for confirmation.",
				requestIds: matchingCycle.requestIds.map((id) => id.toString()),
			});
		}

		return res.status(201).json({
			message: "Swap request created successfully.",
			swapRequest: populatedRequest,
			cycleSuggestion: matchingCycle || null,
		});
	} catch (error) {
		return res.status(500).json({ message: "Failed to create swap request.", error: error.message });
	}
};

export const getMySwapRequests = async (req, res) => {
	try {
		const outgoing = await populateSwapRequest(SwapRequest.find({ requester: req.user.id }).sort({ createdAt: -1 }));
		const incoming = await populateSwapRequest(SwapRequest.find({ targetUser: req.user.id }).sort({ createdAt: -1 }));

		return res.json({ outgoing, incoming });
	} catch (error) {
		return res.status(500).json({ message: "Failed to fetch swap requests.", error: error.message });
	}
};

export const acceptSwapRequest = async (req, res) => {
	try {
		const request = await SwapRequest.findById(req.params.id);

		if (!request) {
			return res.status(404).json({ message: "Swap request not found." });
		}

		if (request.targetUser.toString() !== req.user.id) {
			return res.status(403).json({ message: "Only the target user can accept this request." });
		}

		if (request.status !== "pending") {
			return res.status(400).json({ message: "Only pending requests can be accepted." });
		}

		const result = await executeRequestSwap(request._id);

		if (!result.ok) {
			return res.status(result.status).json({ message: result.message });
		}

		await emitAvailableRoomsCount();
		emitUserNotification(request.requester.toString(), {
			type: "swap-request-accepted",
			message: "Your swap request was accepted.",
			requestId: request._id.toString(),
		});
		emitUserNotification(request.targetUser.toString(), {
			type: "swap-request-accepted-confirmation",
			message: "You accepted the swap request successfully.",
			requestId: request._id.toString(),
		});

		return res.json({ message: result.message });
	} catch (error) {
		return res.status(500).json({ message: "Failed to accept swap request.", error: error.message });
	}
};

export const rejectSwapRequest = async (req, res) => {
	try {
		const request = await SwapRequest.findById(req.params.id);

		if (!request) {
			return res.status(404).json({ message: "Swap request not found." });
		}

		if (request.targetUser.toString() !== req.user.id) {
			return res.status(403).json({ message: "Only the target user can reject this request." });
		}

		if (request.status !== "pending") {
			return res.status(400).json({ message: "Only pending requests can be rejected." });
		}

		request.status = "rejected";
		await request.save();
		emitUserNotification(request.requester.toString(), {
			type: "swap-request-rejected",
			message: "Your swap request was rejected.",
			requestId: request._id.toString(),
		});

		return res.json({ message: "Swap request rejected successfully." });
	} catch (error) {
		return res.status(500).json({ message: "Failed to reject swap request.", error: error.message });
	}
};

export const cancelSwapRequest = async (req, res) => {
	try {
		const request = await SwapRequest.findById(req.params.id);

		if (!request) {
			return res.status(404).json({ message: "Swap request not found." });
		}

		if (request.requester.toString() !== req.user.id) {
			return res.status(403).json({ message: "Only the requester can cancel this request." });
		}

		if (request.status !== "pending") {
			return res.status(400).json({ message: "Only pending requests can be cancelled." });
		}

		request.status = "cancelled";
		await request.save();
		emitUserNotification(request.targetUser.toString(), {
			type: "swap-request-cancelled",
			message: "A swap request was cancelled by the requester.",
			requestId: request._id.toString(),
		});

		return res.json({ message: "Swap request cancelled successfully." });
	} catch (error) {
		return res.status(500).json({ message: "Failed to cancel swap request.", error: error.message });
	}
};

export const getPendingCycles = async (req, res) => {
	try {
		const cycles = await getPendingCycleSuggestions();
		return res.json({ cycles });
	} catch (error) {
		return res.status(500).json({ message: "Failed to detect cycles.", error: error.message });
	}
};

export const executeCycleSwapController = async (req, res) => {
	try {
		const { requestIds } = req.body;

		if (!Array.isArray(requestIds) || requestIds.length < 2) {
			return res.status(400).json({ message: "At least two request IDs are required to execute a cycle." });
		}

		const result = await executeCycleSwap(requestIds);

		if (!result.ok) {
			return res.status(result.status).json({ message: result.message });
		}

		await emitAvailableRoomsCount();

		return res.json({ message: result.message, requestIds: result.requestIds });
	} catch (error) {
		return res.status(500).json({ message: "Failed to execute cycle swap.", error: error.message });
	}
};

export const getSuggestedSwapsForUser = async (req, res) => {
	try {
		const User = (await import("../models/User.js")).default;
		const currentUser = await User.findById(req.user.id);
		if (!currentUser) return res.status(404).json({ message: "User not found." });

		const allUsers = await User.find({ isVerified: true });
		const pendingCycles = await getPendingCycleSuggestions();

		const suggestions = [];

		for (const cycle of pendingCycles) {
			const userIndex = cycle.users.findIndex((u) => u._id.toString() === req.user.id);
			if (userIndex !== -1) {
				const mappings = cycle.users.map((u, i) => {
					const nextIndex = (i + 1) % cycle.users.length;
					return {
						user: { id: u._id, name: u.name, email: u.email },
						currentRoom: cycle.rooms[i]?.requesterRoom?.roomNumber || u.currentRoom || "A101",
						newRoom: cycle.rooms[nextIndex]?.requesterRoom?.roomNumber || cycle.users[nextIndex]?.currentRoom || "A101",
					};
				});

				const myNewRoom = mappings[(userIndex + 1) % cycle.users.length].currentRoom;

				suggestions.push({
					id: cycle.requestIds.join("-"),
					usersCount: cycle.users.length,
					roomToReceive: myNewRoom,
					mappings,
					requestIds: cycle.requestIds,
				});
			}
		}

		const otherUsers = allUsers.filter((u) => u._id.toString() !== req.user.id);
		for (const other of otherUsers) {
			const existsInCycle = suggestions.some((s) => s.usersCount === 2 && s.mappings.some((m) => m.user.id.toString() === other._id.toString()));
			if (!existsInCycle) {
				const myRoom = currentUser.currentRoom || currentUser.allotedRoom || "A101";
				const otherRoom = other.currentRoom || other.allotedRoom || "B204";

				suggestions.push({
					id: `direct-${currentUser._id}-${other._id}`,
					usersCount: 2,
					roomToReceive: otherRoom,
					mappings: [
						{ user: { id: currentUser._id, name: currentUser.name, email: currentUser.email }, currentRoom: myRoom, newRoom: otherRoom },
						{ user: { id: other._id, name: other.name, email: other.email }, currentRoom: otherRoom, newRoom: myRoom },
					],
					requestIds: [],
				});
			}
		}

		suggestions.sort((a, b) => b.usersCount - a.usersCount);

		if (suggestions.length === 0 && currentUser.email) {
			const { sendNoRoomsNotificationEmail } = await import("../services/emailService.js");
			sendNoRoomsNotificationEmail(currentUser.email, currentUser.name);
		}

		return res.json({ suggestions });
	} catch (error) {
		return res.status(500).json({ message: "Failed to fetch swap suggestions.", error: error.message });
	}
};
