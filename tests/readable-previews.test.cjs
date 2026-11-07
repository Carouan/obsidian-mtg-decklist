const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const Module = require("node:module");
const { cwd } = require("node:process");
const esbuild = require("esbuild");

async function load(relativePath) {
	const absolute = path.resolve(cwd(), relativePath);
	const built = await esbuild.build({
		entryPoints: [absolute], bundle: true, platform: "node", format: "cjs", write: false,
		plugins: [{
			name: "mock-obsidian",
			setup(build) {
				build.onResolve({ filter: /^obsidian$/ }, () => ({ path: "obsidian", namespace: "test" }));
				build.onLoad({ filter: /.*/, namespace: "test" }, () => ({
					contents: "export const requestUrl = (options) => globalThis.__testScryfallRequest(options);",
					loader: "js",
				}));
			},
		}],
	});
	const mod = new Module(absolute, module);
	mod.filename = absolute;
	mod.paths = module.paths;
	mod._compile(built.outputFiles[0].text, absolute);
	return mod.exports;
}

test("a confirmed blurry French scan is replaced by a verified English HD scan", async () => {
	const { preferredImageCard, cardImageQualityScore } = await load("src/scryfall/card-presentation.ts");
	const french = { id: "fr", name: "Fable of the Mirror-Breaker", printed_name: "Fable du brise-miroir",
		lang: "fr", image_status: "lowres", highres_image: false, image_uris: { normal: "fr-blurry.jpg" } };
	const english = { id: "en", name: french.name, lang: "en", image_status: "highres_scan",
		highres_image: true, image_uris: { normal: "en-hd.jpg" } };
	assert.equal(cardImageQualityScore(french), 1);
	assert.equal(cardImageQualityScore(english), 4);
	assert.equal(preferredImageCard(french, english, "readable"), english);
	assert.equal(preferredImageCard(french, english, "localized"), french);
	assert.equal(french.printed_name, "Fable du brise-miroir", "language data is preserved");
});

test("a French HD image stays French and English is not automatically treated as HD", async () => {
	const { preferredImageCard } = await load("src/scryfall/card-presentation.ts");
	const frHD = { id: "fr", lang: "fr", image_status: "highres_scan", image_uris: { normal: "fr-hd.jpg" } };
	const enHD = { id: "en", lang: "en", highres_image: true, image_uris: { normal: "en-hd.jpg" } };
	const frLow = { ...frHD, id: "fr-low", image_status: "lowres" };
	const enUnknown = { id: "en-unknown", lang: "en", image_uris: { normal: "unknown.jpg" } };
	assert.equal(preferredImageCard(frHD, enHD, "readable"), frHD);
	assert.equal(preferredImageCard(frLow, enUnknown, "readable"), frLow);
	assert.equal(preferredImageCard(frLow, enHD, "readable"), enHD);
	assert.equal(preferredImageCard(frLow, undefined, "readable"), frLow);
});

test("French placeholders fall back to English images but keep localized text", async () => {
	const { preferredImageCard, cardTextFaces } = await load("src/scryfall/card-presentation.ts");
	const fr = { id: "fr", name: "Apocalypse Chime", lang: "fr", printed_name: "Carillon de l'apocalypse",
		printed_text: "Texte en français.", image_status: "placeholder", image_uris: { normal: "placeholder.jpg" } };
	const en = { id: "en", name: "Apocalypse Chime", lang: "en", image_status: "highres_scan",
		oracle_text: "Updated Oracle rules text.", image_uris: { normal: "en.jpg" } };
	assert.equal(preferredImageCard(fr, en, "readable"), en);
	assert.equal(cardTextFaces(fr, en)[0].printedText, "Texte en français.");
	assert.equal(cardTextFaces(fr, en)[0].oracleText, "Updated Oracle rules text.");
});

test("double-face rules text follows the chosen face and split cards preserve both text faces", async () => {
	const { cardTextFaces } = await load("src/scryfall/card-presentation.ts");
	const fr = { lang: "fr", card_faces: [
		{ name: "Front", printed_name: "Recto FR", printed_text: "Texte recto FR." },
		{ name: "Back", printed_name: "Verso FR", printed_text: "Texte verso FR." },
	] };
	const en = { name: "Front // Back", card_faces: [
		{ name: "Front", oracle_text: "Current front Oracle." },
		{ name: "Back", oracle_text: "Current back Oracle." },
	] };
	const result = cardTextFaces(fr, en);
	assert.equal(result.length, 2);
	assert.equal(result[0].localizedName, "Recto FR");
	assert.equal(result[1].printedText, "Texte verso FR.");
	assert.equal(result[1].oracleText, "Current back Oracle.");
});

test("current Oracle lookup uses exact Scryfall card ID, a short cache, and a safe URL", async () => {
	const { ScryfallClient, validateCatalogUrl } = await load("src/scryfall/client.ts");
	const id = "9837c765-1d04-4929-bfcd-c015686e76ab";
	let requests = 0;
	globalThis.__testScryfallRequest = async (options) => {
		requests++;
		assert.equal(options.url, `https://api.scryfall.com/cards/${id}`);
		return { status: 200, json: { id, name: "Updated example", oracle_text: "Current Oracle text." }, headers: {} };
	};
	assert.equal(validateCatalogUrl(`https://api.scryfall.com/cards/${id}`), `https://api.scryfall.com/cards/${id}`);
	assert.throws(() => validateCatalogUrl("https://evil.example/cards/" + id));
	assert.throws(() => validateCatalogUrl("https://api.scryfall.com/cards/named?exact=Test"));
	const client = new ScryfallClient({});
	assert.equal((await client.currentCardText({ id })).oracle_text, "Current Oracle text.");
	assert.equal((await client.currentCardText({ id })).oracle_text, "Current Oracle text.");
	assert.equal(requests, 1);
	assert.equal(await client.currentCardText({ id: "bogus" }), null);
});
