const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const Module = require("node:module");
const { cwd } = require("node:process");
const esbuild = require("esbuild");

async function loadTypeScript(relativePath) {
	const absolutePath = path.resolve(cwd(), relativePath);
	const result = await esbuild.build({
		entryPoints: [absolutePath], bundle: true, platform: "node", format: "cjs", write: false,
		plugins: [{
			name: "mock-obsidian",
			setup(build) {
				build.onResolve({ filter: /^obsidian$/ }, () => ({ path: "obsidian", namespace: "test" }));
				build.onLoad({ filter: /.*/, namespace: "test" }, () => ({
					contents: [
						"export const requestUrl = (options) => globalThis.__testScryfallRequest(options);",
						"export const Platform = { isMobile: false, isMobileApp: false };",
						"export class EditorSuggest { constructor() {} setInstructions() {} }",
					].join("\n"),
					loader: "js",
				}));
			},
		}],
	});
	const loaded = new Module(absolutePath, module);
	loaded.filename = absolutePath;
	loaded.paths = module.paths;
	loaded._compile(result.outputFiles[0].text, absolutePath);
	return loaded.exports;
}

test("extension config supports colors, type, rarity and gallery without loading a full set", async () => {
	const { parseCatalogBlock, buildExtensionQuery } = await loadTypeScript("src/parser/catalog-parser.ts");
	const cfg = parseCatalogBlock([
		"language: fr", "set: Mirage", "color: red, blue", "type: creature",
		"rarity: rare", "view: gallery", "sortby: mana",
	].join("\n"), "extension", "en");
	assert.deepEqual(cfg.errors, []);
	assert.equal(cfg.set, "Mirage");
	assert.deepEqual(cfg.colors, ["r", "u"]);
	assert.equal(cfg.type, "creature");
	assert.equal(cfg.rarity, "rare");
	assert.equal(cfg.sort, "mana");
	assert.equal(cfg.view, "gallery");
	assert.equal(buildExtensionQuery("mir", cfg), "set:mir (c:r or c:u) t:creature r:rare");
	assert.throws(() => buildExtensionQuery("mir or c:m", cfg), /Invalid Scryfall set code/);
});

test("cardlist supports French card names and limits invalid directives", async () => {
	const { parseCatalogBlock } = await loadTypeScript("src/parser/catalog-parser.ts");
	const cfg = parseCatalogBlock("language: fr\ncard: Foudre\nunique: set\nview: gallery", "cardlist", "en");
	assert.equal(cfg.card, "Foudre");
	assert.equal(cfg.language, "fr");
	assert.equal(cfg.unique, "set");
	assert.equal(cfg.errors.length, 0);
	const bad = parseCatalogBlock("color: red, external\ntype: unknown\nrarity: legendary", "extension", "fr");
	assert.equal(bad.errors.length, 3);
	assert.deepEqual(bad.colors, ["r"]);
	assert.equal(bad.type, "any");
});

test("suggestions expand templates explicitly and emit parseable decklists", async () => {
	const { quickTemplateSuggestions } = await loadTypeScript("src/editor/quick-templates.ts");
	const { parseDecklist } = await loadTypeScript("src/parser/decklist-parser.ts");
	const deckTemplates = ["deck-cmd-fr", "deck-60-fr", "deck-vintage-en", "deck-cmd-auto-fr"];
	for (const trigger of deckTemplates) {
		const template = quickTemplateSuggestions(trigger)[0];
		assert.equal(template.trigger, trigger);
		const source = template.content.slice(11, -3).trim();
		const parsed = parseDecklist(source);
		assert.equal(parsed.errors.length, 0);
		assert.ok(parsed.directives.legality);
	}
	assert.equal(quickTemplateSuggestions("foudre-ext")[0].content.includes("card: foudre"), true);
	assert.equal(quickTemplateSuggestions("ext-mirage")[0].content.includes("set: mirage"), true);
	assert.deepEqual(quickTemplateSuggestions("ordinary paragraph"), []);
});

test("gallery selects normal-sized images but preserves double-faced front images", async () => {
	const { galleryImageUrl } = await loadTypeScript("src/renderer/card-gallery.ts");
	assert.equal(galleryImageUrl({ image_uris: { normal: "normal.jpg", png: "full.png" } }), "normal.jpg");
	assert.equal(galleryImageUrl({ card_faces: [{ image_uris: { normal: "front.jpg" } }] }), "front.jpg");
	assert.equal(galleryImageUrl({}), null);
});

