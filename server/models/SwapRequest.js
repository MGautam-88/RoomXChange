import mongoose from "mongoose";

const swapRequestSchema = new mongoose.Schema(
	{
		requester: {
			type: mongoose.Schema.Types.ObjectId,
			ref: "User",
			required: true,
			index: true,
		},
		requesterRoom: {
			type: mongoose.Schema.Types.ObjectId,
			ref: "Room",
			required: true,
		},
		targetRoom: {
			type: mongoose.Schema.Types.ObjectId,
			ref: "Room",
			required: true,
		},
		targetUser: {
			type: mongoose.Schema.Types.ObjectId,
			ref: "User",
			required: true,
			index: true,
		},
		status: {
			type: String,
			enum: ["pending", "accepted", "rejected", "cancelled", "completed"],
			default: "pending",
			index: true,
		},
	},
	{ timestamps: true }
);

const SwapRequest = mongoose.model("SwapRequest", swapRequestSchema);

export default SwapRequest;
