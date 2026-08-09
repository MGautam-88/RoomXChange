import express from "express";
import { protect, authorize } from "../middleware/auth.js";
import {
	createPublicReport,
	getAllReports,
	updateReportStatus,
} from "../controllers/reportController.js";

const router = express.Router();

// Public report route (accessible during registration conflict)
router.post("/public", createPublicReport);

// Protected routes for Admin & Super Admin
router.use(protect, authorize("admin", "superadmin"));
router.get("/", getAllReports);
router.patch("/:id/status", updateReportStatus);

export default router;
