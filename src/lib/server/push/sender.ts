import webpush from "web-push";
import { getServerConfig } from "@/lib/services/config/config.server";
import { deletePushSubscriptionByHash } from "@/lib/server/db/internal/repository";
import { getLogger } from "@/lib/utils/logger";
import type { PushPayload, StoredSubscription } from "./types";

const log = getLogger("push");
let configured = false;

function ensureConfigured(): boolean {
	const push = getServerConfig().push;
	if (!push?.enabled) return false;
	if (!configured) {
		webpush.setVapidDetails(push.vapidSubject, push.vapidPublicKey, push.vapidPrivateKey);
		configured = true;
	}
	return true;
}

/** Send a payload to one subscription. Returns true if the subscription is
 *  now gone (404/410) and was pruned. */
export async function sendToSubscription(
	sub: StoredSubscription,
	payload: PushPayload
): Promise<{ pruned: boolean }> {
	if (!ensureConfigured()) return { pruned: false };

	try {
		await webpush.sendNotification(
			{ endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
			JSON.stringify(payload)
		);
		return { pruned: false };
	} catch (err) {
		const statusCode = (err as { statusCode?: number }).statusCode;
		if (statusCode === 404 || statusCode === 410) {
			await deletePushSubscriptionByHash(sub.endpointHash);
			log.info(`Pruned gone push subscription ${sub.endpointHash}`);
			return { pruned: true };
		}
		log.warning(`Push send failed (${statusCode}): ${err}`);
		return { pruned: false };
	}
}
