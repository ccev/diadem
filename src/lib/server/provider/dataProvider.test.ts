import { afterEach, expect, it, vi } from "vitest";
vi.mock("@/lib/utils/logger", () => ({ getLogger: () => ({ error: vi.fn() }) }));
import { BaseDataProvider } from "./dataProvider";
const log = { info: vi.fn(), crit: vi.fn(), error: vi.fn(), warning: vi.fn(), debug: vi.fn() };
class Provider extends BaseDataProvider<string> {
	constructor() {
		super(3600);
	}
	query() {
		return this.fetchData("http://fixture/resource", log, "test");
	}
	seed() {
		this.cachedData = "stale";
	}
	stop() {
		clearInterval(this.interval);
	}
}
afterEach(() => {
	vi.useRealTimers();
	vi.unstubAllGlobals();
	vi.restoreAllMocks();
});
it.each(["transport", "http", "empty"])("backs off after %s failure and recovers", async (mode) => {
	vi.useFakeTimers();
	const fetchMock = vi.fn();
	if (mode === "transport") fetchMock.mockRejectedValueOnce(Error("offline"));
	else
		fetchMock.mockResolvedValueOnce(
			new Response(mode === "empty" ? "" : "failure", { status: mode === "http" ? 503 : 200 })
		);
	fetchMock.mockResolvedValue(new Response("recovered"));
	vi.stubGlobal("fetch", fetchMock);
	const p = new Provider();
	p.seed();
	const pending = p.refresh();
	expect(await p.get()).toBe("stale");
	await vi.advanceTimersByTimeAsync(59999);
	expect(fetchMock).toHaveBeenCalledTimes(1);
	await vi.advanceTimersByTimeAsync(1);
	expect(await pending).toBe("recovered");
	expect(await p.get()).toBe("recovered");
	p.stop();
});
it("sets a 30-second deadline for provider requests", async () => {
	const timeout = vi.spyOn(AbortSignal, "timeout");
	vi.stubGlobal(
		"fetch",
		vi.fn(async (_url, options) => {
			expect(options.signal).toBeInstanceOf(AbortSignal);
			return new Response("ok");
		})
	);
	const p = new Provider();
	expect(await p.get()).toBe("ok");
	expect(timeout).toHaveBeenCalledWith(30000);
	p.stop();
});
