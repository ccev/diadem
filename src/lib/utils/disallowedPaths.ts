import { seoLocales, splitLocalePath } from "@/lib/utils/localePaths";

export function getDisallowedPaths(configuredPaths: readonly string[] = []): string[] {
	const rules = [...configuredPaths, "/map", "/login", "/logout", "/coverage", "/filter"];
	return Array.from(
		new Set(
			rules
				.filter((rule) => rule.startsWith("/"))
				.flatMap((rule) => {
					if (rule === "/" || splitLocalePath(rule.replace(/\$$/, "")).locale) return [rule];
					return [rule, ...seoLocales.map((locale) => `/${locale}${rule === "/$" ? "$" : rule}`)];
				})
		)
	);
}

export function isDisallowedPath(path: string, rules: readonly string[]): boolean {
	// Match the same path prefixes, wildcards, and end anchors that robots.txt advertises.
	return rules.some((rule) => {
		const exactEnd = rule.endsWith("$");
		const [prefix, ...parts] = (exactEnd ? rule.slice(0, -1) : rule).split("*");
		if (!path.startsWith(prefix)) return false;
		if (!parts.length) return !exactEnd || path === prefix;

		const suffix = exactEnd ? parts.pop()! : "";
		if (!path.endsWith(suffix)) return false;
		const limit = path.length - suffix.length;
		let offset = prefix.length;
		for (const part of parts) {
			const start = path.indexOf(part, offset);
			if (start === -1) return false;
			offset = start + part.length;
		}
		return offset <= limit;
	});
}
