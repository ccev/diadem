import { afterEach, describe, expect, it, vi } from "vitest";
import { createTelegramMembershipLookup, isTelegramMember } from "./telegramMembership";

afterEach(() => {
	vi.useRealTimers();
	vi.restoreAllMocks();
});

describe("Telegram membership", () => {
	it.each(["creator", "administrator", "member"])("accepts %s", (status) =>
		expect(isTelegramMember({ status })).toBe(true)
	);
	it("handles restricted members accurately", () => {
		expect(isTelegramMember({ status: "restricted", is_member: true })).toBe(true);
		expect(isTelegramMember({ status: "restricted", is_member: false })).toBe(false);
		expect(isTelegramMember({ status: "restricted" })).toBe(false);
	});
	it.each([null, {}, { status: "left" }, { status: "kicked" }, { status: "unknown" }])(
		"fails closed for %j",
		(result) => expect(isTelegramMember(result)).toBe(false)
	);
	it("deduplicates concurrent lookups, expires positives and never serves stale on failure", async () => {
		const clock = vi.spyOn(performance, "now").mockReturnValue(1000);
		const upstream = vi
			.fn()
			.mockResolvedValue(
				new Response(JSON.stringify({ ok: true, result: { status: "member", user: { id: 123 } } }))
			);
		const lookup = createTelegramMembershipLookup("secret", upstream);
		expect(await Promise.all([lookup("-100", "123"), lookup("-100", "123")])).toEqual([true, true]);
		expect(await lookup("-100", "123")).toBe(true);
		expect(upstream).toHaveBeenCalledTimes(1);
		clock.mockReturnValue(61001);
		upstream.mockRejectedValue(new Error("upstream URL contains secret"));
		expect(await lookup("-100", "123")).toBe(false);
		expect(upstream).toHaveBeenCalledTimes(2);
		expect(upstream.mock.calls[0][1].signal).toBeInstanceOf(AbortSignal);
	});
	it("rejects mismatched identities, malformed responses and invalid configuration", async () => {
		const upstream = vi
			.fn()
			.mockImplementation(
				async () =>
					new Response(
						JSON.stringify({ ok: true, result: { status: "member", user: { id: 999 } } })
					)
			);
		const lookup = createTelegramMembershipLookup("secret", upstream);
		expect(await lookup("-100", "123")).toBe(false);
		expect(await lookup("@username", "123")).toBe(false);
		expect(await createTelegramMembershipLookup("", upstream)("-100", "123")).toBe(false);
		expect(upstream).toHaveBeenCalledTimes(1);
	});
	it("bounds request rate and observes Telegram retry_after", async () => {
		const upstream = vi.fn().mockImplementation(
			async () =>
				new Response(JSON.stringify({ ok: false, parameters: { retry_after: 30 } }), {
					status: 429
				})
		);
		const lookup = createTelegramMembershipLookup("secret", upstream);
		expect(await lookup("-100", "123")).toBe(false);
		expect(await lookup("-100", "124")).toBe(false);
		expect(upstream).toHaveBeenCalledTimes(1);
	});
	it("caps concurrent requests without queuing unbounded work", async () => {
		const upstream = vi.fn().mockImplementation(() => new Promise(() => {}));
		const lookup = createTelegramMembershipLookup("secret", upstream);
		for (let id = 1; id <= 20; id++) void lookup("-100", String(id));
		expect(await lookup("-100", "21")).toBe(false);
		expect(upstream).toHaveBeenCalledTimes(20);
	});
});
