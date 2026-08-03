import bcrypt from "bcryptjs";
import User from "../models/User.js";
import generateToken from "../utils/generateToken.js";
import { createAndSendOtp, verifyOtp } from "../services/otpService.js";
import { isValidCollegeEmail, getAllowedDomain, normalizeRollNumberOrEmail } from "../utils/validateEmail.js";
import { deriveBlockAndFloor } from "../utils/roomHelpers.js";

// Helper to construct user payload for responses
const makeUserPayload = (user) => {
  const { block, floor } = deriveBlockAndFloor(user.currentRoom || user.allotedRoom || "A101");
  return {
    id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
    allotedRoom: user.allotedRoom || "A101",
    currentRoom: user.currentRoom || user.allotedRoom || "A101",
    block: user.block || block,
    floor: user.floor || floor,
    preferredFloors: user.preferredFloors || [],
    preferredBlocks: user.preferredBlocks || [],
  };
};

// POST /api/auth/register
export const register = async (req, res) => {
  try {
    const { name, email, rollNumber, password, allotedRoom, currentRoom, preferredFloors, preferredBlocks } = req.body;
    const rawEmail = normalizeRollNumberOrEmail(email || rollNumber || "");
    if (!name || !rawEmail || !password) {
      return res.status(400).json({ message: "All fields are required." });
    }

    if (!isValidCollegeEmail(rawEmail)) {
      return res.status(400).json({
        message: `Please use a valid roll number (e.g. 23bcs501).`,
      });
    }

    const cleanAlloted = (allotedRoom || "A101").trim().toUpperCase();
    if (!/^[A-F][0-9]{3}$/.test(cleanAlloted)) {
      return res.status(400).json({
        message: "Alloted room must start with a letter from A-F followed by 3 digits (e.g. A101).",
      });
    }

    let cleanCurrent = currentRoom ? currentRoom.trim().toUpperCase() : cleanAlloted;
    if (!/^[A-F][0-9]{3}$/.test(cleanCurrent)) {
      cleanCurrent = cleanAlloted;
    }

    const { block, floor } = deriveBlockAndFloor(cleanCurrent);

    const existing = await User.findOne({ email: rawEmail });
    if (existing && existing.isVerified) {
      return res.status(409).json({ message: "Roll number / email already registered." });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    if (existing && !existing.isVerified) {
      existing.name = name;
      existing.password = hashedPassword;
      existing.allotedRoom = cleanAlloted;
      existing.currentRoom = cleanCurrent;
      existing.block = block;
      existing.floor = floor;
      if (Array.isArray(preferredFloors)) existing.preferredFloors = preferredFloors;
      if (Array.isArray(preferredBlocks)) existing.preferredBlocks = preferredBlocks;
      await existing.save();
    } else {
      await User.create({
        name,
        email: rawEmail,
        password: hashedPassword,
        allotedRoom: cleanAlloted,
        currentRoom: cleanCurrent,
        block,
        floor,
        preferredFloors: Array.isArray(preferredFloors) ? preferredFloors : [],
        preferredBlocks: Array.isArray(preferredBlocks) ? preferredBlocks : [],
      });
    }

    await createAndSendOtp(rawEmail, "signup");
    res.status(201).json({ message: "OTP sent to your college email. Please verify to complete registration." });
  } catch (error) {
    res.status(500).json({ message: "Registration failed.", error: error.message });
  }
};

// POST /api/auth/verify-signup-otp
export const verifySignupOtp = async (req, res) => {
  try {
    const { email, rollNumber, otp } = req.body;
    const rawEmail = normalizeRollNumberOrEmail(email || rollNumber || "");
    const result = await verifyOtp(rawEmail, "signup", otp);
    if (!result.valid) return res.status(400).json({ message: result.reason });

    const user = await User.findOneAndUpdate(
      { email: rawEmail },
      { isVerified: true },
      { new: true }
    );
    if (!user) return res.status(404).json({ message: "User not found." });

    const token = generateToken(user._id, user.role);

    res.json({
      message: "Account verified successfully.",
      token,
      user: makeUserPayload(user),
    });
  } catch (error) {
    res.status(500).json({ message: "Verification failed.", error: error.message });
  }
};

// POST /api/auth/resend-otp
export const resendOtp = async (req, res) => {
  try {
    const { email, rollNumber, purpose } = req.body;
    const rawEmail = normalizeRollNumberOrEmail(email || rollNumber || "");
    await createAndSendOtp(rawEmail, purpose || "signup");
    res.json({ message: "OTP resent successfully." });
  } catch (error) {
    res.status(500).json({ message: "Failed to resend OTP.", error: error.message });
  }
};

// POST /api/auth/login
export const login = async (req, res) => {
  try {
    const { email, rollNumber, password } = req.body;
    const rawEmail = normalizeRollNumberOrEmail(email || rollNumber || "");
    const user = await User.findOne({ email: rawEmail });
    if (!user) return res.status(401).json({ message: "Invalid credentials." });
    if (!user.isVerified) {
      return res.status(403).json({ message: "Please verify your account first." });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(401).json({ message: "Invalid credentials." });

    const token = generateToken(user._id, user.role);

    res.json({
      message: "Login successful.",
      token,
      user: makeUserPayload(user),
    });
  } catch (error) {
    res.status(500).json({ message: "Login failed.", error: error.message });
  }
};

// GET /api/auth/me
export const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("-password");
    if (!user) return res.status(404).json({ message: "User not found." });

    res.json({ user: makeUserPayload(user) });
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch user profile.", error: error.message });
  }
};

