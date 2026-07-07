#!/usr/bin/env node
import { appendFileSync, readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

const STORE_CHANGELOG_LIMIT = 500;

const PUBLIC_SECTION_NAMES = new Set([
	"github",
	"github discord",
	"github and discord",
	"github release",
	"public",
	"release",
	"release notes"
]);
const STORE_SECTION_NAMES = new Set([
	"app store",
	"app stores",
	"appstore",
	"stores",
	"store",
	"play store",
	"google play",
	"google play store"
]);

function normalizeHeading(text) {
	return text
		.toLowerCase()
		.replace(/[`*_~]/g, "")
		.replace(/&|\+/g, " and ")
		.replace(/[^a-z0-9]+/g, " ")
		.trim()
		.replace(/\s+/g, " ");
}

function sectionKind(heading) {
	const normalized = normalizeHeading(heading);
	if (PUBLIC_SECTION_NAMES.has(normalized)) return "public";
	if (STORE_SECTION_NAMES.has(normalized)) return "store";
	return undefined;
}

function trimBlankLines(text) {
	return text.replace(/^\s*\n/, "").replace(/\s+$/, "");
}

/**
 * Parse a draft release body into a public changelog and an app-store changelog.
 * Recognized headings are intentionally simple so release drafts remain easy to edit:
 *   ## GitHub / Discord
 *   ## App Stores
 * If no store section exists, the app-store changelog falls back to the public text.
 * @param {string} body
 * @returns {{publicBody:string, storeBody:string, hasPublicSection:boolean, hasStoreSection:boolean}}
 */
export function parseChangelog(body) {
	const source = body.trim();
	if (!source) {
		return { publicBody: "", storeBody: "", hasPublicSection: false, hasStoreSection: false };
	}

	const sections = [];
	let current;

	for (const line of source.split(/\r?\n/)) {
		const match = line.match(/^(#{1,6})\s+(.+?)\s*#*\s*$/);
		const kind = match ? sectionKind(match[2]) : undefined;

		if (kind) {
			current = { kind, level: match[1].length, lines: [] };
			sections.push(current);
			continue;
		}

		if (match && current && match[1].length <= current.level) {
			current = undefined;
			continue;
		}

		if (current) current.lines.push(line);
	}

	const publicSections = sections.filter((section) => section.kind === "public");
	const storeSections = sections.filter((section) => section.kind === "store");
	const publicBody = publicSections.length
		? publicSections.map((section) => trimBlankLines(section.lines.join("\n"))).join("\n\n")
		: source;
	const storeBody = storeSections.length
		? storeSections.map((section) => trimBlankLines(section.lines.join("\n"))).join("\n\n")
		: publicBody;

	return {
		publicBody: trimBlankLines(publicBody),
		storeBody: trimBlankLines(storeBody),
		hasPublicSection: publicSections.length > 0,
		hasStoreSection: storeSections.length > 0
	};
}

function appendOutput(name, value) {
	const delimiter = `${name.toUpperCase()}_EOF_${Date.now()}_${Math.random().toString(36).slice(2)}`;
	appendFileSync(process.env.GITHUB_OUTPUT, `${name}<<${delimiter}\n${value}\n${delimiter}\n`);
}

function cli() {
	const source = process.argv[2] || "draft release";
	const body = readFileSync(0, "utf8");
	const changelog = parseChangelog(body);

	if (!changelog.publicBody) {
		console.error("No changelog body found");
		process.exit(1);
	}

	if (!changelog.storeBody) {
		console.error("No app-store changelog body found");
		process.exit(1);
	}

	if (changelog.storeBody.length > STORE_CHANGELOG_LIMIT) {
		console.error(
			`App-store changelog is ${changelog.storeBody.length} characters; Google Play allows ${STORE_CHANGELOG_LIMIT}`
		);
		process.exit(1);
	}

	if (process.env.GITHUB_OUTPUT) {
		appendOutput("public_body", changelog.publicBody);
		appendOutput("store_body", changelog.storeBody);
		appendFileSync(
			process.env.GITHUB_OUTPUT,
			`source=${source}\nhas_public_section=${changelog.hasPublicSection}\nhas_store_section=${changelog.hasStoreSection}\n`
		);
	} else {
		console.log(changelog.publicBody);
	}
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
	cli();
}
