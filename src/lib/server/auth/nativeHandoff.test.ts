import { createHash } from "node:crypto";
import { describe, expect, it, vi } from "vitest";
import {
	beginNativeFlow,
	consumeNativeFlow,
	issueNativeCode,
	consumeNativeCode
} from "./nativeHandoff";

describe("native handoff", () => {
	const verifier = "a".repeat(43);
	const challenge = createHash("sha256").update(verifier).digest("base64url");
	it("binds the browser flow to its cookie and original challenge", () => {
		const flow = beginNativeFlow(challenge, "app.diadem");
		expect(consumeNativeFlow(flow, "other")).toBeNull();
		expect(consumeNativeFlow(flow, flow)).toEqual({ challenge, appId: "app.diadem" });
		expect(consumeNativeFlow(flow, flow)).toBeNull();
	});
	it("exchanges only once with the matching verifier", () => {
		const code = issueNativeCode("session-secret", challenge);
		expect(code).not.toContain("session-secret");
		expect(consumeNativeCode(code, verifier)).toBe("session-secret");
		expect(consumeNativeCode(code, verifier)).toBeNull();
	});
	it("burns a code on incorrect verifier and rejects expired codes", () => {
		const code = issueNativeCode("secret", challenge);
		expect(consumeNativeCode(code, "wrong")).toBeNull();
		expect(consumeNativeCode(code, verifier)).toBeNull();
		vi.useFakeTimers();
		const expired = issueNativeCode("secret", challenge);
		vi.advanceTimersByTime(120001);
		expect(consumeNativeCode(expired, verifier)).toBeNull();
		vi.useRealTimers();
	});
});
