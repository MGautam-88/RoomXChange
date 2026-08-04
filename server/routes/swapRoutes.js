import express from "express";
import { protect } from "../middleware/auth.js";
import {
	createSwapRequest,
	getMySwapRequests,
	getPendingCycles,
	acceptSwapRequest,
	rejectSwapRequest,
	cancelSwapRequest,
	executeCycleSwapController,
	getSuggestedSwapsForUser,
	acceptSwapProposal,
	rejectSwapProposal,
} from "../controllers/swapController.js";

const router = express.Router();

router.use(protect);

router.post("/", createSwapRequest);
router.get("/mine", getMySwapRequests);
router.get("/cycles", getPendingCycles);
router.get("/suggestions", getSuggestedSwapsForUser);
router.post("/cycles/execute", executeCycleSwapController);
router.post("/proposals/:proposalId/accept", acceptSwapProposal);
router.post("/proposals/:proposalId/reject", rejectSwapProposal);
router.patch("/:id/accept", acceptSwapRequest);
router.patch("/:id/reject", rejectSwapRequest);
router.patch("/:id/cancel", cancelSwapRequest);

export default router;
