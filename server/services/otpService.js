import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { sendOtpEmail } from "./emailService.js";

const OTP_EXPIRY_MINUTES = 15;
const RESEND_COOLDOWN_MS = 60 * 1000; // 60 seconds
const MAX_RESEND_COUNT = 3;

export const generateFourDigitOtp = () => {
	return String(Math.floor(1000 + Math.random() * 9000));
};

export const createAndSendOtpToken = async (email, purpose) => {
	const normalizedEmail = email.trim().toLowerCase();
	const otp = generateFourDigitOtp();
	const otpHash = await bcrypt.hash(otp, 10);
	const now = Date.now();
	const expiresAt = now + OTP_EXPIRY_MINUTES * 60 * 1000;

	const payload = {
		email: normalizedEmail,
		purpose,
		otpHash,
		expiresAt,
		lastSentAt: now,
		resendCount: 0,
	};

	const otpToken = jwt.sign(payload, process.env.JWT_SECRET || "roomxchange-super-secret-key-2026", {
		expiresIn: `${OTP_EXPIRY_MINUTES}m`,
	});

	await sendOtpEmail(normalizedEmail, otp, purpose);

	return {
		otpToken,
		expiresAt,
		resendCount: 0,
		maxResends: MAX_RESEND_COUNT,
		cooldownSeconds: 60,
		message: `An OTP has been sent to ${normalizedEmail} (valid for 15 mins; please also check your spam folder).`,
	};
};

export const resendOtpToken = async (otpToken, purpose) => {
	if (!otpToken) {
		throw new Error("OTP session expired or invalid. Please restart the process.");
	}

	let decoded;
	try {
		decoded = jwt.verify(otpToken, process.env.JWT_SECRET || "roomxchange-super-secret-key-2026");
	} catch {
		throw new Error("OTP session expired or invalid. Please restart the process.");
	}

	if (decoded.purpose !== purpose) {
		throw new Error("Invalid OTP session context. Please restart the process.");
	}

	const now = Date.now();
	if (now > decoded.expiresAt) {
		throw new Error("OTP session expired (15 minutes limit). Please restart the process.");
	}

	if (decoded.resendCount >= MAX_RESEND_COUNT) {
		throw new Error("You have reached the maximum limit of 3 OTP resends. Please restart the process from scratch.");
	}

	const timeElapsed = now - decoded.lastSentAt;
	if (timeElapsed < RESEND_COOLDOWN_MS) {
		const remainingSecs = Math.ceil((RESEND_COOLDOWN_MS - timeElapsed) / 1000);
		throw new Error(`Please wait ${remainingSecs} seconds before requesting another OTP.`);
	}

	const newOtp = generateFourDigitOtp();
	const newOtpHash = await bcrypt.hash(newOtp, 10);
	const nextResendCount = decoded.resendCount + 1;

	const payload = {
		email: decoded.email,
		purpose,
		otpHash: newOtpHash,
		expiresAt: decoded.expiresAt,
		lastSentAt: now,
		resendCount: nextResendCount,
	};

	const newOtpToken = jwt.sign(payload, process.env.JWT_SECRET || "roomxchange-super-secret-key-2026", {
		expiresIn: "15m",
	});

	await sendOtpEmail(decoded.email, newOtp, purpose);

	return {
		otpToken: newOtpToken,
		expiresAt: decoded.expiresAt,
		resendCount: nextResendCount,
		maxResends: MAX_RESEND_COUNT,
		cooldownSeconds: 60,
		message: `New 4-digit OTP sent (${nextResendCount}/${MAX_RESEND_COUNT} resends used).`,
	};
};

export const verifyOtpToken = async (otpToken, email, purpose, inputOtp) => {
	if (!otpToken) {
		return { valid: false, reason: "OTP token missing. Please request a new OTP." };
	}

	let decoded;
	try {
		decoded = jwt.verify(otpToken, process.env.JWT_SECRET || "roomxchange-super-secret-key-2026");
	} catch {
		return { valid: false, reason: "OTP expired or invalid. Please request a new OTP." };
	}

	const normalizedEmail = email.trim().toLowerCase();
	if (decoded.email !== normalizedEmail || decoded.purpose !== purpose) {
		return { valid: false, reason: "OTP session does not match this request." };
	}

	if (Date.now() > decoded.expiresAt) {
		return { valid: false, reason: "OTP has expired (15 minutes limit). Please request a new OTP." };
	}

	const isMatch = await bcrypt.compare(String(inputOtp).trim(), decoded.otpHash);
	if (!isMatch) {
		return { valid: false, reason: "Invalid 4-digit OTP entered." };
	}

	return { valid: true, email: normalizedEmail };
};