import type MtgDecklistPlugin from "../main";
import type { CardLanguage } from "../settings";
import type { ScryfallCard } from "../scryfall/types";
import { localizedDisplayName } from "../scryfall/localization";
import { useTouchCardUi } from "../utils/touch-ui";

/** Smallest useful card image. Higher resolution remains available in the preview. */
export function galleryImageUrl(card: ScryfallCard): string | null {
	const uris = card.image_uris ?? card.card_faces?.[0]?.image_uris;
	return uris?.normal ?? uris?.large ?? uris?.small ?? uris?.png ?? null;
}

export function renderGalleryCard(
	parent: HTMLElement,
	card: ScryfallCard | null,
	plugin: MtgDecklistPlugin,
	language: CardLanguage,
	options: { name: string; quantity?: number; subtitle?: string; onOpen?: () => void },
): HTMLElement {
	const tile = parent.createDiv({ cls: "mtg-gallery-tile" });
	const display = card ?? undefined;
	const title = card ? localizedDisplayName(card, card) : options.name;
	const imageUrl = card ? galleryImageUrl(card) : null;
	const art = card
		? tile.createEl("button", { cls: "mtg-gallery-art", attr: { type: "button", "aria-label": title } })
		: tile.createDiv({ cls: "mtg-gallery-art" });
	if (imageUrl) {
		const img = art.createEl("img", { attr: { alt: title, loading: "lazy", decoding: "async" } });
		img.src = imageUrl;
	} else {
		art.createSpan({ cls: "mtg-gallery-placeholder", text: title });
	}
	if (options.quantity && options.quantity > 1) {
		art.createSpan({ cls: "mtg-gallery-quantity", text: `×${options.quantity}` });
	}
	if (display) {
		art.addEventListener("click", (event) => {
			event.preventDefault();
			plugin.preview.show(display, art, plugin.settings.imageQuality);
			options.onOpen?.();
		});
		if (!useTouchCardUi()) {
			art.addEventListener("mouseenter", () => plugin.preview.show(display, art, plugin.settings.imageQuality));
			art.addEventListener("mouseleave", () => plugin.preview.hide());
		}
	}
	const label = tile.createDiv({ cls: "mtg-gallery-caption", text: title });
	label.setAttribute("title", title);
	if (options.subtitle) tile.createDiv({ cls: "mtg-gallery-subtitle", text: options.subtitle });
	return tile;
}
