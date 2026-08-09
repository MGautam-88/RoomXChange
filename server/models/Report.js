import mongoose from "mongoose";

const reportSchema = new mongoose.Schema(
	{
		reporterName: { type: String, required: true, trim: true },
		reporterEmail: { type: String, required: true, lowercase: true, trim: true },
		issueType: {
			type: String,
			enum: ["alloted_room_conflict", "current_room_conflict", "both_room_conflict", "general"],
			required: true,
			default: "alloted_room_conflict",
		},
		allotedRoom: { type: String, trim: true, uppercase: true },
		currentRoom: { type: String, trim: true, uppercase: true },
		message: { type: String, required: true, trim: true },
		status: {
			type: String,
			enum: ["pending", "investigating", "resolved", "dismissed"],
			default: "pending",
		},
		adminNotes: { type: String, trim: true, default: "" },
	},
	{ timestamps: true }
);

const Report = mongoose.model("Report", reportSchema);
export default Report;
