import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true },
    role: {
      type: String,
      enum: ["user", "admin", "superadmin"],
      default: "user",
    },
    isVerified: { type: Boolean, default: false },
    allotedRoom: {
      type: String,
      trim: true,
      uppercase: true,
      default: "A101",
      match: [/^[A-F][1-4](0[1-9]|1[0-9]|2[0-5])$/, "Room code format must be 1 letter (A-F), 1 floor digit (1-4), and 2 digits (01-25) e.g. A101"],
    },
    currentRoom: {
      type: String,
      trim: true,
      uppercase: true,
      default: "A101",
      match: [/^[A-F][1-4](0[1-9]|1[0-9]|2[0-5])$/, "Room code format must be 1 letter (A-F), 1 floor digit (1-4), and 2 digits (01-25) e.g. A101"],
    },
    block: { type: String, trim: true, default: "A" },
    floor: { type: String, trim: true, default: "Ground floor (1xx)" },
    preferredFloors: [{ type: String }],
    preferredBlocks: [{ type: String }],
  },
  { timestamps: true }
);

const User = mongoose.model("User", userSchema);
export default User;