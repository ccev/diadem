import {
	STATS_LEASE_MS,
	STATS_REFRESH_MS,
	STATS_RETRY_MS,
	type Snapshot
} from "./statsCoordinator.mjs";
import { statsRequest } from "./statsTransport";

type Counter = number | Record<string, number>;

/** A fixed-key singleflight SWR reader. Authorization and user data must not use this cache. */
export class LiveStatsCache<T extends Counter> {
	private flight?: Promise<T>;
	private refresh?: Promise<T>;
	private last?: { value: T; updatedAt: number };
	private retryAt = 0;

	constructor(
		private readonly key: string,
		private readonly refreshMs: number,
		private readonly staleMs: number,
		private readonly load: (signal: AbortSignal) => Promise<T>,
		private readonly request: typeof statsRequest = statsRequest
	) {}

	get(): Promise<T> {
		if (Date.now() < this.retryAt) {
			if (this.usable()) return Promise.resolve(this.last!.value);
			return Promise.reject(new Error("Stats refresh backing off"));
		}
		if (!this.flight) {
			this.flight = this.read().finally(() => {
				this.flight = undefined;
			});
		}
		return this.flight;
	}

	private usable() {
		return this.last && Date.now() - this.last.updatedAt < this.refreshMs + this.staleMs;
	}

	private async read(): Promise<T> {
		try {
			// Cold readers poll boundedly while another worker owns the lease. No primary wait queue.
			const end = Date.now() + STATS_LEASE_MS + 1000;
			do {
				const state = await this.request({
					op: "get",
					key: this.key,
					refreshMs: this.refreshMs,
					staleMs: this.staleMs
				});
				if (state.value !== undefined) {
					this.last = { value: state.value as T, updatedAt: state.updatedAt };
					if (state.token && !this.refresh) {
						this.refresh = this.update(state).finally(() => {
							this.refresh = undefined;
						});
						// SWR failures are observed; last-known-good is never replaced with an error/zero.
						void this.refresh.catch(() => {});
					}
					return this.last.value;
				}
				if (state.token) return await this.update(state);
				if (state.retryAt > Date.now()) throw new Error("Stats refresh backing off");
				await new Promise((resolve) => setTimeout(resolve, 100));
			} while (Date.now() < end);
			throw new Error("Stats refresh lease timeout");
		} catch (cause) {
			this.retryAt = Date.now() + STATS_RETRY_MS;
			if (this.usable()) return this.last!.value;
			throw cause;
		}
	}

	private async update(state: Snapshot): Promise<T> {
		const signal = AbortSignal.timeout(STATS_REFRESH_MS);
		let timer: NodeJS.Timeout | undefined;
		try {
			const value = await Promise.race([
				this.load(signal),
				new Promise<never>((_, reject) => {
					timer = setTimeout(() => reject(new Error("Stats refresh timeout")), STATS_REFRESH_MS);
				})
			]);
			const published = await this.request({
				op: "publish",
				key: this.key,
				token: state.token,
				value
			});
			this.last = { value, updatedAt: published.updatedAt };
			return value;
		} catch (cause) {
			this.retryAt = Date.now() + STATS_RETRY_MS;
			await this.request({ op: "fail", key: this.key, token: state.token }).catch(() => {});
			throw cause;
		} finally {
			clearTimeout(timer);
		}
	}
}
