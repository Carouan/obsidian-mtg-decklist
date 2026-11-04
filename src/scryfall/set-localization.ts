import type { CardLanguage } from "../utils/languages";
import type { ScryfallSet } from "./types";

/**
 * Curated French set-name aliases. Scryfall's /sets endpoint supplies only
 * the English name; this limited mapping is a search/display convenience,
 * not a claim that every MTG expansion has been translated here.
 * Add verified aliases by Scryfall set code; unknown sets stay in English.
 */
const FRENCH_SET_NAMES: Readonly<Record<string, string>> = {
	all: "Alliances",
	csp: "Souffle glaciaire",
	dst: "Sombracier",
	exo: "Exode",
	fem: "Empires déchus",
	hml: "Terres natales",
	ice: "Ère glaciaire",
	jud: "Jugement",
	lgn: "Légions",
	mir: "Mirage",
	mmq: "Masques de Mercadia",
	nem: "Némésis",
	ody: "Odyssée",
	ons: "Carnage",
	pcy: "Prophétie",
	scg: "Fléau",
	sth: "Forteresse",
	tmp: "Tempête",
	tor: "Tourment",
	uds: "La Destinée d'Urza",
	ulg: "L'Héritage d'Urza",
	usg: "L'Épopée d'Urza",
	vis: "Visions",
	wth: "Aquilon",
};

export function normalizeSetName(value: string): string {
	return value.normalize("NFKD")
		.replace(/[\u0300-\u036f]/g, "")
		.replace(/[’']/g, " ")
		.toLocaleLowerCase("en")
		.replace(/[^a-z0-9]+/g, " ")
		.trim();
}

export function frenchSetName(set: Pick<ScryfallSet, "code">, language: CardLanguage): string | null {
	return language === "fr" ? FRENCH_SET_NAMES[set.code.toLowerCase()] ?? null : null;
}

export function displaySetName(set: Pick<ScryfallSet, "name" | "code">, language: CardLanguage): string {
	const translated = frenchSetName(set, language);
	return translated && translated !== set.name ? `${translated} — ${set.name}` : set.name;
}

export function setMatchesQuery(set: Pick<ScryfallSet, "name" | "code">, query: string, language: CardLanguage): boolean {
	const term = normalizeSetName(query);
	if (!term) return true;
	return [set.name, set.code, frenchSetName(set, language) ?? ""]
		.some((label) => normalizeSetName(label).includes(term));
}

export function resolveSetByName(sets: ScryfallSet[], query: string, language: CardLanguage): ScryfallSet | null {
	const term = normalizeSetName(query);
	if (!term) return null;
	return sets.find((set) =>
		set.code.toLowerCase() === term ||
		normalizeSetName(set.name) === term ||
		normalizeSetName(frenchSetName(set, language) ?? "") === term,
	) ?? null;
}
