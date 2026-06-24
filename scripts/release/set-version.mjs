#!/usr/bin/env node
// Read / bump the Android app version in android/app/build.gradle.
//
//   node scripts/release/set-version.mjs --print     -> prints "0.2 (code 2)"
//   node scripts/release/set-version.mjs             -> auto-bump: 0.2 -> 0.3, code 2 -> 3
//   node scripts/release/set-version.mjs 1.0         -> set versionName 1.0, code -> 3
//
// Auto-bump increments the LAST dotted component of versionName and always
// increments versionCode by 1 (Play/F-Droid require a strictly higher code).
// In GitHub Actions it also writes old_version/version/version_code to GITHUB_OUTPUT.
import { readFileSync, writeFileSync, appendFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

const GRADLE = "android/app/build.gradle";

/**
 * Compute the next version from build.gradle source text. Pure (no I/O).
 * @param {string} src - build.gradle contents
 * @param {string} [override] - explicit versionName; blank/falsy = auto-bump
 * @returns {{oldName:string, oldCode:number, newName:string, newCode:number, newSrc:string}}
 */
export function computeVersion(src, override) {
	const codeM = src.match(/versionCode\s+(\d+)/);
	const nameM = src.match(/versionName\s+"([^"]+)"/);
	if (!codeM || !nameM) {
		throw new Error("Could not find versionCode/versionName in build.gradle");
	}
	const oldCode = parseInt(codeM[1], 10);
	const oldName = nameM[1];

	let newName;
	if (override && override.trim()) {
		newName = override.trim();
	} else {
		const parts = oldName.split(".");
		const last = Number(parts[parts.length - 1]);
		if (!Number.isInteger(last)) {
			throw new Error(
				`Cannot auto-bump non-numeric versionName "${oldName}"; pass an explicit version.`
			);
		}
		parts[parts.length - 1] = String(last + 1);
		newName = parts.join(".");
	}
	const newCode = oldCode + 1;

	const newSrc = src
		.replace(/versionCode\s+\d+/, `versionCode ${newCode}`)
		.replace(/versionName\s+"[^"]+"/, `versionName "${newName}"`);

	return { oldName, oldCode, newName, newCode, newSrc };
}

/**
 * Normalise a versionName to a valid 3-part npm semver, e.g. "0.3" -> "0.3.0",
 * "1" -> "1.0.0", "1.2.3" -> "1.2.3". (package.json's `version` must be semver.)
 * @param {string} versionName
 * @returns {string}
 */
export function toSemver(versionName) {
	const parts = versionName.split(".");
	while (parts.length < 3) parts.push("0");
	return parts.join(".");
}

function cli() {
	const args = process.argv.slice(2);
	const printOnly = args.includes("--print");
	const override = args.find((a) => !a.startsWith("--"));
	const src = readFileSync(GRADLE, "utf8");

	if (printOnly) {
		const codeM = src.match(/versionCode\s+(\d+)/);
		const nameM = src.match(/versionName\s+"([^"]+)"/);
		if (!codeM || !nameM) {
			console.error("Could not find versionCode/versionName in build.gradle");
			process.exit(1);
		}
		console.log(`${nameM[1]} (code ${codeM[1]})`);
		return;
	}

	let result;
	try {
		result = computeVersion(src, override);
	} catch (e) {
		console.error(e.message);
		process.exit(1);
	}
	writeFileSync(GRADLE, result.newSrc);

	// Keep package.json's npm version in sync (semver-normalised, e.g. 0.3 -> 0.3.0).
	// Minimal text replace so the rest of package.json formatting is untouched.
	const PKG = "package.json";
	const pkgVersion = toSemver(result.newName);
	const pkgSrc = readFileSync(PKG, "utf8");
	writeFileSync(PKG, pkgSrc.replace(/("version"\s*:\s*")[^"]*(")/, `$1${pkgVersion}$2`));

	console.error(`old: ${result.oldName} (code ${result.oldCode})`);
	console.error(`new: ${result.newName} (code ${result.newCode}), package.json ${pkgVersion}`);

	if (process.env.GITHUB_OUTPUT) {
		appendFileSync(
			process.env.GITHUB_OUTPUT,
			`old_version=${result.oldName}\nversion=${result.newName}\nversion_code=${result.newCode}\n`
		);
	}
}

// Only run the CLI when executed directly (not when imported by tests).
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
	cli();
}
