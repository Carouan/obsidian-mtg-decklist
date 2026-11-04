import { setIcon } from "obsidian";
import type { CardLanguage, LegalityFormat } from "../settings";
import type { ScryfallCard, ScryfallLegality } from "../scryfall/types";
import { legalityNote } from "./legality";
import { t } from "../utils/i18n";

export interface LegalityBadge {
	status: Exclude<ScryfallLegality, "legal">;
	label: string;
	icon: string;
}

export function cardLegalityBadge(card: ScryfallCard, format: LegalityFormat, language: CardLanguage): LegalityBadge | null {
	if (format === "off") return null;
	const status = card.legalities?.[format];
	if (!status || status === "legal") return null;
	return {
		status,
		label: legalityNote(card, format, language) ?? t(language, "Not legal in {format}", { format }),
		icon: status === "banned" ? "ban" : status === "restricted" ? "triangle-alert" : "circle-slash",
	};
}

/** Both row and gallery renderers use one accessible, localized indicator. */
export function renderLegalityBadge(parent: HTMLElement, card: ScryfallCard, format: LegalityFormat, language: CardLanguage): HTMLElement | null {
	const badge = cardLegalityBadge(card, format, language);
	if (!badge) return null;
	const el = parent.createSpan({ cls: `mtg-legality-badge mtg-legality-${badge.status}` });
	setIcon(el, badge.icon);
	el.setAttribute("title", badge.label);
	el.setAttribute("aria-label", badge.label);
	el.setAttribute("role", "img");
	return el;
}
