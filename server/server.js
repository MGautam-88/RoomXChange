import "dotenv/config";
import express from "express";
import cors from "cors";
// import http from "http";
// import connectDB from "./config/db.js"; // changed because of Vercel deployment
import connectDB, { connectDBMiddleware } from "./config/db.js";
import authRoutes from "./routes/authRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";
import roomRoutes from "./routes/roomRoutes.js";
import swapRoutes from "./routes/swapRoutes.js";
import reportRoutes from "./routes/reportRoutes.js";
// import { initSocketServer } from "./sockets/index.js";

// ==========================================
// SPECIALLY FOR VERCEL SERVERLESS DEPLOYMENT
// ==========================================

// COMMENTED OUT SPECIALLY FOR VERCEL DEPLOYMENT:
// Top-level DB connection is not used.
// Database connection is handled through connectDBMiddleware.
// connectDB();

const app = express();

// COMMENTED OUT SPECIALLY FOR VERCEL DEPLOYMENT:
// Vercel Serverless Functions do not maintain a persistent HTTP server.
// const server = http.createServer(app);

// COMMENTED OUT SPECIALLY FOR VERCEL DEPLOYMENT:
// Socket.IO requires a persistent Node.js server, which Vercel Serverless
// Functions do not provide. Uncomment when deploying on Render/Railway.
// initSocketServer(server);

// SPECIALLY FOR VERCEL SERVERLESS DEPLOYMENT:
// Middleware to connect/reuse database connection per request asynchronously
app.use(connectDBMiddleware);

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
app.use("/api/reports", reportRoutes);

const PORT = process.env.PORT || 5500;

if (!process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

// SPECIALLY FOR VERCEL SERVERLESS DEPLOYMENT:
// Export express app as default export for Vercel Serverless Function.
export default app;