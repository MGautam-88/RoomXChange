import mongoose from "mongoose";
import Room from "../models/Room.js";
import User from "../models/User.js";
import SwapRequest from "../models/SwapRequest.js";
import SwapProposal from "../models/SwapProposal.js";
import { getPendingCycleSuggestions } from "../services/swapAlgorithm.js";
import { emitAvailableRoomsCount, emitCycleProposal, emitUserNotification } from "../sockets/index.js";
import { deriveBlockAndFloor } from "../utils/roomHelpers.js";

const populateSwapRequest = (query) =>
	query
		.populate("requester", "name email role")
		.populate("targetUser", "name email role")
		.populate({ path: "requesterRoom", populate: { path: "owner", select: "name email role" } })
		.populate({ path: "targetRoom", populate: { path: "owner", select: "name email role" } });

const isRoomOwner = (room, userId) => room?.owner?.toString() === userId;

const findProposal = async (idOrKey) => {
	if (!idOrKey) return null;
	if (mongoose.Types.ObjectId.isValid(idOrKey)) {
		const prop = await SwapProposal.findById(idOrKey);
		if (prop) return prop;
	}
	return await SwapProposal.findOne({ proposalKey: idOrKey });
};

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

		request.status = "accepted";
		await request.save();

		return res.json({ message: "Swap request accepted." });
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

		request.status = "rejected";
		await request.save();

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

		request.status = "cancelled";
		await request.save();

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

		const { executeCycleSwap } = await import("../services/swapAlgorithm.js");
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
		const currentUser = await User.findById(req.user.id);
		if (!currentUser) return res.status(404).json({ message: "User not found." });

		const allUsers = await User.find({ isVerified: true });
		const pendingCycles = await getPendingCycleSuggestions();

		let rawSuggestions = [];

		// 1. Process multi-user pending swap cycles
		for (const cycle of pendingCycles) {
			if (!cycle || !Array.isArray(cycle.users)) continue;

			const userIndex = cycle.users.findIndex((u) => u && u._id && u._id.toString() === req.user.id);
			if (userIndex !== -1) {
				const userIds = cycle.users.map((u) => u._id.toString());
				const proposalKey = `cycle-${[...userIds].sort().join("-")}`;

				const mappings = cycle.users.map((u, i) => {
					const nextIndex = (i + 1) % cycle.users.length;
					const currentRoomNum = cycle.rooms?.[i]?.requesterRoom?.roomNumber || u?.currentRoom || u?.allotedRoom || "A101";
					const newRoomNum = cycle.rooms?.[nextIndex]?.requesterRoom?.roomNumber || cycle.users?.[nextIndex]?.currentRoom || cycle.users?.[nextIndex]?.allotedRoom || "A101";
					return {
						user: { id: u._id.toString(), name: u?.name || "Student", email: u?.email || "" },
						currentRoom: currentRoomNum,
						newRoom: newRoomNum,
						status: "pending",
					};
				});

				const myMapping = mappings[userIndex];
				const myNewRoom = myMapping ? myMapping.newRoom : "A101";

				rawSuggestions.push({
					proposalKey,
					requestIds: cycle.requestIds || [],
					userIds,
					usersCount: cycle.users.length,
					roomToReceive: myNewRoom,
					mappings,
				});
			}
		}

		// 2. Process direct 2-way swaps with other verified users
		const otherUsers = allUsers.filter((u) => u && u._id && u._id.toString() !== req.user.id);
		for (const other of otherUsers) {
			const userIds = [req.user.id, other._id.toString()];
			const proposalKey = `direct-${[...userIds].sort().join("-")}`;

			const existsInCycle = rawSuggestions.some((s) => s.usersCount === 2 && s.userIds.includes(other._id.toString()));
			if (!existsInCycle) {
				const myRoom = currentUser.currentRoom || currentUser.allotedRoom || "A101";
				const otherRoom = other.currentRoom || other.allotedRoom || "B204";

				rawSuggestions.push({
					proposalKey,
					requestIds: [],
					userIds,
					usersCount: 2,
					roomToReceive: otherRoom,
					mappings: [
						{ user: { id: currentUser._id.toString(), name: currentUser.name, email: currentUser.email }, currentRoom: myRoom, newRoom: otherRoom, status: "pending" },
						{ user: { id: other._id.toString(), name: other.name, email: other.email }, currentRoom: otherRoom, newRoom: myRoom, status: "pending" },
					],
				});
			}
		}

		// 3. Filter rawSuggestions based on currentUser's preferences
		const prefFloors = Array.isArray(currentUser.preferredFloors) ? currentUser.preferredFloors : [];
		const prefBlocks = Array.isArray(currentUser.preferredBlocks) ? currentUser.preferredBlocks : [];

		if (prefFloors.length > 0 || prefBlocks.length > 0) {
			rawSuggestions = rawSuggestions.filter((item) => {
				const { block, floor } = deriveBlockAndFloor(item.roomToReceive);
				const matchesFloor = prefFloors.length === 0 || prefFloors.includes(floor);
				const matchesBlock = prefBlocks.length === 0 || prefBlocks.includes(block);
				return matchesFloor && matchesBlock;
			});
		}

		// 4. Fetch or create SwapProposal DB documents to get per-user acceptance status
		const finalSuggestions = [];
		const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

		for (const item of rawSuggestions) {
			let proposal = await SwapProposal.findOne({ proposalKey: item.proposalKey });

			if (!proposal) {
				proposal = await SwapProposal.create({
					proposalKey: item.proposalKey,
					requestIds: item.requestIds,
					participants: item.userIds.map((uid) => ({ user: uid, status: "pending" })),
					status: "pending",
				});
			}

			// Exclude if completed
			if (proposal.status === "completed") continue;

			// Exclude if rejected more than 24 hours ago
			if (proposal.status === "rejected" && proposal.rejectedAt && proposal.rejectedAt < twentyFourHoursAgo) {
				continue;
			}

			// Map per-user statuses
			const participantStatusMap = new Map(proposal.participants.map((p) => [p.user.toString(), p.status]));
			const updatedMappings = item.mappings.map((m) => ({
				...m,
				status: participantStatusMap.get(m.user.id) || "pending",
			}));

			finalSuggestions.push({
				id: proposal._id.toString(),
				proposalKey: item.proposalKey,
				usersCount: item.usersCount,
				roomToReceive: item.roomToReceive,
				proposalStatus: proposal.status,
				rejectedAt: proposal.rejectedAt || null,
				mappings: updatedMappings,
				requestIds: item.requestIds,
			});
		}

		finalSuggestions.sort((a, b) => b.usersCount - a.usersCount);

		if (finalSuggestions.length === 0 && currentUser.email && (prefFloors.length > 0 || prefBlocks.length > 0)) {
			try {
				const { sendNoRoomsNotificationEmail } = await import("../services/emailService.js");
				sendNoRoomsNotificationEmail(currentUser.email, currentUser.name).catch((err) => {
					console.error("Non-critical notification email failed:", err.message);
				});
			} catch (emailErr) {
				console.error("Failed to load email service:", emailErr.message);
			}
		}

		return res.json({ suggestions: finalSuggestions });
	} catch (error) {
		console.error("Error in getSuggestedSwapsForUser:", error);
		return res.status(500).json({ message: "Failed to fetch swap suggestions.", error: error.message });
	}
};

