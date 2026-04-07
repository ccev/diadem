import type { Logger } from "@/lib/utils/logger";
import { sleep } from "@/lib/utils/time";

export abstract class BaseDataProvider<T> {
	protected cachedData: T | undefined = undefined;
	protected fetchPromise: Promise<T> | undefined = undefined;
	protected interval: NodeJS.Timeout;

	constructor(refreshSeconds: number) {
		this.interval = setInterval(() => this.query(), refreshSeconds * 1000);
		this.interval?.unref?.();
	}

	protected abstract query(): Promise<T>;

	public async refresh(): Promise<T> {
		if (this.fetchPromise) {
			return this.fetchPromise;
		}

		this.fetchPromise = this.query();
		const result = await this.fetchPromise;
		this.fetchPromise = undefined;
		this.cachedData = result;
		return result;
	}

	public async get() {
		if (this.cachedData) return this.cachedData;
		if (this.fetchPromise) return this.fetchPromise;

		return await this.refresh();
	}

	protected async fetchData(url: string, log: Logger, resourceName: string) {
		log.info("Updating resource: %s", resourceName);

		let data: string | undefined = undefined;
		while (!data) {
			try {
				const response = await fetch(url);

				if (!response.ok) {
					log.crit(
						"Couldn't fetch resource %s, trying again in 1min | url: %s | status: %d | response: %s",
						resourceName,
						url,
						response.status,
						await response.text()
					);
					await sleep(1000 * 60);
					continue;
				}

				data = await response.text();
			} catch (err) {
				log.crit(
					"Error while fetching resource %s, trying again in 1min | url: %s | err: %s",
					resourceName,
					url,
					err
				);
			}
		}

		log.info("Successfully updated resource: %s", resourceName);

		return data;
	}
}

export abstract class BulkDataProvider<K, V, Base> extends BaseDataProvider<Map<K, V>> {
	protected abstract querySingle(key: Base): Promise<[K, V]>;

	protected abstract allKeys(): readonly Base[];

	protected async query(): Promise<Map<K, V>> {
		const results = await Promise.all(
			this.allKeys().map((key) => {
				return this.querySingle(key);
			})
		);
		return new Map(results);
	}

	public async getSingle(key: K): Promise<V | undefined> {
		const results = await this.get();
		return results.get(key);
	}
}
