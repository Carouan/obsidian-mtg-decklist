const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const Module = require("node:module");
const { cwd } = require("node:process");
const esbuild = require("esbuild");

async function load(relative) {
	const absolute = path.resolve(cwd(), relative);
	const built = await esbuild.build({
		entryPoints: [absolute], bundle: true, platform: "node", format: "cjs", write: false,
	});
	const mod = new Module(absolute, module);
	mod.filename = absolute;
	mod.paths = module.paths;
	mod._compile(built.outputFiles[0].text, absolute);
	return mod.exports;
}

test("transform cards expose both physical faces, including French printed names", async () => {
	const { cardImageFaces } = await load("src/ui/card-image-faces.ts");
	const card = {
		name: "Delver of Secrets // Insectile Aberration",
		layout: "transform",
		card_faces: [
			{ name: "Delver of Secrets", printed_name: "Aberration secrète", image_uris: { normal: "front.jpg", png: "front.png" } },
			{ name: "Insectile Aberration", printed_name: "Aberration insectoïde", image_uris: { normal: "back.jpg", png: "back.png" } },
		],
	};
	assert.deepEqual(cardImageFaces(card, "normal"), [
		{ url: "front.jpg", name: "Aberration secrète" },
		{ url: "back.jpg", name: "Aberration insectoïde" },
	]);
	assert.deepEqual(cardImageFaces(card, "png").map(f => f.url), ["front.png", "back.png"]);
});

test("modal double-faced, tokens, reversible and art-series cards have switchable faces", async () => {
	const { cardImageFaces } = await load("src/ui/card-image-faces.ts");
	for (const layout of ["modal_dfc", "double_faced_token", "reversible_card", "art_series"]) {
		const faces = cardImageFaces({
			name: "Front // Back", layout,
			card_faces: [
				{ name: "Front", image_uris: { normal: "one.jpg" } },
				{ name: "Back", image_uris: { normal: "two.jpg" } },
			],
		}, "normal");
		assert.deepEqual(faces.map(face => face.url), ["one.jpg", "two.jpg"], layout);
	}
});

test("split, adventure and flip layouts show one composite front, not a false back", async () => {
	const { cardImageFaces } = await load("src/ui/card-image-faces.ts");
	for (const layout of ["split", "adventure", "flip"]) {
		const result = cardImageFaces({
			name: "Front // Adventure", layout,
			image_uris: { normal: "composite.jpg" },
			card_faces: [{ name: "Front" }, { name: "Adventure" }],
		}, "normal");
		assert.equal(result.length, 1);
		assert.equal(result[0].url, "composite.jpg");
	}
});

test("explicit split layout never invents a physical back from separate face images", async () => {
	const { cardImageFaces } = await load("src/ui/card-image-faces.ts");
	const result = cardImageFaces({
		name: "Split // Left", layout: "split",
		card_faces: [
			{ name: "Split", image_uris: { normal: "part-a.jpg" } },
			{ name: "Left", image_uris: { normal: "part-b.jpg" } },
		],
	}, "normal");
	assert.equal(result.length, 1);
	assert.equal(result[0].url, "part-a.jpg");
});

test("single-face and incomplete DFC data fail gracefully", async () => {
	const { cardImageFaces, imageUrlForQuality } = await load("src/ui/card-image-faces.ts");
	assert.deepEqual(cardImageFaces({ name: "Island", image_uris: { normal: "island.jpg" } }, "normal"), [
		{ url: "island.jpg", name: "Island" },
	]);
	const noBack = { name: "Incomplete // Missing", layout: "transform",
		card_faces: [
			{ name: "Incomplete", image_uris: { normal: "front.jpg" } },
			{ name: "Missing" },
		],
	};
	assert.equal(cardImageFaces(noBack, "normal").length, 1);
	assert.equal(cardImageFaces(noBack, "normal")[0].url, "front.jpg");
	assert.deepEqual(cardImageFaces({ name: "Unknown", layout: "transform" }, "normal"), []);
	assert.equal(imageUrlForQuality({ normal: "normal.jpg" }, "png"), "normal.jpg");
});

test("two distinct image faces still work with older cached cards lacking layout", async () => {
	const { cardImageFaces } = await load("src/ui/card-image-faces.ts");
	const result = cardImageFaces({
		name: "Front // Back",
		card_faces: [
			{ name: "Front", image_uris: { normal: "a.jpg" } },
			{ name: "Back", image_uris: { normal: "b.jpg" } },
		],
	}, "normal");
	assert.equal(result.length, 2);
});
