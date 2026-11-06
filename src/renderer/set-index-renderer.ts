import { MarkdownRenderChild, setIcon, type MarkdownPostProcessorContext } from "obsidian";
import type MtgDecklistPlugin from "../main";
import type { ScryfallSet } from "../scryfall/types";
import type { CardLanguage } from "../utils/languages";
import { displaySetName, frenchSetName } from "../scryfall/set-localization";
import { parseSetIndexBlock } from "../parser/set-index-parser";
import {
	filterIndexSets, groupIndexSets, groupDateRange, setIconUrl,
	type SetIndexFilters, type SetIndexGroup,
} from "./set-index-model";
import { createCatalogProcessor } from "./catalog-renderer";
import { t } from "../utils/i18n";

const GROUP_BATCH = 24;
const TABLE_BATCH = 70;

function selectFilter(
	parent: HTMLElement,
	label: string,
	value: string,
	values: Array<[string, string]>,
	change: (next: string) => void,
): void {
	const wrap = parent.createEl("label", { cls: "mtg-index-control" });
	wrap.createSpan({ text: label });
	const input = wrap.createEl("select", { cls: "dropdown", attr: { "aria-label": label } });
	for (const [code, name] of values) input.createEl("option", { text: name, value: code });
	input.value = value;
	input.addEventListener("change", () => change(input.value));
}

function iconForSet(parent: HTMLElement, set: ScryfallSet, fallback = "layers"): void {
	const src = setIconUrl(set);
	if (src) {
		const img = parent.createEl("img", { cls: "mtg-index-set-symbol", attr: {
			alt: "", loading: "lazy", decoding: "async",
		} });
		img.src = src;
		img.addEventListener("error", () => { img.remove(); setIcon(parent, fallback); }, { once: true });
	} else {
		setIcon(parent, fallback);
	}
}

function setSummary(set: ScryfallSet, language: CardLanguage): string {
	return [
		displaySetName(set, language), set.code.toUpperCase(), set.released_at?.slice(0, 7),
		set.card_count, set.set_type,
	].filter((part) => part !== undefined).join(" · ");
}

