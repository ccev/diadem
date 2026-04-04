// Tailwind pallette, each 500
export const MODIFIER_COLORS = {
	red: "rgba(251, 44, 54, {})",
	orange: "rgba(255, 105, 0, {})",
	yellow: "rgba(239, 177, 0, {})",
	green: "rgba(0, 201, 81, {})",
	cyan: "rgba(0, 184, 219, {})",
	blue: "rgba(43, 127, 255, {})",
	purple: "rgba(173, 70, 255, {})",
	pink: "rgba(246, 51, 154, {})"
};

export function getUnderlayColor(name: keyof typeof MODIFIER_COLORS, opacity: number = 1): string {
	return (
		MODIFIER_COLORS[name].replace("{}", opacity.toString()) ?? MODIFIER_COLORS.red.replace("{}", opacity.toString())
	);
}

export const MODIFIER_GLOW_OPACITY = 0.75;
export const MODIFIER_BACKGROUND_OPACITY = 1;
