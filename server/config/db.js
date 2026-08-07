import mongoose from "mongoose";

// ==========================================
// SPECIALLY FOR VERCEL SERVERLESS DEPLOYMENT
// ==========================================
// Cached connection state to reuse MongoDB connection across Vercel serverless function invocations
let isConnected = false;

const connectDB = async () => {
  // SPECIALLY FOR VERCEL: Reuse existing connection if already connected (readyState >= 1) to avoid multiple connection requests
  if (mongoose.connection.readyState >= 1 || isConnected) {
    console.log("Using cached MongoDB connection");
    return;
  }

  try {
    const conn = await mongoose.connect(process.env.MONGO_URI);
    isConnected = true;
    console.log(`MongoDB connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`MongoDB connection failed: ${error.message}`);
    // COMMENTED OUT SPECIALLY FOR VERCEL DEPLOYMENT:
    // The line below was commented out specifically for Vercel so a connection failure throws an error to the handler instead of crashing the serverless container process.
    // process.exit(1);
    throw error;
  }
};

// SPECIALLY FOR VERCEL: Middleware function to connect to DB asynchronously per request only if not already connected
export const connectDBMiddleware = async (req, res, next) => {
  try {
    await connectDB();
    next();
  } catch (error) {
    res.status(500).json({ message: "Database connection failed", error: error.message });
  }
};

export default connectDB;