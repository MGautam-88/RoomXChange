import dotenv from "dotenv";
import bcrypt from "bcryptjs";
import connectDB from "./config/db.js";
import User from "./models/User.js";
import Room from "./models/Room.js";
import SwapRequest from "./models/SwapRequest.js";
import { deriveBlockAndFloor } from "./utils/roomHelpers.js";

dotenv.config();

const rawUsers = [
  {
    name: "Aarav Kumar",
    email: "23bcs501@iiitdmj.ac.in",
    password: "Pass@1234",
    role: "user",
    isVerified: true,
    allotedRoom: "A101",
    currentRoom: "A101",
    preferredFloors: ["First floor (2xx)", "Second floor (3xx)"],
    preferredBlocks: ["B", "C"],
  },
  {
    name: "Nisha Verma",
    email: "23bec502@iiitdmj.ac.in",
    password: "Pass@1234",
    role: "admin",
    isVerified: true,
    allotedRoom: "B204",
    currentRoom: "B204",
    preferredFloors: ["Second floor (3xx)"],
    preferredBlocks: ["C"],
  },
  {
    name: "Rohit Singh",
    email: "23bme503@iiitdmj.ac.in",
    password: "Pass@1234",
    role: "superadmin",
    isVerified: true,
    allotedRoom: "C309",
    currentRoom: "C309",
    preferredFloors: ["Ground floor (1xx)"],
    preferredBlocks: ["A"],
  },
  {
    name: "Meera Iyer",
    email: "23bcs504@iiitdmj.ac.in",
    password: "Pass@1234",
    role: "user",
    isVerified: false,
    allotedRoom: "D412",
    currentRoom: "D412",
    preferredFloors: [],
    preferredBlocks: [],
  },
  {
    name: "Karan Patel",
    email: "23bcs505@iiitdmj.ac.in",
    password: "Pass@1234",
    role: "user",
    isVerified: true,
    allotedRoom: "E105",
    currentRoom: "E105",
    preferredFloors: ["First floor (2xx)"],
    preferredBlocks: ["F"],
  },
  {
    name: "Ananya Sharma",
    email: "23bec506@iiitdmj.ac.in",
    password: "Pass@1234",
    role: "user",
    isVerified: true,
    allotedRoom: "F206",
    currentRoom: "F206",
    preferredFloors: ["Ground floor (1xx)"],
    preferredBlocks: ["E"],
  },
];

const seedUsers = rawUsers.map((u) => {
  const { block, floor } = deriveBlockAndFloor(u.currentRoom);
  return { ...u, block, floor };
});

const roomSeedData = [
  {
    ownerEmail: "23bcs501@iiitdmj.ac.in",
    block: "A",
    roomNumber: "A101",
    floor: "Ground floor (1xx)",
    status: "available",
  },
  {
    ownerEmail: "23bec502@iiitdmj.ac.in",
    block: "B",
    roomNumber: "B204",
    floor: "First floor (2xx)",
    status: "available",
  },
  {
    ownerEmail: "23bme503@iiitdmj.ac.in",
    block: "C",
    roomNumber: "C309",
    floor: "Second floor (3xx)",
    status: "pending-swap",
  },
  {
    ownerEmail: "23bcs504@iiitdmj.ac.in",
    block: "D",
    roomNumber: "D412",
    floor: "Top floor (4xx)",
    status: "available",
  },
  {
    ownerEmail: "23bcs505@iiitdmj.ac.in",
    block: "E",
    roomNumber: "E105",
    floor: "Ground floor (1xx)",
    status: "available",
  },
  {
    ownerEmail: "23bec506@iiitdmj.ac.in",
    block: "F",
    roomNumber: "F206",
    floor: "First floor (2xx)",
    status: "available",
  },
];

const seedDatabase = async () => {
  await connectDB();

  await Promise.all([
    User.deleteMany({}),
    Room.deleteMany({}),
    SwapRequest.deleteMany({}),
  ]);

  const hashedPassword = await bcrypt.hash("Pass@1234", 10);

  const createdUsers = await User.insertMany(
    seedUsers.map((user) => ({
      ...user,
      password: hashedPassword,
    }))
  );

  const userByEmail = new Map(createdUsers.map((user) => [user.email, user]));

  for (const room of roomSeedData) {
    if (!userByEmail.has(room.ownerEmail)) {
      throw new Error(`No seeded user found for room owner email: ${room.ownerEmail}`);
    }
  }

  await Room.insertMany(
    roomSeedData.map((room) => ({
      owner: userByEmail.get(room.ownerEmail)._id,
      block: room.block,
      roomNumber: room.roomNumber,
      floor: room.floor,
      status: room.status,
    }))
  );

  const seededRooms = await Room.find({});
  const roomByOwnerEmail = new Map();

  for (const room of seededRooms) {
    const owner = createdUsers.find((user) => user._id.toString() === room.owner.toString());
    if (owner) {
      roomByOwnerEmail.set(owner.email, room);
    }
  }

  await SwapRequest.insertMany([
    {
      requester: userByEmail.get("23bcs501@iiitdmj.ac.in")._id,
      requesterRoom: roomByOwnerEmail.get("23bcs501@iiitdmj.ac.in")._id,
      targetRoom: roomByOwnerEmail.get("23bec502@iiitdmj.ac.in")._id,
      targetUser: userByEmail.get("23bec502@iiitdmj.ac.in")._id,
      status: "pending",
    },
    {
      requester: userByEmail.get("23bec502@iiitdmj.ac.in")._id,
      requesterRoom: roomByOwnerEmail.get("23bec502@iiitdmj.ac.in")._id,
      targetRoom: roomByOwnerEmail.get("23bme503@iiitdmj.ac.in")._id,
      targetUser: userByEmail.get("23bme503@iiitdmj.ac.in")._id,
      status: "pending",
    },
    {
      requester: userByEmail.get("23bme503@iiitdmj.ac.in")._id,
      requesterRoom: roomByOwnerEmail.get("23bme503@iiitdmj.ac.in")._id,
      targetRoom: roomByOwnerEmail.get("23bcs501@iiitdmj.ac.in")._id,
      targetUser: userByEmail.get("23bcs501@iiitdmj.ac.in")._id,
      status: "pending",
    },
    {
      requester: userByEmail.get("23bcs505@iiitdmj.ac.in")._id,
      requesterRoom: roomByOwnerEmail.get("23bcs505@iiitdmj.ac.in")._id,
      targetRoom: roomByOwnerEmail.get("23bec506@iiitdmj.ac.in")._id,
      targetUser: userByEmail.get("23bec506@iiitdmj.ac.in")._id,
      status: "pending",
    },
    {
      requester: userByEmail.get("23bec506@iiitdmj.ac.in")._id,
      requesterRoom: roomByOwnerEmail.get("23bec506@iiitdmj.ac.in")._id,
      targetRoom: roomByOwnerEmail.get("23bcs505@iiitdmj.ac.in")._id,
      targetUser: userByEmail.get("23bcs505@iiitdmj.ac.in")._id,
      status: "pending",
    },
  ]);

  console.log("Seed complete.");
  console.log("Users:");
  createdUsers.forEach((user) => {
    console.log(`- ${user.email} | role=${user.role} | roll=${user.email.split("@")[0]} | verified=${user.isVerified}`);
  });
  console.log("Password for all seeded verified users: Pass@1234");
  process.exit(0);
};

seedDatabase().catch((error) => {
  console.error("Seed failed:", error.message);
  process.exit(1);
});