import bcrypt from "bcryptjs";
import User from "../models/User.js";
import Room from "../models/Room.js";
import generateToken from "../utils/generateToken.js";
import { createAndSendOtpToken, resendOtpToken, verifyOtpToken } from "../services/otpService.js";
import { isValidCollegeEmail, normalizeRollNumberOrEmail } from "../utils/validateEmail.js";
import { deriveBlockAndFloor } from "../utils/roomHelpers.js";
import { emitAvailableRoomsCount } from "../sockets/index.js";

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

// Helper function to check if allotted or current room is already registered by another verified user
const checkRoomConflicts = async (cleanAlloted, cleanCurrent, excludeEmail = null) => {
	const query = {
		isVerified: true,
		$or: [
			{ allotedRoom: cleanAlloted },
			{ currentRoom: cleanAlloted },
			{ allotedRoom: cleanCurrent },
			{ currentRoom: cleanCurrent },
		],
	};
	if (excludeEmail) {
		query.email = { $ne: excludeEmail };
	}

	const existingUser = await User.findOne(query);
	if (!existingUser) return null;

	const allotedConflict = existingUser.allotedRoom === cleanAlloted || existingUser.currentRoom === cleanAlloted;
	const currentConflict = existingUser.allotedRoom === cleanCurrent || existingUser.currentRoom === cleanCurrent;

	return {
		existingUser,
		allotedConflict,
		currentConflict,
		allotedRoom: cleanAlloted,
		currentRoom: cleanCurrent,
	};
};

// POST /api/auth/send-register-otp
export const sendRegisterOtp = async (req, res) => {
	try {
		const { name, email, rollNumber, password, allotedRoom, currentRoom } = req.body;
		const rawEmail = normalizeRollNumberOrEmail(email || rollNumber || "");

		if (!name || !rawEmail || !password) {
			return res.status(400).json({ message: "Name, roll number, and password are required." });
		}

		if (!isValidCollegeEmail(rawEmail)) {
			return res.status(400).json({ message: "Please enter a valid roll number for batch 23 (e.g. 23bcs001; allowed branches: cse, ece, me, sm)." });
		}

		const cleanAlloted = (allotedRoom || "A101").trim().toUpperCase();
		if (!/^[A-F][1-4](0[1-9]|1[0-9]|2[0-5])$/.test(cleanAlloted)) {
			return res.status(400).json({
				message: "Alloted room format must be 1 letter (A-F), 1 floor digit (1-4), and 2 room digits from 01 to 25 (e.g. A101 to F425).",
			});
		}

		let cleanCurrent = currentRoom ? currentRoom.trim().toUpperCase() : cleanAlloted;
		if (!/^[A-F][1-4](0[1-9]|1[0-9]|2[0-5])$/.test(cleanCurrent)) {
			cleanCurrent = cleanAlloted;
		}

		const existingUser = await User.findOne({ email: rawEmail });
		if (existingUser && existingUser.isVerified) {
			return res.status(409).json({ message: "This roll number / email is already registered." });
		}

		// Check for duplicate room registration across existing verified users
		const conflict = await checkRoomConflicts(cleanAlloted, cleanCurrent, rawEmail);
		if (conflict) {
			return res.status(409).json({
				message: "The entered room code(s) are already claimed by another registered student.",
				roomConflict: true,
				allotedConflict: conflict.allotedConflict,
				currentConflict: conflict.currentConflict,
				allotedRoom: cleanAlloted,
				currentRoom: cleanCurrent,
			});
		}

		const result = await createAndSendOtpToken(rawEmail, "signup");
		return res.json(result);
	} catch (error) {
		return res.status(500).json({ message: "Failed to send registration OTP.", error: error.message });
	}
};

// POST /api/auth/resend-register-otp
export const resendRegisterOtp = async (req, res) => {
	try {
		const { otpToken } = req.body;
		const result = await resendOtpToken(otpToken, "signup");
		return res.json(result);
	} catch (error) {
		return res.status(400).json({ message: error.message });
	}
};

