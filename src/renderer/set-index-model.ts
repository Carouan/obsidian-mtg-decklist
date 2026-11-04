import type { CardLanguage } from "../utils/languages";
import type { ScryfallSet } from "../scryfall/types";
import { displaySetName, normalizeSetName, setMatchesQuery } from "../scryfall/set-localization";
import overrides from "../data/set-overrides.json";

export type UniversesBeyondFilter = "all" | "exclude" | "only";
export type SetIndexSort = "date-desc" | "date-asc" | "name" | "cards-desc";
export type SetIndexGrouping = "block" | "year" | "type" | "none";
export type SetFormatHint = "all" | "standard" | "pioneer" | "modern" | "legacy" | "vintage" | "commander-products";
export type SetIndexView = "table" | "gallery";

export interface SetIndexFilters {
	search: string;
	category: string;
	universesBeyond: UniversesBeyondFilter;
	format: SetFormatHint;
	includeFunny: boolean;
	includeDigital: boolean;
	sort: SetIndexSort;
	group: SetIndexGrouping;
	view: SetIndexView;
}

export interface SetIndexGroup {
	id: string;
	name: string;
	start: string | null;
	end: string | null;
	sets: ScryfallSet[];
}

export const DEFAULT_INDEX_FILTERS: SetIndexFilters = {
	search: "", category: "all", universesBeyond: "all",
	format: "all", includeFunny: false, includeDigital: false,
	sort: "date-desc", group: "block", view: "table",
};

const ubCodes = new Set<string>(overrides.universes_beyond.codes);
const funnyCodes = new Set<string>(overrides.funny_set_codes);
const blockNamesFr: Record<string, string> = overrides.block_names_fr;

/** Only a positive/identified UB match is authoritative: unknown remains unknown. */
export function universesBeyondClassification(set: ScryfallSet): "yes" | "no" | "unknown" {
	const code = set.code.toLowerCase();
	if (ubCodes.has(code)) return "yes";
	const name = set.name.toLowerCase();
	if (overrides.universes_beyond.name_contains.some((part) => name.includes(part))) return "yes";
	if (set.released_at && set.released_at < "2021-01-01") return "no";
	return "unknown";
}

export function isFunnySet(set: ScryfallSet): boolean {
	return set.set_type === "funny" || funnyCodes.has(set.code.toLowerCase());
}

/**
 * This is a historical/era hint, NOT exact card legality nor Standard rotation.
 * Current bans and restrictions must come from card.legalities in Scryfall.
 */
export function formatEraHint(set: ScryfallSet, format: SetFormatHint, nowYear: number): boolean {
	if (format === "all") return true;
	if (format === "commander-products") return set.set_type === "commander";
	if (set.digital || isFunnySet(set)) return false;
	if (format === "legacy" || format === "vintage") return true;
	if (set.set_type !== "expansion" && set.set_type !== "core") return false;
	if (!set.released_at) return false;
	if (format === "modern") return set.released_at >= "2003-07-28";
	if (format === "pioneer") return set.released_at >= "2012-10-05";
	// Approximate recent-release window only; do not label it 'Standard legal'.
	return format === "standard" && Number(set.released_at.slice(0, 4)) >= nowYear - 3;
}

export function filterIndexSets(
	sets: ScryfallSet[],
	filters: SetIndexFilters,
	language: CardLanguage,
	nowYear = new Date().getUTCFullYear(),
): ScryfallSet[] {
	const search = normalizeSetName(filters.search);
	return sets.filter((set) => {
		if (!filters.includeFunny && isFunnySet(set)) return false;
		if (!filters.includeDigital && set.digital === true) return false;
		if (filters.category !== "all" && set.set_type !== filters.category) return false;
		const ub = universesBeyondClassification(set);
		if (filters.universesBeyond === "only" && ub !== "yes") return false;
		if (filters.universesBeyond === "exclude" && ub === "yes") return false;
		if (!formatEraHint(set, filters.format, nowYear)) return false;
		if (!search) return true;
		const block = set.block ?? "";
		return setMatchesQuery(set, search, language) ||
			normalizeSetName(block).includes(search) ||
			normalizeSetName(blockNamesFr[set.block_code ?? ""] ?? "").includes(search);
	}).sort((a, b) => sortIndexSets(a, b, filters.sort, language));
}

export function sortIndexSets(a: ScryfallSet, b: ScryfallSet, sort: SetIndexSort, language: CardLanguage): number {
	if (sort === "cards-desc") return (b.card_count ?? 0) - (a.card_count ?? 0) || a.code.localeCompare(b.code);
	if (sort === "name") return displaySetName(a, language).localeCompare(displaySetName(b, language), language);
	const left = a.released_at ?? "";
	const right = b.released_at ?? "";
	const delta = sort === "date-asc" ? left.localeCompare(right) : right.localeCompare(left);
	return delta || a.code.localeCompare(b.code);
}

export function groupIndexSets(sets: ScryfallSet[], groupBy: SetIndexGrouping, language: CardLanguage): SetIndexGroup[] {
	if (groupBy === "none") return sets.map((set) => ({
		id: set.code, name: displaySetName(set, language),
		start: set.released_at ?? null, end: set.released_at ?? null, sets: [set],
	}));
	const groups = new Map<string, SetIndexGroup>();
	for (const set of sets) {
		let id: string;
		let name: string;
		if (groupBy === "block" && set.set_type === "expansion" && set.block_code && set.block_code !== "cmd") {
			id = "block:" + set.block_code;
			name = language === "fr"
				? blockNamesFr[set.block_code] ?? set.block ?? set.name
				: set.block ?? set.name;
		} else if (groupBy === "year") {
			id = "year:" + (set.released_at?.slice(0, 4) ?? "unknown");
			name = set.released_at?.slice(0, 4) ?? "?";
		} else if (groupBy === "type") {
			id = "type:" + (set.set_type ?? "other");
			name = set.set_type ?? "other";
		} else {
			// No actual block: never imply that arbitrary Commander or promo
			// products belong to one old-style three-set block.
			id = "set:" + set.code;
			name = displaySetName(set, language);
		}
		let group = groups.get(id);
		if (!group) {
			group = { id, name, sets: [], start: null, end: null };
			groups.set(id, group);
		}
		group.sets.push(set);
		if (set.released_at && (!group.start || set.released_at < group.start)) group.start = set.released_at;
		if (set.released_at && (!group.end || set.released_at > group.end)) group.end = set.released_at;
	}
	return [...groups.values()];
}

export function groupDateRange(group: SetIndexGroup, language: CardLanguage): string {
	const format = (value: string) => `${value.slice(5, 7)}/${value.slice(0, 4)}`;
	if (!group.start) return language === "fr" ? "Date inconnue" : "Unknown date";
	return group.start === group.end ? format(group.start) : `${format(group.start)} – ${format(group.end ?? group.start)}`;
}

export function setIconUrl(set: ScryfallSet): string | null {
	if (!set.icon_svg_uri) return null;
	try {
		const url = new URL(set.icon_svg_uri);
		return url.protocol === "https:" && url.hostname === "svgs.scryfall.io" ? url.href : null;
	} catch { return null; }
}
