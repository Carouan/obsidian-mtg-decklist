import { isSupportedLanguage, type CardLanguage } from "../utils/languages";
import {
	DEFAULT_INDEX_FILTERS, type SetIndexFilters, type SetFormatHint, type SetIndexGrouping,
	type SetIndexSort, type SetIndexView, type UniversesBeyondFilter,
} from "../renderer/set-index-model";

export interface ParsedSetIndex {
	language: CardLanguage;
	filters: SetIndexFilters;
	errors: string[];
}

/** Initial display options, never embedded Scryfall query syntax. */
export function parseSetIndexBlock(source: string, defaultLanguage: CardLanguage): ParsedSetIndex {
	const filters: SetIndexFilters = { ...DEFAULT_INDEX_FILTERS };
	const errors: string[] = [];
	let language = defaultLanguage;
	for (const line of source.split(/\r?\n/)) {
		const stripped = line.trim();
		if (!stripped || stripped.startsWith("#") || stripped.startsWith("//")) continue;
		const match = /^([\w-]+)\s*:\s*(.*)$/.exec(stripped);
		if (!match) { errors.push(`Unrecognized option: ${stripped}`); continue; }
		const key = match[1]?.toLowerCase() ?? "";
		const value = match[2]?.trim().toLowerCase() ?? "";
		switch (key) {
			case "language": case "lang":
				if (isSupportedLanguage(value)) language = value;
				else errors.push(`Unsupported language: ${value}`);
				break;
			case "view":
				if (["table", "gallery"].includes(value)) filters.view = value as SetIndexView;
				else errors.push(`Invalid view: ${value}`);
				break;
			case "group":
				if (["block", "year", "type", "none"].includes(value)) filters.group = value as SetIndexGrouping;
				else errors.push(`Invalid group: ${value}`);
				break;
			case "sort":
				if (["date-desc", "date-asc", "name", "cards-desc"].includes(value)) filters.sort = value as SetIndexSort;
				else errors.push(`Invalid sort: ${value}`);
				break;
			case "ub": case "universes-beyond":
				if (["all", "exclude", "only"].includes(value)) filters.universesBeyond = value as UniversesBeyondFilter;
				else errors.push(`Invalid Universes Beyond filter: ${value}`);
				break;
			case "format":
				if (["all", "standard", "pioneer", "modern", "legacy", "vintage", "commander-products"].includes(value)) filters.format = value as SetFormatHint;
				else errors.push(`Invalid format hint: ${value}`);
				break;
			case "category": filters.category = value.slice(0, 40); break;
			case "search": filters.search = (match[2] ?? "").trim().slice(0, 100); break;
			case "funny": filters.includeFunny = value === "show" || value === "true"; break;
			case "digital": filters.includeDigital = value === "show" || value === "true"; break;
			default: errors.push(`Unknown index option: ${key}`);
		}
	}
	return { language, filters, errors };
}
