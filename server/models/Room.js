import mongoose from "mongoose";

const roomSchema = new mongoose.Schema(
	{
		owner: {
			type: mongoose.Schema.Types.ObjectId,
			ref: "User",
			required: true,
			index: true,
		},
		block: { type: String, trim: true, default: "" },
		roomNumber: { type: String, required: true, trim: true },
		floor: { type: String, required: true, trim: true },
		status: {
			type: String,
			enum: ["available", "pending-swap", "swapped"],
			default: "available",
			index: true,
		},
	},
	{ timestamps: true }
);

const Room = mongoose.model("Room", roomSchema);

export default Room;