// POST /api/auth/register-with-otp
export const registerWithOtp = async (req, res) => {
	try {
		const { otpToken, otp, name, email, rollNumber, password, allotedRoom, currentRoom, preferredFloors, preferredBlocks } = req.body;
		const rawEmail = normalizeRollNumberOrEmail(email || rollNumber || "");

		const verification = await verifyOtpToken(otpToken, rawEmail, "signup", otp);
		if (!verification.valid) {
			return res.status(400).json({ message: verification.reason });
		}

		const cleanAlloted = (allotedRoom || "A101").trim().toUpperCase();
		let cleanCurrent = currentRoom ? currentRoom.trim().toUpperCase() : cleanAlloted;
		if (!/^[A-F][1-4](0[1-9]|1[0-9]|2[0-5])$/.test(cleanCurrent)) {
			cleanCurrent = cleanAlloted;
		}

		// Re-verify room conflicts before completing registration
		const conflict = await checkRoomConflicts(cleanAlloted, cleanCurrent, rawEmail);
		if (conflict) {
			return res.status(409).json({
				message: "The entered room code(s) are already claimed by another registered student.",
				roomConflict: true,
				allotedConflict: conflict.allotedConflict,
				currentConflict: conflict.currentConflict,
				allotedRoom: cleanAlloted,
				currentRoom: cleanCurrent,
			});
		}

		const { block, floor } = deriveBlockAndFloor(cleanCurrent);
		const hashedPassword = await bcrypt.hash(password, 10);

		let user = await User.findOne({ email: rawEmail });
		if (user && user.isVerified) {
			return res.status(409).json({ message: "Account already registered." });
		}

		if (user) {
			user.name = name;
			user.password = hashedPassword;
			user.allotedRoom = cleanAlloted;
			user.currentRoom = cleanCurrent;
			user.block = block;
			user.floor = floor;
			user.isVerified = true;
			if (Array.isArray(preferredFloors)) user.preferredFloors = preferredFloors;
			if (Array.isArray(preferredBlocks)) user.preferredBlocks = preferredBlocks;
			await user.save();
		} else {
			user = await User.create({
				name,
				email: rawEmail,
				password: hashedPassword,
				allotedRoom: cleanAlloted,
				currentRoom: cleanCurrent,
				block,
				floor,
				isVerified: true,
				preferredFloors: Array.isArray(preferredFloors) ? preferredFloors : [],
				preferredBlocks: Array.isArray(preferredBlocks) ? preferredBlocks : [],
			});
		}

		// Upsert Room document for user room swap listing
		await Room.findOneAndUpdate(
			{ owner: user._id },
			{ owner: user._id, block, roomNumber: cleanCurrent, floor, status: "available" },
			{ upsert: true, new: true }
		);

		await emitAvailableRoomsCount();

		const token = generateToken(user._id, user.role);

		return res.status(201).json({
			message: "Registration completed successfully.",
			token,
			user: makeUserPayload(user),
		});
	} catch (error) {
		return res.status(500).json({ message: "Registration failed.", error: error.message });
	}
};

// Legacy aliases
export const register = sendRegisterOtp;
export const verifySignupOtp = registerWithOtp;
export const resendOtp = resendRegisterOtp;

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
		const user = await User.findById(req.user.id);
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
			if (!/^[A-F][1-4](0[1-9]|1[0-9]|2[0-5])$/.test(cleanAlloted)) {
				return res.status(400).json({
					message: "Alloted room format must be 1 letter (A-F), 1 floor digit (1-4), and 2 room digits from 01 to 25 (e.g. A101 to F425).",
				});
			}
			user.allotedRoom = cleanAlloted;
		}

		if (currentRoom) {
			const cleanCurrent = currentRoom.trim().toUpperCase();
			if (!/^[A-F][1-4](0[1-9]|1[0-9]|2[0-5])$/.test(cleanCurrent)) {
				return res.status(400).json({
					message: "Current room format must be 1 letter (A-F), 1 floor digit (1-4), and 2 room digits from 01 to 25 (e.g. A101 to F425).",
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

// POST /api/auth/send-reset-otp
export const sendResetOtp = async (req, res) => {
	try {
		const { email, rollNumber } = req.body;
		const rawEmail = normalizeRollNumberOrEmail(email || rollNumber || "");
		const user = await User.findOne({ email: rawEmail });
		if (!user) return res.status(404).json({ message: "No account registered with that roll number." });

		const result = await createAndSendOtpToken(rawEmail, "reset-password");
		return res.json(result);
	} catch (error) {
		return res.status(500).json({ message: "Failed to send reset OTP.", error: error.message });
	}
};

// POST /api/auth/resend-reset-otp
export const resendResetOtp = async (req, res) => {
	try {
		const { otpToken } = req.body;
		const result = await resendOtpToken(otpToken, "reset-password");
		return res.json(result);
	} catch (error) {
		return res.status(400).json({ message: error.message });
	}
};

// POST /api/auth/reset-password-with-otp
export const resetPasswordWithOtp = async (req, res) => {
	try {
		const { otpToken, otp, email, rollNumber, newPassword } = req.body;
		const rawEmail = normalizeRollNumberOrEmail(email || rollNumber || "");

		const verification = await verifyOtpToken(otpToken, rawEmail, "reset-password", otp);
		if (!verification.valid) {
			return res.status(400).json({ message: verification.reason });
		}

		if (!newPassword || newPassword.length < 6) {
			return res.status(400).json({ message: "New password must be at least 6 characters." });
		}

		const hashedPassword = await bcrypt.hash(newPassword, 10);
		await User.findOneAndUpdate({ email: rawEmail }, { password: hashedPassword });

		return res.json({ message: "Password reset successfully. You can now login with your new password." });
	} catch (error) {
		return res.status(500).json({ message: "Failed to reset password.", error: error.message });
	}
};

export const forgotPassword = sendResetOtp;
export const resetPassword = resetPasswordWithOtp;