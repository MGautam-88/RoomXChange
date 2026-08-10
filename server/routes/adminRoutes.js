import express from "express";
import { protect, authorize } from "../middleware/auth.js";
import {
	getAllUsers,
	getAllRooms,
	getAllSwapRequests,
	updateUserRole,
	removeAdmin,
	deleteUser,
	getAnalytics,
} from "../controllers/adminController.js";

const router = express.Router();

router.use(protect, authorize("admin", "superadmin"));

router.get("/users", getAllUsers);
router.get("/rooms", getAllRooms);
router.get("/swaps", getAllSwapRequests);
router.get("/analytics", getAnalytics);
router.patch("/users/:id/role", authorize("superadmin"), updateUserRole);
router.delete("/admins/:id", authorize("superadmin"), removeAdmin);
router.delete("/users/:id", authorize("superadmin"), deleteUser);

export default router;
