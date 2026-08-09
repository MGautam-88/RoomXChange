import Report from "../models/Report.js";

// POST /api/reports - Public or Authenticated report submission
export const createReport = async (req, res) => {
	try {
		const { reporterName, reporterEmail, issueType, allotedRoom, currentRoom, message } = req.body;

		if (!reporterName || !reporterEmail || !message) {
			return res.status(400).json({ message: "Name, email, and message description are required to submit a report." });
		}

		const cleanAlloted = allotedRoom ? allotedRoom.trim().toUpperCase() : "";
		const cleanCurrent = currentRoom ? currentRoom.trim().toUpperCase() : "";

		const report = await Report.create({
			reporterName,
			reporterEmail,
			issueType: issueType || "alloted_room_conflict",
			allotedRoom: cleanAlloted,
			currentRoom: cleanCurrent,
			message,
			status: "pending",
		});

		return res.status(201).json({
			message: "Report submitted successfully to Admin and Super Admin.",
			report,
		});
	} catch (error) {
		return res.status(500).json({ message: "Failed to submit report.", error: error.message });
	}
};

// GET /api/reports - Admin and Super Admin view all reports
export const getReports = async (req, res) => {
	try {
		const reports = await Report.find({}).sort({ createdAt: -1 });
		return res.json({ reports });
	} catch (error) {
		return res.status(500).json({ message: "Failed to fetch reports.", error: error.message });
	}
};

// PATCH /api/reports/:id/status - Update report status and optional admin notes
export const updateReportStatus = async (req, res) => {
	try {
		const { status, adminNotes } = req.body;
		const { id } = req.params;

		if (status && !["pending", "investigating", "resolved", "dismissed"].includes(status)) {
			return res.status(400).json({ message: "Invalid status value." });
		}

		const report = await Report.findById(id);
		if (!report) {
			return res.status(404).json({ message: "Report not found." });
		}

		if (status) report.status = status;
		if (adminNotes !== undefined) report.adminNotes = adminNotes;

		await report.save();

		return res.json({ message: "Report status updated successfully.", report });
	} catch (error) {
		return res.status(500).json({ message: "Failed to update report.", error: error.message });
	}
};

// DELETE /api/reports/:id - Delete a report
export const deleteReport = async (req, res) => {
	try {
		const { id } = req.params;
		const report = await Report.findById(id);
		if (!report) {
			return res.status(404).json({ message: "Report not found." });
		}

		await report.deleteOne();
		return res.json({ message: "Report deleted successfully." });
	} catch (error) {
		return res.status(500).json({ message: "Failed to delete report.", error: error.message });
	}
};
