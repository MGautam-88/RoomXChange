import mongoose from "mongoose";

const participantSchema = new mongoose.Schema(
	{
		user: {
			type: mongoose.Schema.Types.ObjectId,
			ref: "User",
			required: true,
		},
		status: {
			type: String,
			enum: ["pending", "accepted", "rejected"],
			default: "pending",
		},
		updatedAt: {
			type: Date,
			default: Date.now,
		},
	},
	{ _id: false }
);

const swapProposalSchema = new mongoose.Schema(
	{
		proposalKey: {
			type: String,
			required: true,
			unique: true,
			index: true,
		},
		requestIds: [
			{
				type: mongoose.Schema.Types.ObjectId,
				ref: "SwapRequest",
			},
		],
		participants: [participantSchema],
		status: {
			type: String,
			enum: ["pending", "accepted", "rejected", "completed"],
			default: "pending",
			index: true,
		},
		rejectedAt: {
			type: Date,
		},
	},
	{ timestamps: true }
);

const SwapProposal = mongoose.model("SwapProposal", swapProposalSchema);

export default SwapProposal;
