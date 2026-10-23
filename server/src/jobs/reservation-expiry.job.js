import { expireHolds } from "../services/inventory-reservation.service.js";

let intervalId = null;

/**
 * Start periodic background job to reconcile expired reservations and release held inventory.
 * Runs every 5 minutes in production / development.
 */
export function startReservationExpiryJob(intervalMs = 5 * 60 * 1000) {
  if (intervalId) return;

  console.log("⏰ Starting server-side reservation hold expiration job...");

  // Run once immediately on server boot
  expireHolds().catch((err) =>
    console.error("[Job Error] Immediate hold expiry check failed:", err.message)
  );

  intervalId = setInterval(async () => {
    try {
      await expireHolds();
    } catch (error) {
      console.error("[Job Error] Background hold expiry failed:", error.message);
    }
  }, intervalMs);

  // Unref so the interval does not block process exit during graceful shutdown
  if (intervalId.unref) {
    intervalId.unref();
  }
}

/**
 * Stop reservation expiry job.
 */
export function stopReservationExpiryJob() {
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
    console.log("⏰ Stopped reservation hold expiration job.");
  }
}
