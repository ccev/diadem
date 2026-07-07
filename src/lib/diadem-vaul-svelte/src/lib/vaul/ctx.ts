import { getOptionUpdater } from "../internal/helpers/options.js";
import { createVaul, type CreateVaulProps } from "../internal/vaul.js";
import { getContext, setContext } from "svelte";

const VAUL_ROOT = Symbol("VAUL_ROOT");

type RootProps = {
	closeOnOutsideClick?: boolean;
	onOutsideClick?: (event: Event) => void;
	onOpenChange?: (open: boolean) => void;
	openFocus?: import("bits-ui").Dialog.ContentProps["onOpenAutoFocus"];
};

export function setCtx(props: CreateVaulProps = {}, rootProps: RootProps = {}) {
	const vaul = createVaul(props);
	const updateOption = getOptionUpdater(vaul.options);

	setContext(VAUL_ROOT, { ...vaul, updateOption, rootProps });

	return {
		...vaul,
		updateOption,
		rootProps,
	};
}

export function getCtx() {
	return getContext<ReturnType<typeof setCtx>>(VAUL_ROOT);
}
