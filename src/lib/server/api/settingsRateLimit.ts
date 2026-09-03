import { RateLimiterMemory } from "rate-limiter-flexible";

const WRITES_PER_MINUTE = 240;

const limiter = new RateLimiterMemory({
	points: WRITES_PER_MINUTE,
	duration: 60,
	keyPrefix: "settings_"
});

export async function allowSettingsWrite(userId: string): Promise<boolean> {
	try {
		await limiter.consume(userId, 1);
		return true;
	} catch {
		return false;
	}
}
