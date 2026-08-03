import "dotenv/config";
import express from "express";
import cors from "cors";
import http from "http";
import connectDB from "./config/db.js";
import authRoutes from "./routes/authRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";
import roomRoutes from "./routes/roomRoutes.js";
import swapRoutes from "./routes/swapRoutes.js";
import { initSocketServer } from "./sockets/index.js";

connectDB();

const app = express();
const server = http.createServer(app);

initSocketServer(server);

app.use(
  cors({
    origin: process.env.CLIENT_URL || "http://localhost:5173",
    credentials: true,
  })
);
app.use(express.json());

// Health check
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", message: "RoomXChange API is running" });
});

app.use("/api/auth", authRoutes);
app.use("/api/rooms", roomRoutes);
app.use("/api/swaps", swapRoutes);
app.use("/api/admin", adminRoutes);

const PORT = process.env.PORT || 5500;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});