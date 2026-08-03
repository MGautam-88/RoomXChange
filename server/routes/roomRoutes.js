import express from "express";
import { protect } from "../middleware/auth.js";
import {
	createRoom,
	getRooms,
	getMyRooms,
	getRoomById,
	updateRoom,
	deleteRoom,
} from "../controllers/roomController.js";

const router = express.Router();

router.use(protect);

router.post("/", createRoom);
router.get("/", getRooms);
router.get("/mine", getMyRooms);
router.get("/:id", getRoomById);
router.put("/:id", updateRoom);
router.delete("/:id", deleteRoom);

export default router;
