export class ReadUnavailable extends Error {}

/** Admission covers pool acquisition, statement execution and deadline cleanup. */
export class ReadBudget {
	private active = 0;
	private waiting: { resolve: () => void; timer: NodeJS.Timeout }[] = [];

	constructor(
		private readonly concurrency: number,
		private readonly queueLimit: number,
		private readonly queueTimeoutMs: number
	) {}

	async run<T>(work: () => Promise<T>): Promise<T> {
		if (this.active < this.concurrency) {
			this.active++;
		} else {
			if (this.waiting.length >= this.queueLimit) throw new ReadUnavailable("Read queue full");
			await new Promise<void>((resolve, reject) => {
				const entry = {
					resolve,
					timer: setTimeout(() => {
						this.waiting.splice(this.waiting.indexOf(entry), 1);
						reject(new ReadUnavailable("Read queue timeout"));
					}, this.queueTimeoutMs)
				};
				this.waiting.push(entry);
			});
		}
		try {
			return await work();
		} finally {
			const next = this.waiting.shift();
			if (next) {
				clearTimeout(next.timer);
				next.resolve();
			} else {
				this.active--;
			}
		}
	}
}
