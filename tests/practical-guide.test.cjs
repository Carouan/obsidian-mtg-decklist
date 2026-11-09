const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const fs = require("node:fs");
const Module = require("node:module");
const { cwd } = require("node:process");
const esbuild = require("esbuild");

async function load(relativePath) {
	const filename = path.resolve(cwd(), relativePath);
	const result = await esbuild.build({
		entryPoints: [filename], bundle: true, platform: "node", format: "cjs", write: false,
	});
	const moduleCopy = new Module(filename, module);
	moduleCopy.filename = filename;
	moduleCopy.paths = module.paths;
	moduleCopy._compile(result.outputFiles[0].text, filename);
	return moduleCopy.exports;
}

test("every interactive block of the consolidated vault guide parses correctly", async () => {
	const guide = fs.readFileSync(path.resolve(cwd(), "examples/Guide-pratique-MTG-Decklist.md"), "utf8");
	const { parseDecklist } = await load("src/parser/decklist-parser.ts");
	const { parseCatalogBlock } = await load("src/parser/catalog-parser.ts");
	const { parseSetIndexBlock } = await load("src/parser/set-index-parser.ts");
	const { parseCombo } = await load("src/parser/combo-parser.ts");
	const counts = { decklist: 0, extension: 0, cardlist: 0, "extension-index": 0, combo: 0 };
	const blocks = [...guide.matchAll(/^```(decklist|extension|cardlist|extension-index|combo)\s*\r?\n([\s\S]*?)^```\s*$/gm)];
	for (const match of blocks) {
		const kind = match[1];
		const source = match[2];
		counts[kind]++;
		if (kind === "decklist") {
			const result = parseDecklist(source);
			assert.deepEqual(result.errors, [], `Invalid example for ${kind}: ${source}`);
			assert.ok(result.totalCards > 0);
		} else if (kind === "extension" || kind === "cardlist") {
			const result = parseCatalogBlock(source, kind, "fr");
			assert.deepEqual(result.errors, [], `Invalid example for ${kind}: ${source}`);
			assert.ok(kind === "extension" ? result.set : result.card);
		} else if (kind === "extension-index") {
			const result = parseSetIndexBlock(source, "fr");
			assert.deepEqual(result.errors, [], `Invalid example for ${kind}: ${source}`);
		} else {
			const result = parseCombo(source);
			assert.deepEqual(result.errors, [], `Invalid example for ${kind}: ${source}`);
			assert.ok(result.name && result.loops.length);
		}
	}
	assert.ok(counts.decklist >= 3);
	assert.ok(counts.extension >= 2);
	assert.ok(counts.cardlist >= 2);
	assert.ok(counts["extension-index"] >= 2);
	assert.ok(counts.combo >= 1);
	assert.match(guide, /texte Oracle en anglais/i);
	assert.match(guide, /Ni affilié|ni affilié/i);
});
