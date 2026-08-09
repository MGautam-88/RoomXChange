import mongoose from "mongoose";

const reportSchema = new mongoose.Schema(
	{
		reporterName: { type: String, required: true, trim: true },
		reporterEmail: { type: String, required: true, trim: true, lowercase: true },
		conflictType: {
			type: String,
			enum: ["alloted_room", "current_room", "both_rooms", "general"],
			default: "alloted_room",
		},
		allotedRoom: { type: String, trim: true, uppercase: true, default: "" },
		currentRoom: { type: String, trim: true, uppercase: true, default: "" },
		message: { type: String, required: true, trim: true },
		status: {
			type: String,
			enum: ["pending", "investigating", "resolved", "dismissed"],
			default: "pending",
		},
		adminNotes: { type: String, default: "", trim: true },
	},
	{ timestamps: true }
);

const Report = mongoose.model("Report", reportSchema);
export default Report;