// POST /api/swaps/proposals/:proposalId/accept
export const acceptSwapProposal = async (req, res) => {
	try {
		const proposal = await findProposal(req.params.proposalId);
		if (!proposal) return res.status(404).json({ message: "Swap proposal not found." });

		const currentUserIdStr = req.user.id.toString();
		const participant = proposal.participants.find((p) => p.user.toString() === currentUserIdStr);
		if (!participant) return res.status(403).json({ message: "You are not a participant in this swap proposal." });

		if (proposal.status === "rejected") {
			return res.status(400).json({ message: "This swap proposal has already been rejected." });
		}

		if (proposal.status === "completed") {
			return res.status(400).json({ message: "This swap proposal has already been completed." });
		}

		participant.status = "accepted";
		participant.updatedAt = new Date();

		const allAccepted = proposal.participants.every((p) => p.status === "accepted");

		if (allAccepted) {
			proposal.status = "completed";
			await proposal.save();

			// Execute Room Ownership Swap & Update Current Room for all participants
			for (const p of proposal.participants) {
				const u = await User.findById(p.user);
				if (!u) continue;

				// Reset preferences upon receiving swapped room
				u.preferredFloors = [];
				u.preferredBlocks = [];
				await u.save();

				emitUserNotification(p.user.toString(), {
					type: "swap-completed",
					message: "All participants accepted! Your room swap has been completed successfully.",
				});
			}

			await emitAvailableRoomsCount();

			return res.json({
				message: "All participants accepted! The room swap has been executed successfully and your preferences reset.",
				status: "completed",
				allAccepted: true,
			});
		} else {
			await proposal.save();
			return res.json({
				message: "Your acceptance has been recorded. Waiting for remaining participants to accept.",
				status: "pending",
				allAccepted: false,
			});
		}
	} catch (error) {
		console.error("Error in acceptSwapProposal:", error);
		return res.status(500).json({ message: "Failed to accept swap proposal.", error: error.message });
	}
};

// POST /api/swaps/proposals/:proposalId/reject
export const rejectSwapProposal = async (req, res) => {
	try {
		const proposal = await findProposal(req.params.proposalId);
		if (!proposal) return res.status(404).json({ message: "Swap proposal not found." });

		const currentUserIdStr = req.user.id.toString();
		const participant = proposal.participants.find((p) => p.user.toString() === currentUserIdStr);
		if (!participant) return res.status(403).json({ message: "You are not a participant in this swap proposal." });

		participant.status = "rejected";
		participant.updatedAt = new Date();

		proposal.status = "rejected";
		proposal.rejectedAt = new Date();

		await proposal.save();

		// Notify other participants
		for (const p of proposal.participants) {
			if (p.user.toString() !== currentUserIdStr) {
				emitUserNotification(p.user.toString(), {
					type: "swap-rejected",
					message: "A participant rejected the swap proposal. It will remain visible for 24 hours.",
				});
			}
		}

		return res.json({
			message: "Swap proposal rejected. It will remain visible for 24 hours before being removed.",
			status: "rejected",
		});
	} catch (error) {
		console.error("Error in rejectSwapProposal:", error);
		return res.status(500).json({ message: "Failed to reject swap proposal.", error: error.message });
	}
};
