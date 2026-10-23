import mongoose from "mongoose";
import { env } from "./env.config.js";

/**
 * Connect to MongoDB database with retry and error listeners.
 */
export async function connectDB() {
  try {
    const conn = await mongoose.connect(env.MONGODB_URI);
    console.log(`✅ MongoDB Connected: ${conn.connection.host}/${conn.connection.name}`);
    return conn;
  } catch (error) {
    console.error(`❌ MongoDB Connection Error: ${error.message}`);
    if (env.NODE_ENV !== "test") {
      process.exit(1);
    }
    throw error;
  }
}

/**
 * Disconnect from MongoDB database (useful for graceful shutdown and tests).
 */
export async function disconnectDB() {
  try {
    await mongoose.disconnect();
    console.log("ℹ️ MongoDB Disconnected successfully");
  } catch (error) {
    console.error("❌ Error disconnecting from MongoDB:", error.message);
  }
}
