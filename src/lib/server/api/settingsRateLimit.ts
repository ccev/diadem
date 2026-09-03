import { RateLimiterMemory } from "rate-limiter-flexible";

const writesPerMinute = 240;

const limiter = new RateLimiterMemory({
	points: writesPerMinute,
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
