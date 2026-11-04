const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const Module = require("node:module");
const { cwd } = require("node:process");
const esbuild = require("esbuild");

async function load(relative) {
	const absolute = path.resolve(cwd(), relative);
	const result = await esbuild.build({
		entryPoints: [absolute], write: false, bundle: true, platform: "node", format: "cjs",
		plugins: [{
			name: "obsidian-mock",
			setup(build) {
				build.onResolve({ filter: /^obsidian$/ }, () => ({ path: "obsidian", namespace: "mock" }));
				build.onLoad({ filter: /.*/, namespace: "mock" }, () => ({
					contents: "export const setIcon = () => {}; export class MarkdownRenderChild { constructor() {} }",
					loader: "js",
				}));
			},
		}],
	});
	const mod = new Module(absolute, module);
	mod.filename = absolute;
	mod.paths = module.paths;
	mod._compile(result.outputFiles[0].text, absolute);
	return mod.exports;
}

const sets = [
	{ id: "usg-id", code: "usg", name: "Urza's Saga", set_type: "expansion", released_at: "1998-10-12",
		block_code: "usg", block: "Urza", card_count: 357, icon_svg_uri: "https://svgs.scryfall.io/sets/usg.svg" },
	{ id: "ulg-id", code: "ulg", name: "Urza's Legacy", set_type: "expansion", released_at: "1999-02-15",
		block_code: "usg", block: "Urza", card_count: 143 },
	{ id: "uds-id", code: "uds", name: "Urza's Destiny", set_type: "expansion", released_at: "1999-06-07",
		block_code: "usg", block: "Urza", card_count: 143 },
	{ id: "hml-id", code: "hml", name: "Homelands", set_type: "expansion", released_at: "1995-10-01", card_count: 140 },
	{ id: "ltr-id", code: "ltr", name: "The Lord of the Rings: Tales of Middle-earth", set_type: "draft_innovation",
		released_at: "2023-06-23", card_count: 854 },
	{ id: "unf-id", code: "unf", name: "Unfinity", set_type: "funny", released_at: "2022-10-07", card_count: 639 },
	{ id: "cmd-id", code: "who", name: "Doctor Who", set_type: "commander", block: "Commander", block_code: "cmd",
		released_at: "2023-10-13", card_count: 1178 },
	{ id: "arena-id", code: "anb", name: "Arena Beginner Set", set_type: "starter",
		released_at: "2021-01-01", digital: true, card_count: 50 },
];

test("set index directives use explicit safe values", async () => {
	const { parseSetIndexBlock } = await load("src/parser/set-index-parser.ts");
	const result = parseSetIndexBlock([
		"language: fr", "view: gallery", "group: block", "sort: date-asc", "ub: exclude",
		"format: modern", "funny: show", "digital: false", "search: Urza",
	].join("\n"), "en");
	assert.equal(result.language, "fr");
	assert.deepEqual(result.errors, []);
	assert.equal(result.filters.sort, "date-asc");
	assert.equal(result.filters.group, "block");
	assert.equal(result.filters.format, "modern");
	assert.equal(result.filters.includeFunny, true);
	assert.equal(result.filters.includeDigital, false);
	assert.equal(result.filters.search, "Urza");
	const invalid = parseSetIndexBlock("sort: eval(foo)\nformat: freeform\nview: mobile", "en");
	assert.equal(invalid.errors.length, 3);
});

test("Urza block has exactly three historical expansions and bounded dates", async () => {
	const { groupIndexSets, groupDateRange } = await load("src/renderer/set-index-model.ts");
	const groups = groupIndexSets(sets.slice(0, 4), "block", "fr");
	const urza = groups.find((group) => group.id === "block:usg");
	assert.equal(urza.name, "Bloc Urza");
	assert.deepEqual(urza.sets.map((s) => s.code), ["usg", "ulg", "uds"]);
	assert.equal(groupDateRange(urza, "fr"), "10/1998 – 06/1999");
	const standalone = groups.find((group) => group.id === "set:hml");
	assert.equal(standalone.name, "Terres natales — Homelands");
	assert.equal(standalone.sets.length, 1);
});

test("generic Commander grouping does not fabricate a traditional historical block", async () => {
	const { groupIndexSets } = await load("src/renderer/set-index-model.ts");
	const groups = groupIndexSets(sets, "block", "en");
	assert.equal(groups.find((g) => g.id === "set:who").sets.length, 1);
	assert.equal(groups.some((g) => g.id === "block:cmd"), false);
});

