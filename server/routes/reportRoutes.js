import express from "express";
import { protect, authorize } from "../middleware/auth.js";
import {
	createReport,
	getReports,
	updateReportStatus,
	deleteReport,
} from "../controllers/reportController.js";

const router = express.Router();

// Public endpoint for reporting room conflict during signup or general user reporting
router.post("/", createReport);

// Protected endpoints for Admin & Super Admin
router.get("/", protect, authorize("admin", "superadmin"), getReports);
router.patch("/:id/status", protect, authorize("admin", "superadmin"), updateReportStatus);
router.delete("/:id", protect, authorize("admin", "superadmin"), deleteReport);

export default router;