export function createSetIndexProcessor(plugin: MtgDecklistPlugin) {
	return (source: string, container: HTMLElement, context: MarkdownPostProcessorContext): void => {
		const parsed = parseSetIndexBlock(source, plugin.settings.cardLanguage);
		const filters: SetIndexFilters = parsed.filters;
		const language = parsed.language;
		const tr = (name: string) => t(language, name);
		let sets: ScryfallSet[] = [];
		let cancelled = false;
		let loaded = false;
		let visibleGroups = GROUP_BATCH;
		let visibleRows = TABLE_BATCH;
		let loadRequest = 0;
		let selected: string | null = null;
		context.addChild(new IndexCleanup(container, () => { cancelled = true; loadRequest++; }));

		function showExplorer(set: ScryfallSet): void {
			selected = set.code;
			container.empty();
			const back = container.createEl("button", { cls: "mtg-index-back", text: tr("Back to set index") });
			back.addEventListener("click", () => { selected = null; render(); });
			const pane = container.createDiv({ cls: "mtg-index-selected-set" });
			// Reuse the existing explorer: one chosen set, filtered on request.
			createCatalogProcessor(plugin, "extension")(
				`language: ${language}\nset: ${set.code}\nview: gallery\n`,
				pane, context,
			);
		}

		function render(): void {
			if (cancelled || !container.isConnected) return;
			if (selected) {
				const set = sets.find((s) => s.code === selected);
				if (set) { showExplorer(set); return; }
			}
			container.empty();
			container.addClass("mtg-decklist", "mtg-index");
			container.createDiv({ cls: "mtg-catalog-heading", text: tr("Set index") });
			for (const error of parsed.errors) container.createDiv({ cls: "mtg-catalog-error", text: error });
			const controls = container.createDiv({ cls: "mtg-index-controls" });
			const query = controls.createEl("input", { type: "search", cls: "mtg-index-search", attr: {
				placeholder: tr("Search sets, codes or blocks"), "aria-label": tr("Search sets, codes or blocks"),
			} });
			query.value = filters.search;
			// Keep keyboard focus during live filtering: only update the results,
			// never re-create this input for every keystroke.
			query.addEventListener("input", () => { filters.search = query.value; resetResults(); });
			const selectors = controls.createDiv({ cls: "mtg-index-selectors" });
			const update = () => { visibleGroups = GROUP_BATCH; visibleRows = TABLE_BATCH; render(); };
			selectFilter(selectors, tr("View"), filters.view,
				[["table", tr("Table")], ["gallery", tr("Gallery")]],
				(v) => { filters.view = v as SetIndexFilters["view"]; update(); });
			selectFilter(selectors, tr("Group by"), filters.group,
				[["block", tr("Block")], ["year", tr("Year")], ["type", tr("Category")], ["none", tr("Ungrouped")]],
				(v) => { filters.group = v as SetIndexFilters["group"]; update(); });
			selectFilter(selectors, tr("Sort"), filters.sort,
				[["date-desc", tr("Newest first")], ["date-asc", tr("Oldest first")],
					["name", tr("Name")], ["cards-desc", tr("Most cards")]],
				(v) => { filters.sort = v as SetIndexFilters["sort"]; update(); });
			selectFilter(selectors, tr("Category"), filters.category,
				[["all", tr("All")], ...[...new Set(sets.map((s) => s.set_type).filter((s): s is string => Boolean(s)))].sort()
					.map((s): [string, string] => [s, s])],
				(v) => { filters.category = v; update(); });
			selectFilter(selectors, "Universes Beyond", filters.universesBeyond,
				[["all", tr("All")], ["exclude", tr("Hide identified UB")], ["only", tr("Only identified UB")]],
				(v) => { filters.universesBeyond = v as SetIndexFilters["universesBeyond"]; update(); });
			selectFilter(selectors, tr("Format (indicative)"), filters.format,
				[["all", tr("All")], ["standard", "Standard (≈ 3 years)"],
					["pioneer", "Pioneer (2012+)"], ["modern", "Modern (2003+)"],
					["legacy", "Legacy (paper)"], ["vintage", "Vintage (paper)"],
					["commander-products", tr("Commander products")]],
				(v) => { filters.format = v as SetIndexFilters["format"]; update(); });
			const checks = controls.createDiv({ cls: "mtg-index-checkboxes" });
			for (const [key, name] of [
				["includeFunny", tr("Include funny/acorn sets")],
				["includeDigital", tr("Include digital-only sets")],
			] as const) {
				const label = checks.createEl("label");
				const check = label.createEl("input", { type: "checkbox" });
				check.checked = filters[key];
				label.createSpan({ text: name });
				check.addEventListener("change", () => { filters[key] = check.checked; update(); });
			}
			const help = container.createDiv({ cls: "mtg-index-help", text: tr(
				"Format filters are release-era hints, not card legality. UB identification uses maintained tags; unclassified sets may remain.",
			) });
			help.setAttribute("role", "note");
			const status = container.createDiv({ cls: "mtg-catalog-status" });
			const results = container.createDiv({ cls: "mtg-index-results" });
			if (!sets.length) {
				status.setText(tr(loaded ? "Set catalog unavailable. Retry by reopening the note." : "Loading set index…"));
				return;
			}
			function resetResults(): void {
				visibleGroups = GROUP_BATCH;
				visibleRows = TABLE_BATCH;
				renderResults();
			}
			function renderResults(): void {
				results.empty();
				const matches = filterIndexSets(sets, filters, language);
				status.setText(t(language, "{shown} of {total} sets", { shown: matches.length, total: sets.length }));
				if (!matches.length) {
					results.createDiv({ text: tr("No matching set") });
					return;
				}
				if (filters.view === "table") renderTable(results, matches);
				else renderBlocks(results, groupIndexSets(matches, filters.group, language));
			}
			function renderTable(parent: HTMLElement, matches: ScryfallSet[]): void {
				const table = parent.createEl("table", { cls: "mtg-index-table" });
				const head = table.createEl("thead").createEl("tr");
				for (const title of ["Set", "Code", "Released", "Cards", "Category"])
					head.createEl("th", { text: tr(title) });
				const body = table.createEl("tbody");
				for (const set of matches.slice(0, visibleRows)) {
					const row = body.createEl("tr");
					const name = row.createEl("td");
					const link = name.createEl("button", { cls: "mtg-index-table-link" });
					const symbol = link.createSpan({ cls: "mtg-index-table-symbol" });
					iconForSet(symbol, set);
					link.createSpan({ text: displaySetName(set, language) });
					link.addEventListener("click", () => showExplorer(set));
					for (const value of [set.code.toUpperCase(), set.released_at ?? "—",
						String(set.card_count ?? "—"), set.set_type ?? "—"])
						row.createEl("td", { text: value });
				}
				if (visibleRows < matches.length) moreButton(parent, () => { visibleRows += TABLE_BATCH; renderResults(); });
			}
			function renderBlocks(parent: HTMLElement, groups: SetIndexGroup[]): void {
				const grid = parent.createDiv({ cls: "mtg-index-blocks" });
				for (const group of groups.slice(0, visibleGroups)) {
					const block = grid.createDiv({ cls: "mtg-index-block" });
					block.createDiv({ cls: "mtg-index-block-heading", text: group.name });
					block.createDiv({ cls: "mtg-index-block-dates", text: groupDateRange(group, language) });
					const entries = block.createDiv({ cls: "mtg-index-block-sets" });
					let visible = Math.min(9, group.sets.length);
					const addEntries = () => {
						entries.empty();
						for (const set of group.sets.slice(0, visible)) {
							const card = entries.createEl("button", { cls: "mtg-index-mini-set", attr: {
								type: "button", title: setSummary(set, language),
							} });
							const icon = card.createDiv({ cls: "mtg-index-mini-symbol" });
							iconForSet(icon, set);
							// Compact tiles display one localized name only; the complete bilingual
							// name remains accessible in the button tooltip.
							card.createSpan({ cls: "mtg-index-mini-title", text: frenchSetName(set, language) ?? set.name });
							card.createSpan({ cls: "mtg-index-mini-code", text: set.code.toUpperCase() });
							card.addEventListener("click", () => showExplorer(set));
						}
						if (visible < group.sets.length) {
							const more = block.querySelector(".mtg-index-inner-more");
							more?.remove();
							const button = block.createEl("button", { cls: "mtg-index-inner-more", text: tr("More sets…") });
							button.addEventListener("click", () => { button.remove(); visible += 9; addEntries(); });
						}
					};
					addEntries();
				}
				if (visibleGroups < groups.length) moreButton(parent, () => { visibleGroups += GROUP_BATCH; renderResults(); });
			}
			function moreButton(parent: HTMLElement, action: () => void): void {
				parent.createEl("button", { cls: "mtg-index-load-more", text: tr("Show more sets") }).addEventListener("click", action);
			}
			renderResults();
		}

		void (async () => {
			const request = ++loadRequest;
			render();
			try {
				sets = await plugin.client.listSets();
				loaded = true;
				if (request !== loadRequest || cancelled) return;
				render();
			} catch (err) {
				if (request !== loadRequest || cancelled) return;
				container.createDiv({ cls: "mtg-catalog-error", text: String(err) });
			}
		})();
	};
}

class IndexCleanup extends MarkdownRenderChild {
	constructor(container: HTMLElement, private readonly cleanup: () => void) { super(container); }
	onunload(): void { this.cleanup(); }
}