test("filter excludes funny/digital by default and recognizes known Universes Beyond", async () => {
	const { DEFAULT_INDEX_FILTERS, filterIndexSets, universesBeyondClassification } = await load("src/renderer/set-index-model.ts");
	assert.equal(universesBeyondClassification(sets[4]), "yes");
	assert.equal(universesBeyondClassification(sets[6]), "yes");
	assert.equal(universesBeyondClassification(sets[0]), "no");
	const first = filterIndexSets(sets, { ...DEFAULT_INDEX_FILTERS }, "fr", 2026);
	assert.equal(first.some((s) => s.code === "unf"), false);
	assert.equal(first.some((s) => s.code === "anb"), false);
	const onlyUB = filterIndexSets(sets, { ...DEFAULT_INDEX_FILTERS, universesBeyond: "only" }, "fr", 2026);
	assert.deepEqual(onlyUB.map((s) => s.code).sort(), ["ltr", "who"]);
	const excluded = filterIndexSets(sets, { ...DEFAULT_INDEX_FILTERS, universesBeyond: "exclude" }, "fr", 2026);
	assert.equal(excluded.some((s) => s.code === "ltr"), false);
	const funny = filterIndexSets(sets, { ...DEFAULT_INDEX_FILTERS, includeFunny: true, includeDigital: true }, "en", 2026);
	assert.equal(funny.length, sets.length);
});

test("date order works in both directions and French block search resolves accents", async () => {
	const { DEFAULT_INDEX_FILTERS, filterIndexSets } = await load("src/renderer/set-index-model.ts");
	const asc = filterIndexSets(sets, { ...DEFAULT_INDEX_FILTERS, sort: "date-asc" }, "en", 2026);
	const desc = filterIndexSets(sets, { ...DEFAULT_INDEX_FILTERS, sort: "date-desc" }, "en", 2026);
	assert.equal(asc[0].code, "hml");
	assert.equal(desc[0].code, "who");
	const block = filterIndexSets(sets, { ...DEFAULT_INDEX_FILTERS, search: "Urza" }, "fr", 2026);
	assert.deepEqual(block.map((s) => s.code).sort(), ["uds", "ulg", "usg"]);
	const translated = filterIndexSets(sets, { ...DEFAULT_INDEX_FILTERS, search: "Terres natales" }, "fr", 2026);
	assert.equal(translated[0].code, "hml");
});

test("format filter is an explicitly approximate historical era, not card legality", async () => {
	const { DEFAULT_INDEX_FILTERS, filterIndexSets } = await load("src/renderer/set-index-model.ts");
	const modern = filterIndexSets(sets, { ...DEFAULT_INDEX_FILTERS, format: "modern" }, "en", 2026);
	assert.equal(modern.some((s) => s.code === "usg"), false);
	assert.equal(modern.some((s) => s.code === "ltr"), false); // draft innovation: not a main set-era claim
	const commanderProducts = filterIndexSets(sets, { ...DEFAULT_INDEX_FILTERS, format: "commander-products" }, "en", 2026);
	assert.deepEqual(commanderProducts.map((s) => s.code), ["who"]);
});

test("set icons accept only the known Scryfall SVG origin", async () => {
	const { setIconUrl } = await load("src/renderer/set-index-model.ts");
	assert.equal(setIconUrl(sets[0]), "https://svgs.scryfall.io/sets/usg.svg");
	assert.equal(setIconUrl({ id: "1", code: "x", name: "X", icon_svg_uri: "https://evil.example/x.svg" }), null);
	assert.equal(setIconUrl({ id: "2", code: "x", name: "X", icon_svg_uri: "http://svgs.scryfall.io/x.svg" }), null);
});

test("legality indicators distinguish banned, restricted, nonlegal, and English off-mode", async () => {
	const { cardLegalityBadge } = await load("src/renderer/legality-badge.ts");
	const card = { id: "card", name: "Example", legalities: {
		modern: "banned", vintage: "restricted", standard: "not_legal", commander: "legal",
	} };
	assert.equal(cardLegalityBadge(card, "modern", "fr").status, "banned");
	assert.match(cardLegalityBadge(card, "modern", "fr").label, /Interdite/);
	assert.equal(cardLegalityBadge(card, "vintage", "fr").status, "restricted");
	assert.equal(cardLegalityBadge(card, "standard", "fr").status, "not_legal");
	assert.equal(cardLegalityBadge(card, "commander", "fr"), null);
	assert.equal(cardLegalityBadge(card, "off", "fr"), null);
});

test("catalog extension block accepts a local legality display format", async () => {
	const { parseCatalogBlock } = await load("src/parser/catalog-parser.ts");
	const parsed = parseCatalogBlock("language: fr\nset: usg\nformat: vintage", "extension", "en");
	assert.equal(parsed.legality, "vintage");
	assert.equal(parsed.errors.length, 0);
	const invalid = parseCatalogBlock("legality: on", "extension", "en");
	assert.equal(invalid.errors.length, 1);
});
