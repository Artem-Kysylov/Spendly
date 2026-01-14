#!/usr/bin/env node
/**
 * Generate a matching VAPID key pair for Web Push notifications.
 * 
 * Usage:
 *   node scripts/generate-vapid-keys.js
 * 
 * Then copy the output to your .env.local and Vercel environment variables:
 *   - NEXT_PUBLIC_VAPID_PUBLIC_KEY (frontend, must be public)
 *   - VAPID_PUBLIC_KEY (backend, can be same as above or set separately)
 *   - VAPID_PRIVATE_KEY (backend only, NEVER expose to client)
 */

const webpush = require("web-push");

const vapidKeys = webpush.generateVAPIDKeys();

console.log("\n=== NEW VAPID KEY PAIR ===\n");
console.log("# Add these to .env.local AND Vercel Environment Variables:\n");
console.log(`NEXT_PUBLIC_VAPID_PUBLIC_KEY=${vapidKeys.publicKey}`);
console.log(`VAPID_PUBLIC_KEY=${vapidKeys.publicKey}`);
console.log(`VAPID_PRIVATE_KEY=${vapidKeys.privateKey}`);
console.log("\n=== IMPORTANT ===");
console.log("1. Both NEXT_PUBLIC_VAPID_PUBLIC_KEY and VAPID_PUBLIC_KEY should be the SAME value");
console.log("2. VAPID_PRIVATE_KEY must correspond to the public key (generated together)");
console.log("3. After updating Vercel env vars, redeploy the app");
console.log("4. Users may need to re-enable notifications (old subscriptions will fail)\n");
