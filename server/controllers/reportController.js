import Report from "../models/Report.js";

// POST /api/reports/public (unauthenticated, for registration conflicts & general reporting)
export const createPublicReport = async (req, res) => {
	try {
		const { reporterName, reporterEmail, conflictType, allotedRoom, currentRoom, message } = req.body;

		if (!reporterName || !reporterEmail || !message) {
			return res.status(400).json({ message: "Reporter name, email, and message are required." });
		}

		const report = await Report.create({
			reporterName: reporterName.trim(),
			reporterEmail: reporterEmail.trim().toLowerCase(),
			conflictType: conflictType || "general",
			allotedRoom: (allotedRoom || "").trim().toUpperCase(),
			currentRoom: (currentRoom || "").trim().toUpperCase(),
			message: message.trim(),
			status: "pending",
		});

		return res.status(201).json({
			message: "Report submitted successfully. The admin team has been notified and will review your claim.",
			report,
		});
	} catch (error) {
		return res.status(500).json({ message: "Failed to submit report.", error: error.message });
	}
};

// GET /api/reports (Admin / Super Admin only)
export const getAllReports = async (req, res) => {
	try {
		const { status } = req.query;
		const query = status ? { status } : {};
		const reports = await Report.find(query).sort({ createdAt: -1 });

		return res.json({ reports });
	} catch (error) {
		return res.status(500).json({ message: "Failed to fetch reports.", error: error.message });
	}
};

// PATCH /api/reports/:id/status (Admin / Super Admin only)
export const updateReportStatus = async (req, res) => {
	try {
		const { id } = req.params;
		const { status, adminNotes } = req.body;

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

		return res.json({
			message: "Report status updated successfully.",
			report,
		});
	} catch (error) {
		return res.status(500).json({ message: "Failed to update report status.", error: error.message });
	}
};
