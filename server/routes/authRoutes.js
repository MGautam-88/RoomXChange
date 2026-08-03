import express from "express";
import {
  register,
  verifySignupOtp,
  resendOtp,
  login,
  forgotPassword,
  resetPassword,
  getMe,
  updatePreferences,
} from "../controllers/authController.js";
import { protect } from "../middleware/auth.js";

const router = express.Router();

router.get("/me", protect, getMe);
router.put("/preferences", protect, updatePreferences);
router.post("/register", register);
router.post("/verify-signup-otp", verifySignupOtp);
router.post("/resend-otp", resendOtp);
router.post("/login", login);
router.post("/forgot-password", forgotPassword);
router.post("/reset-password", resetPassword);

export default router;