test("catalog validates Scryfall next_page origin and path", async () => {
	const { validateCatalogUrl } = await loadTypeScript("src/scryfall/client.ts");
	assert.match(validateCatalogUrl("https://api.scryfall.com/cards/search?page=2"), /page=2/);
	assert.throws(() => validateCatalogUrl("https://evil.example/cards/search?page=2"));
	assert.throws(() => validateCatalogUrl("http://api.scryfall.com/cards/search?page=2"));
	assert.throws(() => validateCatalogUrl("https://api.scryfall.com:8443/cards/search?page=2"));
	assert.throws(() => validateCatalogUrl("https://api.scryfall.com/cards/named?fuzzy=test"));
});

test("French fuzzy card resolution does not poison English Oracle-name cache", async () => {
	const { ScryfallClient } = await loadTypeScript("src/scryfall/client.ts");
	globalThis.window = { setTimeout };
	const cache = new Map();
	globalThis.__testScryfallRequest = async () => ({
		status: 200,
		json: { id: "fr-bolt", name: "Lightning Bolt", printed_name: "Foudre", lang: "fr", oracle_id: "bolt" },
		headers: {},
	});
	const client = new ScryfallClient({
		get: (name) => cache.get(name),
		set: (name, card) => cache.set(name, card),
		hasNotFound: () => false,
	});
	const found = await client.fetchCardByName("Foudre");
	assert.equal(found.printed_name, "Foudre");
	assert.equal(cache.get("Foudre").lang, "fr");
	assert.equal(cache.get("Lightning Bolt"), undefined);
});

test("missing localized printing is cached negatively, without blocking English fallback", async () => {
	const { ScryfallClient } = await loadTypeScript("src/scryfall/client.ts");
	globalThis.window = { setTimeout };
	let count = 0;
	globalThis.__testScryfallRequest = async () => { count++; return { status: 404, json: {}, headers: {} }; };
	const client = new ScryfallClient({});
	const card = { id: "en-123", name: "Test Card", set: "mir", collector_number: "99" };
	assert.equal(await client.exactLocalizedPrinting(card, "fr"), null);
	assert.equal(await client.exactLocalizedPrinting(card, "fr"), null);
	assert.equal(count, 1);
});

test("catalog fetches only one page, reuses memory cache and validates exact French set printing", async () => {
	const { ScryfallClient } = await loadTypeScript("src/scryfall/client.ts");
	globalThis.window = { setTimeout };
	const calls = [];
	globalThis.__testScryfallRequest = async ({ url }) => {
		calls.push(url);
		if (url.includes("/search?")) return {
			status: 200,
			json: { data: [{ id: "1", name: "Shock", set: "mir", collector_number: "1" }], has_more: true,
				next_page: "https://api.scryfall.com/cards/search?page=2", total_cards: 220 },
			headers: {},
		};
		if (url.endsWith("/mir/1/fr")) return {
			status: 200,
			json: { id: "fr", name: "Shock", set: "mir", collector_number: "1", lang: "fr", printed_name: "Choc" },
			headers: {},
		};
		return { status: 404, json: {}, headers: {} };
	};
	const client = new ScryfallClient({});
	const page = await client.searchCatalog("set:mir c:r", { unique: "prints", order: "set" });
	assert.equal(page.data.length, 1);
	assert.equal(page.total_cards, 220);
	assert.equal(page.has_more, true);
	assert.equal(calls.length, 1);
	await client.searchCatalog("set:mir c:r", { unique: "prints", order: "set" });
	assert.equal(calls.length, 1, "same query reused the bounded in-memory cache");
	const fr = await client.exactLocalizedPrinting(page.data[0], "fr");
	assert.equal(fr.printed_name, "Choc");
	assert.equal(fr.set, "mir");
	assert.equal(await client.exactLocalizedPrinting(page.data[0], "en"), null);
	assert.equal(calls.length, 2);
	await client.searchCatalog("set:mir c:r", { nextPage: page.next_page });
	assert.equal(calls.length, 3, "next page requires an explicit request");
});
