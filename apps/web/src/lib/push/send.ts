import { db, pushSubscriptions } from "@kasb/db";
import { eq } from "drizzle-orm";
import webpush from "web-push";

// Lazy-init: only configure VAPID when keys are present (skips gracefully in test env)
function getWebPush() {
  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const email = process.env.VAPID_EMAIL;
  if (!publicKey || !privateKey || !email) return null;
  webpush.setVapidDetails(`mailto:${email}`, publicKey, privateKey);
  return webpush;
}

export interface PushPayload {
  title: string;
  body: string;
  data?: Record<string, unknown>;
}

/** Sends a web push to all registered subscriptions for a user. Expired ones are pruned. */
export async function sendPushToUser(userId: string, payload: PushPayload): Promise<void> {
  const wp = getWebPush();
  if (!wp) return; // VAPID not configured — skip silently

  const subs = await db
    .select()
    .from(pushSubscriptions)
    .where(eq(pushSubscriptions.userId, userId));

  if (subs.length === 0) return;

  await Promise.allSettled(
    subs.map(async (sub) => {
      try {
        await wp.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          JSON.stringify(payload),
          { TTL: 60 * 60 * 24 }, // 24h TTL
        );
      } catch (err: unknown) {
        const status = (err as { statusCode?: number })?.statusCode;
        if (status === 410 || status === 404) {
          // Subscription expired or invalid — remove it
          await db.delete(pushSubscriptions).where(eq(pushSubscriptions.endpoint, sub.endpoint));
        }
      }
    }),
  );
}
