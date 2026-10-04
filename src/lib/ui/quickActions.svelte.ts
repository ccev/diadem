import type { LucideIcon } from "@/lib/types/lucide";

export type QuickAction = {
	label: string;
	Icon: LucideIcon;
	onclick?: () => void;
	href?: string;
	disabled?: boolean;
	destructive?: boolean;
};

type QuickActionsMenu = {
	x: number;
	y: number;
	title: string;
	getActions: () => QuickAction[];
	trigger?: HTMLElement;
};

let menu = $state.raw<QuickActionsMenu>();

export function getQuickActions() {
	return menu;
}

export function openQuickActions(next: QuickActionsMenu) {
	menu = next;
}

export function closeQuickActions() {
	menu = undefined;
}
