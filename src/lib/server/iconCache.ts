/** Process-local LRU of successful image transformations, bounded by bytes and age. */
export class IconCache {
	private entries = new Map<string, { data: Buffer; expires: number }>();
	private pending = new Map<string, Promise<Buffer>>();
	private bytes = 0;

	constructor(
		private maxBytes = 64 * 1024 * 1024,
		private maxEntries = 2048,
		private ttl = 24 * 60 * 60 * 1000
	) {}

	async get(key: string, load: () => Promise<Buffer>): Promise<Buffer> {
		const cached = this.entries.get(key);
		if (cached) {
			this.entries.delete(key);
			if (cached.expires > Date.now()) {
				this.entries.set(key, cached);
				return cached.data;
			}
			this.bytes -= cached.data.byteLength;
		}
		const pending = this.pending.get(key);
		if (pending) return pending;

		const promise = Promise.resolve()
			.then(load)
			.then((data) => {
				if (data.byteLength <= this.maxBytes && this.maxEntries > 0) {
					while (
						this.entries.size &&
						(this.bytes + data.byteLength > this.maxBytes || this.entries.size >= this.maxEntries)
					) {
						const oldest = this.entries.keys().next().value!;
						this.bytes -= this.entries.get(oldest)!.data.byteLength;
						this.entries.delete(oldest);
					}
					this.entries.set(key, { data, expires: Date.now() + this.ttl });
					this.bytes += data.byteLength;
				}
				return data;
			})
			.finally(() => this.pending.delete(key));
		this.pending.set(key, promise);
		return promise;
	}
}

export const iconCache = new IconCache();
