import mongoose from "mongoose";

const otpSchema = new mongoose.Schema({
  email: { type: String, required: true, lowercase: true, trim: true },
  otpHash: { type: String, required: true },
  purpose: {
    type: String,
    enum: ["signup", "reset-password"],
    required: true,
  },
  expiresAt: { type: Date, required: true },
  createdAt: { type: Date, default: Date.now },
});

// Auto-delete expired OTP documents
otpSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const Otp = mongoose.model("Otp", otpSchema);
export default Otp;