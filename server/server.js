import "dotenv/config";
import express from "express";
import cors from "cors";
import http from "http";
import connectDB, { connectDBMiddleware } from "./config/db.js";
import authRoutes from "./routes/authRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";
import roomRoutes from "./routes/roomRoutes.js";
import swapRoutes from "./routes/swapRoutes.js";
import reportRoutes from "./routes/reportRoutes.js";
import { initSocketServer } from "./sockets/index.js";

const app = express();

app.use(connectDBMiddleware);

const allowedOrigins = [
  "http://localhost:5173",
  "http://localhost:3000",
  "https://roomxchange.me",
  "https://www.roomxchange.me",
  "https://room-x-change.vercel.app",
  "https://room-x-change-server.vercel.app",
];

// Set Vary: Origin and Cache-Control headers so Vercel CDN never serves cached CORS headers for a different origin
app.use((req, res, next) => {
  res.setHeader("Vary", "Origin");
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
  next();
});

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      const cleanOrigin = origin.replace(/\/$/, "");
      if (
        allowedOrigins.includes(cleanOrigin) ||
        cleanOrigin.endsWith(".roomxchange.me") ||
        cleanOrigin.endsWith(".vercel.app")
      ) {
        return callback(null, true);
      }
      return callback(null, false);
    },
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
  connectDB();
  const server = http.createServer(app);
  initSocketServer(server);
  server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

// SPECIALLY FOR VERCEL SERVERLESS DEPLOYMENT:
// Export express app as default export for Vercel Serverless Function.
export default app;