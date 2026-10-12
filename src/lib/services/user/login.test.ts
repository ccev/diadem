import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({
	native: false,
	providers: ["discord"],
	goto: vi.fn(),
	start: vi.fn(),
	open: vi.fn(),
	close: vi.fn()
}));
vi.mock("@/lib/native/runtime", () => ({ isNative: () => mocks.native }));
vi.mock("@/lib/native/auth", () => ({ startNativeLogin: mocks.start }));
vi.mock("$app/navigation", () => ({ goto: mocks.goto }));
vi.mock("@/lib/services/config/config", () => ({
	getConfig: () => ({ auth: { providers: mocks.providers } })
}));
vi.mock("@/lib/ui/modal.svelte", () => ({ openModal: mocks.open, closeModal: mocks.close }));
import { startLogin } from "./login";

beforeEach(() => {
	vi.clearAllMocks();
	vi.stubGlobal("window", { location: { pathname: "/map" } });
});
describe("all shared login entry points", () => {
	it.each([false, true])("single-provider direct login (native=%s)", async (native) => {
		mocks.native = native;
		for (const provider of ["discord", "telegram"]) {
			mocks.providers = [provider];
			await startLogin();
			if (native) expect(mocks.start).toHaveBeenLastCalledWith(provider, "/map");
			else expect(mocks.goto).toHaveBeenLastCalledWith(`/login/${provider}?redir=%2Fmap`);
		}
		expect(mocks.open).not.toHaveBeenCalled();
	});
	it.each([false, true])(
		"multiple providers open picker before login (native=%s)",
		async (native) => {
			mocks.native = native;
			mocks.providers = ["discord", "telegram"];
			await startLogin();
			expect(mocks.open).toHaveBeenCalledWith("authProvider");
			expect(mocks.goto).not.toHaveBeenCalled();
			expect(mocks.start).not.toHaveBeenCalled();
			await startLogin("telegram");
			if (native) expect(mocks.start).toHaveBeenCalledWith("telegram", "/map");
			else expect(mocks.goto).toHaveBeenCalledWith("/login/telegram?redir=%2Fmap");
		}
	);
	it("does not initiate a disabled provider", async () => {
		mocks.providers = ["discord"];
		await startLogin("telegram");
		expect(mocks.goto).not.toHaveBeenCalled();
		expect(mocks.start).not.toHaveBeenCalled();
	});
});