// PUT /api/auth/preferences
export const updatePreferences = async (req, res) => {
  try {
    const { allotedRoom, currentRoom, preferredFloors, preferredBlocks } = req.body;
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: "User not found." });

    const floors = Array.isArray(preferredFloors) ? preferredFloors : user.preferredFloors || [];
    const blocks = Array.isArray(preferredBlocks) ? preferredBlocks : user.preferredBlocks || [];

    if (floors.length === 0 && blocks.length === 0) {
      return res.status(400).json({
        message: "You cannot select 'None' for both Floor and Block preferences simultaneously. Please select at least one preferred floor or block.",
      });
    }

    if (allotedRoom) {
      const cleanAlloted = allotedRoom.trim().toUpperCase();
      if (!/^[A-F][0-9]{3}$/.test(cleanAlloted)) {
        return res.status(400).json({
          message: "Alloted room must start with a letter from A-F followed by 3 digits (e.g. A101).",
        });
      }
      user.allotedRoom = cleanAlloted;
    }

    if (currentRoom) {
      const cleanCurrent = currentRoom.trim().toUpperCase();
      if (!/^[A-F][0-9]{3}$/.test(cleanCurrent)) {
        return res.status(400).json({
          message: "Current room must start with a letter from A-F followed by 3 digits (e.g. A101).",
        });
      }
      user.currentRoom = cleanCurrent;
    }

    user.preferredFloors = floors;
    user.preferredBlocks = blocks;

    const activeRoom = user.currentRoom || user.allotedRoom || "A101";
    const { block, floor } = deriveBlockAndFloor(activeRoom);
    user.block = block;
    user.floor = floor;

    await user.save();

    res.json({
      message: "Preferences updated successfully.",
      user: makeUserPayload(user),
    });
  } catch (error) {
    res.status(500).json({ message: "Failed to update preferences.", error: error.message });
  }
};

// POST /api/auth/forgot-password
export const forgotPassword = async (req, res) => {
  try {
    const { email, rollNumber } = req.body;
    const rawEmail = normalizeRollNumberOrEmail(email || rollNumber || "");
    const user = await User.findOne({ email: rawEmail });
    if (!user) return res.status(404).json({ message: "No account with that roll number / email." });

    await createAndSendOtp(rawEmail, "reset-password");
    res.json({ message: "OTP sent to your college email for password reset." });
  } catch (error) {
    res.status(500).json({ message: "Failed to send OTP.", error: error.message });
  }
};

// POST /api/auth/reset-password
export const resetPassword = async (req, res) => {
  try {
    const { email, rollNumber, otp, newPassword } = req.body;
    const rawEmail = normalizeRollNumberOrEmail(email || rollNumber || "");
    const result = await verifyOtp(rawEmail, "reset-password", otp);
    if (!result.valid) return res.status(400).json({ message: result.reason });

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await User.findOneAndUpdate({ email: rawEmail }, { password: hashedPassword });

    res.json({ message: "Password reset successfully." });
  } catch (error) {
    res.status(500).json({ message: "Failed to reset password.", error: error.message });
  }
};