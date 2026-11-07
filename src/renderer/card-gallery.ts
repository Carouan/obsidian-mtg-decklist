import type MtgDecklistPlugin from "../main";
import type { CardLanguage, LegalityFormat } from "../settings";
import type { ScryfallCard } from "../scryfall/types";
import { localizedDisplayName } from "../scryfall/localization";
import { useTouchCardUi } from "../utils/touch-ui";
import { setIcon } from "obsidian";
import { t } from "../utils/i18n";
import { renderLegalityBadge } from "./legality-badge";
import { cardImageFaces } from "../ui/card-image-faces";
import { preferredImageCard } from "../scryfall/card-presentation";

/** Smallest useful card image. Higher resolution remains available in the preview. */
export function galleryImageUrl(card: ScryfallCard): string | null {
	return cardImageFaces(card, "normal")[0]?.url ?? null;
}

export function renderGalleryCard(
	parent: HTMLElement,
	card: ScryfallCard | null,
	plugin: MtgDecklistPlugin,
	language: CardLanguage,
	options: {
		name: string; quantity?: number; subtitle?: string; onOpen?: () => void;
		onCopy?: () => void; legalityFormat?: LegalityFormat; colorIdentityViolation?: string[];
		canonicalCard?: ScryfallCard;
	},
): HTMLElement {
	const tile = parent.createDiv({ cls: "mtg-gallery-tile" });
	const display = card ?? undefined;
	const title = card ? localizedDisplayName(card, card) : options.name;
	const imageCard = card ? preferredImageCard(card, options.canonicalCard, plugin.settings.imagePreference ?? "readable") : null;
	const faces = imageCard ? cardImageFaces(imageCard, "normal") : [];
	const imageUrl = faces[0]?.url ?? null;
	let activeFace = 0;
	let img: HTMLImageElement | null = null;
	const art = card
		? tile.createEl("button", { cls: "mtg-gallery-art", attr: { type: "button", "aria-label": title } })
		: tile.createDiv({ cls: "mtg-gallery-art" });
	if (imageUrl) {
		img = art.createEl("img", { attr: { alt: faces[0]?.name ?? title, loading: "lazy", decoding: "async" } });
		img.src = imageUrl;
	} else {
		art.createSpan({ cls: "mtg-gallery-placeholder", text: title });
	}
	if (faces.length > 1 && img) {
		tile.addClass("is-double-faced");
		const flip = tile.createEl("button", { cls: "mtg-gallery-flip", attr: {
			type: "button", title: t(language, "Flip card"),
			"aria-label": t(language, "Flip card"),
		} });
		setIcon(flip, "refresh-cw");
		flip.addEventListener("click", (event) => {
			event.preventDefault();
			event.stopPropagation();
			activeFace = (activeFace + 1) % faces.length;
			const face = faces[activeFace]!;
			if (img) { img.src = face.url; img.alt = face.name; }
			art.setAttribute("aria-label", face.name);
			flip.setAttribute("title", t(language, "Face {number}: {name}", {
				number: activeFace + 1, name: face.name,
			}));
			plugin.preview.hide();
		});
	}
	if (options.quantity && options.quantity > 1) {
		art.createSpan({ cls: "mtg-gallery-quantity", text: `×${options.quantity}` });
	}
	if (card && options.legalityFormat) {
		renderLegalityBadge(tile, card, options.legalityFormat, language);
	}
	if (options.colorIdentityViolation?.length) {
		const warning = tile.createSpan({ cls: "mtg-legality-badge mtg-legality-color-identity" });
		setIcon(warning, "triangle-alert");
		const label = t(language, "Outside commander color identity: {colors}", {
			colors: options.colorIdentityViolation.join(""),
		});
		warning.setAttribute("title", label);
		warning.setAttribute("aria-label", label);
		warning.setAttribute("role", "img");
	}
	if (options.onCopy) {
		// The copy action belongs to each card, not the grid as a whole.
		// Keep it visible on touch devices, where hover is unavailable.
		const copy = tile.createEl("button", { cls: "mtg-gallery-copy", attr: {
			type: "button", "aria-label": t(language, "Copy printing"), title: t(language, "Copy printing"),
		} });
		setIcon(copy, "copy");
		copy.addEventListener("click", (event) => {
			event.preventDefault();
			event.stopPropagation();
			plugin.preview.hide();
			options.onCopy?.();
		});
	}
	if (display) {
		art.addEventListener("click", (event) => {
			event.preventDefault();
			plugin.preview.openDetails(display, plugin.settings.imageQuality, activeFace, options.canonicalCard);
			options.onOpen?.();
		});
		if (!useTouchCardUi()) {
			art.addEventListener("mouseenter", () => plugin.preview.show(display, art, plugin.settings.imageQuality, activeFace, options.canonicalCard));
			art.addEventListener("mouseleave", () => plugin.preview.hide());
		}
	}
	const label = tile.createDiv({ cls: "mtg-gallery-caption", text: title });
	label.setAttribute("title", title);
	if (card && imageCard && imageCard !== card && card.lang !== "en") {
		tile.createDiv({ cls: "mtg-gallery-image-fallback", text: t(language, "English HD image used") });
	}
	if (options.subtitle) tile.createDiv({ cls: "mtg-gallery-subtitle", text: options.subtitle });
	return tile;
}
