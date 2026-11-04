import { MarkdownRenderChild, Notice, type MarkdownPostProcessorContext } from "obsidian";
import type MtgDecklistPlugin from "../main";
import {
	buildExtensionQuery, CATALOG_RARITIES, CATALOG_TYPES, COLOR_LABELS,
	parseCatalogBlock, type CatalogColor, type CatalogKind, type CatalogOptions, type CatalogSort,
} from "../parser/catalog-parser";
import type { ScryfallCard, ScryfallCardPage, ScryfallSet } from "../scryfall/types";
import { localizedDisplayName } from "../scryfall/localization";
import { t } from "../utils/i18n";
import { renderGalleryCard } from "./card-gallery";
import { classifyByType } from "./grouping";
import { useTouchCardUi } from "../utils/touch-ui";
import { renderColorIdentityPips } from "../ui/mana-symbols";
import { displaySetName, frenchSetName, setMatchesQuery } from "../scryfall/set-localization";
import { catalogColumnCount, catalogPageSize } from "../utils/catalog-layout";

const COLOR_ORDER = ["w", "u", "b", "r", "g", "m", "c"];

interface CatalogState {
	options: CatalogOptions;
	cards: ScryfallCard[];
	nextPage: string | undefined;
	total: number;
	page: number;
	pageSize: number;
	query: string;
	set: ScryfallSet | null;
	request: number;
	loading: boolean;
	observer: IntersectionObserver | null;
}

/** A set appears once in the editions browser, even when it has variants. */
export function uniqueCatalogCards(cards: ScryfallCard[], kind: CatalogKind, unique: "set" | "prints"): ScryfallCard[] {
	if (kind !== "cardlist" || unique === "prints") return cards;
	const seen = new Set<string>();
	return cards.filter((card) => {
		if (!card.set || seen.has(card.set)) return false;
		seen.add(card.set);
		return true;
	});
}

function displayName(card: ScryfallCard): string {
	return localizedDisplayName(card, card);
}

function labelFor(type: string, language: CatalogOptions["language"]): string {
	const mapped = type === "any" ? "All" : type.charAt(0).toUpperCase() + type.slice(1);
	return t(language, mapped);
}

function createSelect(
	parent: HTMLElement,
	options: Array<[string, string]>,
	value: string,
	onChange: (value: string) => void,
	ariaLabel: string,
): HTMLSelectElement {
	const el = parent.createEl("select", { cls: "dropdown mtg-catalog-select", attr: { "aria-label": ariaLabel } });
	for (const [key, label] of options) el.createEl("option", { text: label, value: key });
	el.value = value;
	el.addEventListener("change", () => onChange(el.value));
	return el;
}

function groupName(card: ScryfallCard, sort: CatalogSort): string {
	if (sort === "type") return classifyByType(card.type_line);
	if (sort === "mana") return `Mana ${card.cmc ?? "?"}`;
	if (sort === "color") {
		const colors = card.colors ?? card.card_faces?.flatMap((face) => face.colors ?? []) ?? [];
		const distinct = [...new Set(colors)];
		return distinct.length === 0 ? "Colorless" : distinct.length > 1 ? "Multicolor" : ({
			W: "White", U: "Blue", B: "Black", R: "Red", G: "Green",
		}[distinct[0] ?? ""] ?? "Other");
	}
	return "";
}

function sortedCards(cards: ScryfallCard[], sort: CatalogSort): ScryfallCard[] {
	const values = [...cards];
	values.sort((a, b) => {
		if (sort === "set") {
			return (a.set_name ?? a.set ?? "").localeCompare(b.set_name ?? b.set ?? "") ||
				(a.collector_number ?? "").localeCompare(b.collector_number ?? "", undefined, { numeric: true });
		}
		if (sort === "mana") {
			const delta = (a.cmc ?? 99) - (b.cmc ?? 99);
			if (delta) return delta;
		}
		if (sort === "color") {
			const idx = (card: ScryfallCard) => {
				const cs = card.colors ?? card.card_faces?.[0]?.colors ?? [];
				return cs.length > 1 ? 5 : cs.length === 0 ? 6 : COLOR_ORDER.indexOf((cs[0] ?? "").toLowerCase());
			};
			const delta = idx(a) - idx(b);
			if (delta) return delta;
		}
		if (sort === "type") {
			const delta = classifyByType(a.type_line).localeCompare(classifyByType(b.type_line));
			if (delta) return delta;
		}
		return a.name.localeCompare(b.name);
	});
	return values;
}

