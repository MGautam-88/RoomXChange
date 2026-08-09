import express from "express";
import { protect } from "../middleware/auth.js";
import {
	createRoom,
	getRooms,
	getMyRooms,
	getRoomById,
	updateRoom,
	deleteRoom,
	getAvailableRoomsCount,
} from "../controllers/roomController.js";

const router = express.Router();

// Public route for room count
router.get("/count", getAvailableRoomsCount);

router.use(protect);

router.post("/", createRoom);
router.get("/", getRooms);
router.get("/mine", getMyRooms);
router.get("/:id", getRoomById);
router.put("/:id", updateRoom);
router.delete("/:id", deleteRoom);

export default router;

