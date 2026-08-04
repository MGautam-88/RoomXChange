import express from "express";
import {
	register,
	verifySignupOtp,
	resendOtp,
	sendRegisterOtp,
	resendRegisterOtp,
	registerWithOtp,
	login,
	forgotPassword,
	resetPassword,
	sendResetOtp,
	resendResetOtp,
	resetPasswordWithOtp,
	getMe,
	updatePreferences,
} from "../controllers/authController.js";
import { protect } from "../middleware/auth.js";

const router = express.Router();

router.get("/me", protect, getMe);
router.put("/preferences", protect, updatePreferences);
router.post("/register", register);
router.post("/send-register-otp", sendRegisterOtp);
router.post("/resend-register-otp", resendRegisterOtp);
router.post("/register-with-otp", registerWithOtp);
router.post("/verify-signup-otp", verifySignupOtp);
router.post("/resend-otp", resendOtp);
router.post("/login", login);
router.post("/forgot-password", forgotPassword);
router.post("/send-reset-otp", sendResetOtp);
router.post("/resend-reset-otp", resendResetOtp);
router.post("/reset-password", resetPassword);
router.post("/reset-password-with-otp", resetPasswordWithOtp);

export default router;