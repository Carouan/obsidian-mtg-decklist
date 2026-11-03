import { isSupportedLanguage, type CardLanguage } from "../utils/languages";

export type CatalogKind = "extension" | "cardlist";
export type CatalogView = "list" | "gallery";
export type CatalogSort = "color" | "type" | "mana" | "name" | "set";
export type CatalogColor = "w" | "u" | "b" | "r" | "g" | "c" | "m";

export interface CatalogOptions {
	kind: CatalogKind;
	language: CardLanguage;
	view: CatalogView;
	sort: CatalogSort;
	set: string;
	card: string;
	colors: CatalogColor[];
	type: string;
	rarity: string;
	unique: "set" | "prints";
	errors: string[];
}

const COLOR_MAP: Record<string, CatalogColor> = {
	w: "w", white: "w", blanc: "w",
	u: "u", blue: "u", bleu: "u",
	b: "b", black: "b", noir: "b",
	r: "r", red: "r", rouge: "r",
	g: "g", green: "g", vert: "g",
	c: "c", colorless: "c", incolore: "c",
	m: "m", multicolor: "m", multicolore: "m",
};
export const CATALOG_TYPES = ["any", "creature", "instant", "sorcery", "artifact", "enchantment", "planeswalker", "land", "battle"] as const;
export const CATALOG_RARITIES = ["any", "common", "uncommon", "rare", "mythic"] as const;
const TYPE_ALIASES: Record<string, string> = {
	creature: "creature", creatures: "creature", créature: "creature", créatures: "creature",
	instant: "instant", éphémère: "instant", ephemere: "instant",
	sorcery: "sorcery", rituel: "sorcery",
	artifact: "artifact", artefact: "artifact",
	enchantment: "enchantment", enchantement: "enchantment",
	planeswalker: "planeswalker", arpenteur: "planeswalker",
	land: "land", terrain: "land", terrains: "land",
	battle: "battle", bataille: "battle",
};
export const COLOR_LABELS: Record<CatalogColor, string> = {
	w: "W", u: "U", b: "B", r: "R", g: "G", c: "C", m: "Multicolor",
};

export function parseCatalogBlock(source: string, kind: CatalogKind, fallbackLanguage: CardLanguage): CatalogOptions {
	const options: CatalogOptions = {
		kind, language: fallbackLanguage, view: kind === "extension" ? "gallery" : "list",
		sort: kind === "extension" ? "color" : "set",
		set: "", card: "", colors: [], type: "any", rarity: "any", unique: "set", errors: [],
	};
	for (const line of source.split(/\r?\n/)) {
		const value = line.trim();
		if (!value || value.startsWith("//") || value.startsWith("#")) continue;
		const match = value.match(/^([\w-]+)\s*:\s*(.*)$/);
		if (!match) { options.errors.push(`Unrecognized option: ${value}`); continue; }
		const key = (match[1] ?? "").toLowerCase();
		const raw = (match[2] ?? "").trim();
		const normalized = raw.toLowerCase();
		switch (key) {
			case "language": case "lang":
				if (isSupportedLanguage(normalized)) options.language = normalized;
				else options.errors.push(`Unsupported language: ${raw}`);
				break;
			case "set": case "ext-code": case "ext-name":
				options.set = raw.slice(0, 80);
				break;
			case "card": case "name": options.card = raw.slice(0, 200); break;
			case "view":
				if (normalized === "gallery" || normalized === "list") options.view = normalized;
				else options.errors.push(`Unsupported view: ${raw}`);
				break;
			case "sort": case "sortby":
				if (["color", "type", "mana", "name", "set"].includes(normalized)) options.sort = normalized as CatalogSort;
				else options.errors.push(`Unsupported sort: ${raw}`);
				break;
			case "color": case "colors":
				options.colors = [];
				for (const item of normalized.split(/[\s,;]+/)) {
					if (!item) continue;
					const code = COLOR_MAP[item];
					if (!code) options.errors.push(`Unknown color: ${item}`);
					else if (!options.colors.includes(code)) options.colors.push(code);
				}
				break;
			case "type":
				options.type = TYPE_ALIASES[normalized] ?? normalized;
				if (!CATALOG_TYPES.includes(options.type as typeof CATALOG_TYPES[number])) {
					options.errors.push(`Unknown card type: ${raw}`); options.type = "any";
				}
				break;
			case "rarity":
				options.rarity = normalized;
				if (!CATALOG_RARITIES.includes(normalized as typeof CATALOG_RARITIES[number])) {
					options.errors.push(`Unknown rarity: ${raw}`); options.rarity = "any";
				}
				break;
			case "unique":
				if (normalized === "set" || normalized === "prints") options.unique = normalized;
				else options.errors.push(`Unknown unique mode: ${raw}`);
				break;
			default: options.errors.push(`Unknown option: ${key}`);
		}
	}
	return options;
}

/** Keep query arguments on a fixed allowlist; never interpolate arbitrary user syntax. */
export function buildExtensionQuery(code: string, options: Pick<CatalogOptions, "colors" | "type" | "rarity">): string {
	if (!/^[a-z0-9]{2,6}$/i.test(code)) throw new Error("Invalid Scryfall set code");
	const clauses = [`set:${code.toLowerCase()}`];
	if (options.colors.length) {
		const colors = options.colors.map((c) => `c:${c}`);
		clauses.push(colors.length > 1 ? `(${colors.join(" or ")})` : colors[0]!);
	}
	if (options.type !== "any") {
		if (!CATALOG_TYPES.includes(options.type as typeof CATALOG_TYPES[number])) throw new Error("Invalid card type");
		clauses.push(`t:${options.type}`);
	}
	if (options.rarity !== "any") {
		if (!CATALOG_RARITIES.includes(options.rarity as typeof CATALOG_RARITIES[number])) throw new Error("Invalid rarity");
		clauses.push(`r:${options.rarity}`);
	}
	return clauses.join(" ");
}