export function createCatalogProcessor(plugin: MtgDecklistPlugin, kind: CatalogKind) {
	return (source: string, container: HTMLElement, _ctx: MarkdownPostProcessorContext): void => {
		const options = parseCatalogBlock(source, kind, plugin.settings.cardLanguage);
		const pageSize = catalogPageSize(plugin.settings.catalogPageSize);
		const columns = catalogColumnCount(plugin.settings.catalogColumns);
		const state: CatalogState = {
			options, cards: [], nextPage: undefined, total: 0, page: 0, pageSize,
			query: "", set: null, request: 0, loading: false, observer: null,
		};
		_ctx.addChild(new CatalogCleanup(container, () => {
			state.request++;
			state.observer?.disconnect();
			state.observer = null;
		}));
		container.empty();
		container.addClass("mtg-decklist", "mtg-catalog");
		container.style.setProperty("--mtg-catalog-columns", String(columns));
		const header = container.createDiv({ cls: "mtg-catalog-heading", text: t(options.language, kind === "extension" ? "Set explorer" : "Card printings") });
		for (const error of options.errors) container.createDiv({ cls: "mtg-catalog-error", text: error });
		const filters = container.createDiv({ cls: "mtg-catalog-filters" });
		const inputRow = filters.createDiv({ cls: "mtg-catalog-input-row" });
		const input = inputRow.createEl("input", {
			type: "text",
			cls: "mtg-catalog-input",
			attr: { placeholder: kind === "extension" ? t(options.language, "Set code or name") : t(options.language, "Card name") },
		});
		input.value = kind === "extension" ? options.set : options.card;
		input.setAttribute("aria-label", kind === "extension" ? t(options.language, "Set code or name") : t(options.language, "Card name"));
		input.addEventListener("input", () => {
			if (kind === "extension") options.set = input.value;
			else options.card = input.value;
		});
		if (kind === "extension") {
			const find = inputRow.createEl("button", { text: t(options.language, "Find a set"), attr: { type: "button" } });
			const choices = filters.createDiv({ cls: "mtg-catalog-set-choices is-hidden" });
			let knownSets: ScryfallSet[] | null = null;
			const updateSetPicker = () => {
				if (!knownSets) return;
				choices.empty();
				const picker = choices.createEl("select", {
					cls: "dropdown mtg-catalog-set-picker",
					attr: { "aria-label": t(options.language, "Choose a set") },
				});
				picker.createEl("option", { value: "", text: t(options.language, "Choose a set") });
				const filtered = knownSets.filter((set) => setMatchesQuery(set, input.value, options.language));
				filtered.sort((a, b) => displaySetName(a, options.language).localeCompare(displaySetName(b, options.language), options.language));
				if (!filtered.length) {
					choices.createSpan({ text: t(options.language, "No matching set") });
				}
				for (const set of filtered) {
					picker.createEl("option", {
						value: set.code,
						text: `${displaySetName(set, options.language)} (${set.code.toUpperCase()})`,
					});
				}
				picker.addEventListener("change", () => {
					const selected = filtered.find((set) => set.code === picker.value);
					if (!selected) return;
					options.set = selected.code;
					input.value = frenchSetName(selected, options.language) ?? selected.name;
					choices.addClass("is-hidden");
				});
				picker.focus();
			};
			input.addEventListener("input", () => {
				if (!choices.hasClass("is-hidden")) updateSetPicker();
			});
			find.addEventListener("click", () => {
				void (async () => {
					find.disabled = true;
					try {
						knownSets ??= await plugin.client.listSets();
						if (!container.isConnected) return;
						choices.removeClass("is-hidden");
						updateSetPicker();
					} finally { find.disabled = false; }
				})();
			});
			const colorPanel = filters.createDiv({ cls: "mtg-catalog-colors" });
			colorPanel.createSpan({ text: t(options.language, "Colors") });
			const colorSymbols: Array<{ code: CatalogColor; el: HTMLElement }> = [];
			for (const code of Object.keys(COLOR_LABELS) as CatalogColor[]) {
				const label = colorPanel.createEl("label", { cls: "mtg-catalog-color" });
				const check = label.createEl("input", { type: "checkbox" });
				check.checked = options.colors.includes(code);
				const labelName = t(options.language, code === "m" ? "Multicolor" : ({
					w: "White", u: "Blue", b: "Black", r: "Red", g: "Green", c: "Colorless",
				}[code] ?? "Multicolor"));
				label.setAttribute("title", labelName);
				const glyph = label.createSpan({ cls: "mtg-catalog-color-symbol" });
				glyph.setAttribute("aria-label", labelName);
				colorSymbols.push({ code, el: glyph });
				check.setAttribute("aria-label", labelName);
				check.addEventListener("change", () => {
					options.colors = check.checked
						? [...options.colors, code]
						: options.colors.filter((color) => color !== code);
				});
			}
			const renderSymbols = () => {
				for (const { code, el } of colorSymbols) {
					el.empty();
					if (code === "m") {
						el.createSpan({ cls: "mtg-catalog-multicolor-dot", attr: { "aria-hidden": "true" } });
					} else {
						renderColorIdentityPips(el, code === "c" ? [] : [code.toUpperCase()], plugin.symbology, {
							sizeClass: "mtg-mana-symbol-sm", emptyAsColorless: code === "c",
						});
					}
				}
			};
			renderSymbols();
			if (!plugin.symbology.hasAny()) {
				void plugin.ensureSymbologyLoaded().then((success) => {
					if (success && container.isConnected) renderSymbols();
				});
			}
			const selectors = filters.createDiv({ cls: "mtg-catalog-filter-row" });
			createSelect(selectors, CATALOG_TYPES.map((type) => [type, labelFor(type, options.language)]), options.type,
				(value) => { options.type = value; }, t(options.language, "Type"));
			createSelect(selectors, CATALOG_RARITIES.map((rarity) => [rarity, labelFor(rarity, options.language)]), options.rarity,
				(value) => { options.rarity = value; }, t(options.language, "Rarity"));
		}
		const controls = filters.createDiv({ cls: "mtg-catalog-actions" });
		const loadButton = controls.createEl("button", { cls: "mod-cta", text: t(options.language, "Show cards") });
		const displayControls = controls.createDiv({ cls: "mtg-catalog-display-controls" });
		createSelect(
			displayControls,
			[["list", t(options.language, "List")], ["gallery", t(options.language, "Gallery")]],
			options.view, (v) => { options.view = v as "list" | "gallery"; renderResults(); },
			t(options.language, "Display mode"),
		);
		createSelect(
			displayControls,
			[["color", t(options.language, "Color")], ["type", t(options.language, "Type")],
				["mana", t(options.language, "Mana")], ["name", t(options.language, "Name")],
				["set", t(options.language, "Set")]],
			options.sort, (v) => { options.sort = v as CatalogSort; state.page = 0; renderResults(); },
			t(options.language, "Sort cards"),
		);
		const status = container.createDiv({ cls: "mtg-catalog-status" });
		const pagerTop = container.createDiv({ cls: "mtg-catalog-pager" });
		const results = container.createDiv({ cls: "mtg-catalog-results" });

		async function requestPage(next = false): Promise<void> {
			if (state.loading) return;
			const request = ++state.request;
			state.loading = true;
			loadButton.disabled = true;
			status.setText(t(options.language, "Loading cards…"));
			try {
				if (!next) {
					state.observer?.disconnect();
					results.empty();
					pagerTop.empty();
					state.cards = [];
					state.nextPage = undefined;
					state.page = 0;
					if (kind === "extension") {
						const set = await plugin.client.findSet(options.set, options.language);
						if (!set) throw new Error(t(options.language, "Set not found"));
						state.set = set;
						state.query = buildExtensionQuery(set.code, options);
						header.setText(`${displaySetName(set, options.language)} (${set.code.toUpperCase()})`);
					} else {
						const card = await plugin.client.fetchCardByName(options.card.trim());
						if (!card?.oracle_id) throw new Error(t(options.language, "Card not found"));
						state.query = `oracleid:${card.oracle_id}`;
						header.setText(`${card.name} — ${t(options.language, "Card printings")}`);
					}
				}
				const order = options.sort === "color" || options.sort === "mana" || options.sort === "name"
					? (options.sort === "mana" ? "cmc" : options.sort) : "set";
				// Scryfall uses up to 175 results per API page. The interface uses
				// A configurable number of cards per visible page. Only fetch
				// further API pages when the
				// requested visible page needs them; cap requests per interaction.
				const targetPage = next ? state.page + 1 : 0;
				for (let batch = 0; batch < 3; batch++) {
					const page: ScryfallCardPage | null = await plugin.client.searchCatalog(state.query, {
						order, unique: "prints", nextPage: next || batch > 0 ? state.nextPage : undefined,
					});
					if (request !== state.request || !container.isConnected) return;
					if (!page || !page.data.length) {
						if (!state.cards.length) throw new Error(t(options.language, "No cards found"));
						state.nextPage = undefined;
						break;
					}
					state.cards.push(...page.data);
					state.nextPage = page.has_more ? page.next_page : undefined;
					state.total = page.total_cards ?? state.cards.length;
					if (uniqueCatalogCards(state.cards, kind, options.unique).length > targetPage * state.pageSize || !state.nextPage) break;
				}
				if (uniqueCatalogCards(state.cards, kind, options.unique).length > targetPage * state.pageSize) {
					state.page = targetPage;
				}
				state.loading = false;
				renderResults();
			} catch (err) {
				if (request === state.request) status.setText(err instanceof Error ? err.message : String(err));
			} finally {
				if (request === state.request) { state.loading = false; loadButton.disabled = false; }
			}
		}

		function renderResults(): void {
			state.observer?.disconnect();
			state.observer = null;
			results.empty();
			pagerTop.empty();
			if (!state.cards.length) return;
			const distinct = uniqueCatalogCards(state.cards, kind, options.unique);
			const sorted = sortedCards(distinct, options.sort);
			const start = state.page * state.pageSize;
			const showing = sorted.slice(start, start + state.pageSize);
			status.setText(kind === "cardlist" && options.unique === "set"
				? t(options.language, "{shown} sets found among {loaded} printings loaded", {
					shown: distinct.length, loaded: state.cards.length,
				})
				: t(options.language, "Showing {start}–{end} of {total} cards", {
					start: start + 1, end: start + showing.length, total: state.total,
				}));
			const hasNext = start + state.pageSize < sorted.length || Boolean(state.nextPage);
			function drawPager(parent: HTMLElement): void {
				const previous = parent.createEl("button", { text: t(options.language, "Previous page"), attr: { type: "button" } });
				previous.disabled = state.page === 0 || state.loading;
				previous.addEventListener("click", () => { state.page--; renderResults(); });
				const pageTotal = kind === "cardlist" && options.unique === "set"
					? ""
					: ` / ${Math.ceil(state.total / state.pageSize)}`;
				parent.createSpan({ cls: "mtg-catalog-page-label", text: t(options.language, "Page {number}", {
					number: state.page + 1,
				}) + pageTotal });
				const forward = parent.createEl("button", { text: t(options.language, "Next page"), attr: { type: "button" } });
				forward.disabled = !hasNext || state.loading;
				forward.addEventListener("click", () => {
					if (start + state.pageSize < sorted.length) {
						state.page++;
						renderResults();
					} else if (state.nextPage) {
						void requestPage(true);
					}
				});
			}
			drawPager(pagerTop);
			const buckets = new Map<string, ScryfallCard[]>();
			for (const card of showing) {
				const category = groupName(card, options.sort);
				const bucket = buckets.get(category) ?? [];
				bucket.push(card);
				buckets.set(category, bucket);
			}
			const observers = new Map<Element, { card: ScryfallCard; slot: HTMLElement }>();
			if (options.language !== "en" && typeof IntersectionObserver !== "undefined") {
				state.observer = new IntersectionObserver((entries, observer) => {
					for (const entry of entries) {
						if (!entry.isIntersecting) continue;
						observer.unobserve(entry.target);
						const data = observers.get(entry.target);
						if (!data) continue;
						void plugin.client.exactLocalizedPrinting(data.card, options.language).then((translated) => {
							if (translated && data.slot.isConnected) drawCard(data.slot, translated, data.card);
						});
					}
				}, { rootMargin: "200px" });
			}
			for (const [category, cards] of buckets) {
				const group = results.createDiv({ cls: "mtg-catalog-group" });
				if (category) group.createDiv({ cls: "mtg-catalog-group-title", text: t(options.language, category) });
				const list = group.createDiv({ cls: options.view === "gallery" ? "mtg-catalog-grid" : "mtg-catalog-list" });
				for (const card of cards) {
					const slot = list.createDiv({ cls: "mtg-catalog-slot" });
					drawCard(slot, card, card);
					if (state.observer) {
						observers.set(slot, { card, slot });
						state.observer.observe(slot);
					}
				}
			}
			const pagerBottom = results.createDiv({ cls: "mtg-catalog-pager mtg-catalog-pager-bottom" });
			drawPager(pagerBottom);
		}

		function drawCard(slot: HTMLElement, card: ScryfallCard, canonical: ScryfallCard): void {
			slot.empty();
			const name = displayName(card);
			const printing = `1 ${canonical.name} (${(canonical.set ?? "").toUpperCase()}) ${canonical.collector_number ?? ""}`;
			const copyPrinting = () => {
				void navigator.clipboard.writeText(printing).then(() => {
					new Notice(t(options.language, "Printing copied"));
				}).catch(() => new Notice(printing));
			};
			if (options.view === "gallery") {
				renderGalleryCard(slot, card, plugin, options.language, {
					name,
					subtitle: `${canonical.set_name ?? canonical.set ?? ""} · ${canonical.collector_number ?? ""}`,
					onCopy: copyPrinting,
				});
			} else {
				const row = slot.createDiv({ cls: "mtg-catalog-row" });
				const link = row.createEl("button", { cls: "mtg-catalog-card-link", text: name });
				link.addEventListener("click", () => plugin.preview.show(card, link, plugin.settings.imageQuality));
				if (!useTouchCardUi()) {
					link.addEventListener("mouseenter", () => plugin.preview.show(card, link, plugin.settings.imageQuality));
					link.addEventListener("mouseleave", () => plugin.preview.hide());
				}
				row.createSpan({ cls: "mtg-catalog-card-set", text: `${canonical.set_name ?? canonical.set ?? ""} · ${canonical.collector_number ?? ""}` });
			}
			if (options.view === "list") {
				const copy = slot.createEl("button", {
					cls: "mtg-catalog-copy",
					text: t(options.language, "Copy printing"),
					attr: { type: "button", "aria-label": t(options.language, "Copy printing") },
				});
				copy.addEventListener("click", copyPrinting);
			}
		}

		loadButton.addEventListener("click", () => { void requestPage(); });
		// The request is intentionally user-triggered: no bulk set download on note open.
	};
}

class CatalogCleanup extends MarkdownRenderChild {
	constructor(container: HTMLElement, private readonly cleanup: () => void) {
		super(container);
	}
	onunload(): void { this.cleanup(); }
}
