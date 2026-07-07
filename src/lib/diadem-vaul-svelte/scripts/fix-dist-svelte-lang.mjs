import { promises as fs } from "node:fs";
import path from "node:path";

const distRoot = path.resolve("dist");

const walk = async (dir) => {
	const entries = await fs.readdir(dir, { withFileTypes: true });
	const results = [];
	for (const entry of entries) {
		const fullPath = path.join(dir, entry.name);
		if (entry.isDirectory()) {
			results.push(...(await walk(fullPath)));
		} else if (entry.isFile() && entry.name.endsWith(".svelte")) {
			results.push(fullPath);
		}
	}
	return results;
};

const files = await walk(distRoot);
await Promise.all(
	files.map(async (file) => {
		const contents = await fs.readFile(file, "utf8");
		if (!contents.startsWith("<script>")) {
			return;
		}
		const updated = contents.replace("<script>", '<script lang="ts">');
		if (updated !== contents) {
			await fs.writeFile(file, updated);
		}
	})
);
