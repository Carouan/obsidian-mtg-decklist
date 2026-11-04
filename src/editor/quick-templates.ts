import {
	EditorSuggest, type Editor, type EditorPosition, type EditorSuggestContext,
	type EditorSuggestTriggerInfo, type TFile,
} from "obsidian";
import type MtgDecklistPlugin from "../main";

export interface QuickTemplate {
	trigger: string;
	description: string;
	content: string;
}

const FENCE = "```";

const STATIC_TEMPLATES: QuickTemplate[] = [
	{
		trigger: "ext-index-fr",
		description: "Index des extensions · tableau et blocs visuels",
		content: `${FENCE}extension-index
language: fr
view: gallery
group: block
sort: date-desc
ub: all
format: all
funny: false
digital: false
${FENCE}`,
	},
	{
		trigger: "deck-cmd-fr",
		description: "Commander · sections françaises",
		content: `${FENCE}decklist
language: fr
group: manual
legality: commander

# Commandant

# Créatures

# Éphémères

# Rituels

# Artefacts

# Enchantements

# Terrains

# Cartes envisagées
${FENCE}`,
	},
	{
		trigger: "deck-cmd-auto-fr",
		description: "Commander · regroupement automatique",
		content: `${FENCE}decklist
language: fr
group: auto
legality: commander

# Commandant

# Deck principal

# Cartes envisagées
${FENCE}`,
	},
	{
		trigger: "deck-60-fr",
		description: "60 cartes · sections françaises",
		content: `${FENCE}decklist
language: fr
group: manual
legality: off

# Deck principal

# Créatures

# Éphémères

# Rituels

# Terrains

# Réserve

# Cartes envisagées
${FENCE}`,
	},
	{
		trigger: "deck-vintage-en",
		description: "Vintage · English sections",
		content: `${FENCE}decklist
language: en
group: manual
legality: vintage

# Deck

# Creatures

# Instants

# Sorceries

# Lands

# Sideboard

# Maybeboard
${FENCE}`,
	},
];

export function quickTemplateSuggestions(query: string): QuickTemplate[] {
	const normalized = query.trim().toLowerCase();
	if (normalized.length < 3) return [];
	const exact = STATIC_TEMPLATES.filter((template) => template.trigger.startsWith(normalized));
	if (exact.length) return exact;
	// These are explicit shortcuts, not automatic text replacement. A user must
	// select the suggestion with Enter/Tab/click before a note is edited.
	const prints = /^(.{2,100})-ext$/i.exec(normalized);
	if (prints && !normalized.startsWith("ext-")) {
		const card = (prints[1] ?? "").replace(/-/g, " ").trim();
		return [{
			trigger: normalized, description: `All printings of ${card}`,
			content: `${FENCE}cardlist\nlanguage: fr\ncard: ${card}\nunique: set\nview: gallery\n${FENCE}`,
		}];
	}
	const set = /^ext-(.{2,80})$/i.exec(normalized);
	if (set) {
		const setName = (set[1] ?? "").replace(/-/g, " ").trim();
		return [{
			trigger: normalized, description: `Browse set ${setName}`,
			content: `${FENCE}extension\nlanguage: fr\nset: ${setName}\nview: gallery\nsort: color\n${FENCE}`,
		}];
	}
	return [];
}

export class MtgQuickTemplates extends EditorSuggest<QuickTemplate> {
	constructor(private readonly plugin: MtgDecklistPlugin) {
		super(plugin.app);
		this.setInstructions([{ command: "Enter", purpose: "Insert MTG template" }]);
	}

	onTrigger(cursor: EditorPosition, editor: Editor, _file: TFile | null): EditorSuggestTriggerInfo | null {
		const text = editor.getLine(cursor.line);
		const before = text.slice(0, cursor.ch);
		const match = /^\s*([\wà-ÿ-]{3,})$/i.exec(before);
		if (!match || text.slice(cursor.ch).trim()) return null;
		const query = match[1] ?? "";
		if (!quickTemplateSuggestions(query).length) return null;
		return { start: { line: cursor.line, ch: before.indexOf(query) }, end: cursor, query };
	}

	getSuggestions(context: EditorSuggestContext): QuickTemplate[] {
		return quickTemplateSuggestions(context.query);
	}

	renderSuggestion(value: QuickTemplate, element: HTMLElement): void {
		element.createDiv({ text: value.trigger, cls: "mtg-template-trigger" });
		element.createDiv({ text: value.description, cls: "mtg-template-description" });
	}

	selectSuggestion(value: QuickTemplate, _evt: MouseEvent | KeyboardEvent): void {
		const context = this.context;
		if (!context) return;
		context.editor.replaceRange(value.content + "\n", context.start, context.end);
	}
}
