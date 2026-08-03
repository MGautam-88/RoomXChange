import mongoose from "mongoose";
import "../models/User.js";
import Room from "../models/Room.js";
import SwapRequest from "../models/SwapRequest.js";

const toId = (value) => value?.toString();

const populateRequest = (query) =>
	query
		.populate("requester", "name email role")
		.populate("targetUser", "name email role")
		.populate({ path: "requesterRoom", populate: { path: "owner", select: "name email role" } })
		.populate({ path: "targetRoom", populate: { path: "owner", select: "name email role" } });

export const buildSwapGraph = (requests) => {
	const edges = new Map();

	for (const request of requests) {
		edges.set(toId(request.requester), request);
	}

	return edges;
};

export const findCycleFromRequest = (seedRequest, requests) => {
	const graph = buildSwapGraph(requests);
	const visitedUsers = new Set();
	const cycleRequests = [];
	let currentUserId = toId(seedRequest.requester);
	const startUserId = currentUserId;

	while (true) {
		if (visitedUsers.has(currentUserId)) {
			break;
		}

		visitedUsers.add(currentUserId);
		const request = graph.get(currentUserId);

		if (!request) {
			return null;
		}

		cycleRequests.push(request);
		const nextUserId = toId(request.targetUser);

		if (nextUserId === startUserId) {
			return cycleRequests;
		}

		currentUserId = nextUserId;
	}

	return null;
};

export const getPendingCycleSuggestions = async () => {
	const requests = await populateRequest(SwapRequest.find({ status: "pending" }).sort({ createdAt: 1 }));
	const seenCycles = new Set();
	const cycles = [];

	for (const request of requests) {
		const cycle = findCycleFromRequest(request, requests);
		if (!cycle) continue;

		const cycleKey = cycle
			.map((item) => toId(item._id))
			.sort()
			.join("-");

		if (seenCycles.has(cycleKey)) continue;
		seenCycles.add(cycleKey);

		cycles.push({
			requestIds: cycle.map((item) => item._id),
			userIds: cycle.map((item) => item.requester._id),
			users: cycle.map((item) => item.requester),
			rooms: cycle.map((item) => ({
				requesterRoom: item.requesterRoom,
				targetRoom: item.targetRoom,
			})),
		});
	}

	return cycles;
};

export const executeRequestSwap = async (requestId) => {
	const session = await mongoose.startSession();

	try {
		session.startTransaction();

		const request = await SwapRequest.findById(requestId).session(session);

		if (!request) {
			await session.abortTransaction();
			return { ok: false, status: 404, message: "Swap request not found." };
		}

		if (request.status !== "pending") {
			await session.abortTransaction();
			return { ok: false, status: 400, message: "Only pending requests can be accepted." };
		}

		const requesterRoom = await Room.findById(request.requesterRoom).session(session);
		const targetRoom = await Room.findById(request.targetRoom).session(session);

		if (!requesterRoom || !targetRoom) {
			await session.abortTransaction();
			return { ok: false, status: 404, message: "One or more rooms in this swap no longer exist." };
		}

		const originalRequesterOwner = requesterRoom.owner;
		const originalTargetOwner = targetRoom.owner;

		requesterRoom.owner = originalTargetOwner;
		targetRoom.owner = originalRequesterOwner;
		requesterRoom.status = "swapped";
		targetRoom.status = "swapped";
		request.status = "completed";

		await requesterRoom.save({ session });
		await targetRoom.save({ session });
		await request.save({ session });

		await session.commitTransaction();

		return { ok: true, message: "Swap completed successfully.", request, requesterRoom, targetRoom };
	} catch (error) {
		await session.abortTransaction();
		return { ok: false, status: 500, message: error.message };
	} finally {
		session.endSession();
	}
};

export const executeCycleSwap = async (requestIds) => {
	const session = await mongoose.startSession();

	try {
		session.startTransaction();

		const requests = await SwapRequest.find({ _id: { $in: requestIds } }).session(session);

		if (!requests.length || requests.length !== requestIds.length) {
			await session.abortTransaction();
			return { ok: false, status: 404, message: "One or more swap requests were not found." };
		}

		if (requests.some((request) => request.status !== "pending")) {
			await session.abortTransaction();
			return { ok: false, status: 400, message: "All cycle requests must be pending before execution." };
		}

		const cycle = findCycleFromRequest(requests[0], requests);

		if (!cycle || cycle.length !== requests.length) {
			await session.abortTransaction();
			return { ok: false, status: 400, message: "The provided requests do not form a valid cycle." };
		}

		const roomsById = new Map();
		for (const request of cycle) {
			const requesterRoom = await Room.findById(request.requesterRoom).session(session);
			const targetRoom = await Room.findById(request.targetRoom).session(session);

			if (!requesterRoom || !targetRoom) {
				await session.abortTransaction();
				return { ok: false, status: 404, message: "One or more rooms in this cycle no longer exist." };
			}

			roomsById.set(toId(request.requesterRoom), requesterRoom);
			roomsById.set(toId(request.targetRoom), targetRoom);
		}

		const orderedRooms = cycle.map((request) => roomsById.get(toId(request.requesterRoom)));
		const owners = orderedRooms.map((room) => room.owner);
		const rotatedOwners = [...owners.slice(1), owners[0]];

		for (let index = 0; index < orderedRooms.length; index += 1) {
			orderedRooms[index].owner = rotatedOwners[index];
			orderedRooms[index].status = "swapped";
			await orderedRooms[index].save({ session });
		}

		for (const request of cycle) {
			request.status = "completed";
			await request.save({ session });
		}

		await session.commitTransaction();

		return { ok: true, message: "Cycle swap completed successfully.", requestIds: cycle.map((request) => request._id) };
	} catch (error) {
		await session.abortTransaction();
		return { ok: false, status: 500, message: error.message };
	} finally {
		session.endSession();
	}
};
