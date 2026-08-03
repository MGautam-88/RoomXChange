import bcrypt from "bcryptjs";
import Otp from "../models/Otp.js";
import { sendOtpEmail } from "./emailService.js";

const OTP_EXPIRY_MINUTES = 10;

const generateOtpCode = () => {
  return String(Math.floor(100000 + Math.random() * 900000));
};

export const createAndSendOtp = async (email, purpose) => {
  const normalizedEmail = email.trim().toLowerCase();
  const otp = generateOtpCode();
  const otpHash = await bcrypt.hash(otp, 10);
  const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);

  await Otp.deleteMany({ email: normalizedEmail, purpose });

  await Otp.create({
    email: normalizedEmail,
    otpHash,
    purpose,
    expiresAt,
  });

  await sendOtpEmail(normalizedEmail, otp, purpose);

  return { message: "OTP created and sent." };
};

export const verifyOtp = async (email, purpose, otp) => {
  const normalizedEmail = email.trim().toLowerCase();

  const otpRecord = await Otp.findOne({ email: normalizedEmail, purpose }).sort({ createdAt: -1 });

  if (!otpRecord) {
    return { valid: false, reason: "OTP not found or expired." };
  }

  const isMatch = await bcrypt.compare(String(otp), otpRecord.otpHash);

  if (!isMatch) {
    return { valid: false, reason: "Invalid OTP." };
  }

  await Otp.deleteMany({ email: normalizedEmail, purpose });

  return { valid: true };
};