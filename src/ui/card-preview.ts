import { useTouchCardUi } from "../utils/touch-ui";
import type { ImageQuality } from "../settings";
import type { ScryfallCard } from "../scryfall/types";
import { localizedDisplayName } from "../scryfall/localization";
import type { CardLanguage } from "../settings";
import { t } from "../utils/i18n";
import { cardImageFaces } from "./card-image-faces";

const PREVIEW_MARGIN = 12;

export class CardPreview {
	constructor(private readonly currentLanguage: () => CardLanguage = () => "en") {}
	private el: HTMLElement | null = null;
	private overlay: HTMLElement | null = null;
	private currentImageUrl: string | null = null;

	private ensureEl(): HTMLElement {
		if (this.el) return this.el;
		const el = activeDocument.body.createDiv({ cls: "mtg-card-preview is-hidden" });
		this.el = el;
		return el;
	}

	private ensureOverlay(): HTMLElement {
		if (this.overlay) return this.overlay;
		const overlay = activeDocument.body.createDiv({ cls: "mtg-card-preview-overlay is-hidden" });
		overlay.addEventListener("click", (event) => {
			if (event.target === overlay) this.hide();
		});
		this.overlay = overlay;
		return overlay;
	}

	private pickImageUrl(card: ScryfallCard, quality: ImageQuality): string | null {
		return cardImageFaces(card, quality)[0]?.url ?? null;
	}

	showHover(card: ScryfallCard, anchor: HTMLElement, quality: ImageQuality): void {
		const first = this.pickImageUrl(card, quality);
		if (!first) return;
		const faces = cardImageFaces(card, quality);
		const signature = faces.map((face) => face.url).join("||");
		const el = this.ensureEl();

		if (this.currentImageUrl !== signature) {
			el.empty();
			el.toggleClass("is-double-faced", faces.length > 1);
			const holder = faces.length > 1
				? el.createDiv({ cls: "mtg-card-preview-faces" }) : el;
			for (const face of faces) {
				const img = holder.createEl("img", { cls: "mtg-card-preview-img" });
				img.src = face.url;
				img.alt = face.name;
			}
			this.currentImageUrl = signature;
		}

		el.removeClass("is-hidden");
		this.position(el, anchor);
	}

	showTap(card: ScryfallCard, quality: ImageQuality, initialFace = 0): void {
		const faces = cardImageFaces(card, quality);
		if (!faces.length) return;
		const overlay = this.ensureOverlay();
		overlay.empty();
		const inner = overlay.createDiv({ cls: "mtg-card-preview-overlay-inner" });
		inner.setAttribute("role", "dialog");
		inner.setAttribute("aria-label", localizedDisplayName(card, card));
		const image = inner.createEl("img", { cls: "mtg-card-preview-img" });
		let faceIndex = Math.max(0, Math.min(initialFace, faces.length - 1));
		const faceButtons: HTMLButtonElement[] = [];
		const updateFace = () => {
			const face = faces[faceIndex]!;
			image.src = face.url;
			image.alt = face.name;
			for (let index = 0; index < faceButtons.length; index++) {
				faceButtons[index]!.toggleClass("is-active", index === faceIndex);
				faceButtons[index]!.setAttribute("aria-pressed", String(index === faceIndex));
			}
		};
		if (faces.length > 1) {
			const controls = inner.createDiv({ cls: "mtg-card-preview-face-actions" });
			for (let index = 0; index < faces.length; index++) {
				const button = controls.createEl("button", {
					text: t(this.currentLanguage(), index === 0 ? "Front" : "Back"),
					attr: { type: "button", "aria-label": faces[index]!.name },
				});
				button.addEventListener("click", (event) => {
					event.stopPropagation();
					faceIndex = index;
					updateFace();
				});
				faceButtons.push(button);
			}
		}
		updateFace();

		const actions = inner.createDiv({ cls: "mtg-card-preview-tap-actions" });
		if (card.scryfall_uri) {
			const open = actions.createEl("a", {
				cls: "mtg-card-preview-open-scryfall",
				text: t(this.currentLanguage(), "Open in browser"),
				href: card.scryfall_uri,
			});
			open.setAttribute("target", "_blank");
			open.setAttribute("rel", "noopener noreferrer");
			open.addEventListener("click", (ev) => {
				ev.stopPropagation();
				this.hide();
			});
		}
		const close = actions.createEl("button", {
			text: t(this.currentLanguage(), "Close preview"),
			attr: { type: "button" },
		});
		close.addEventListener("click", (event) => {
			event.stopPropagation();
			this.hide();
		});
		overlay.removeClass("is-hidden");
	}

	show(card: ScryfallCard, anchor: HTMLElement, quality: ImageQuality, faceIndex = 0): void {
		if (useTouchCardUi()) {
			this.showTap(card, quality, faceIndex);
		} else {
			this.showHover(card, anchor, quality);
		}
	}

	hide(): void {
		if (this.el) this.el.addClass("is-hidden");
		if (this.overlay) this.overlay.addClass("is-hidden");
	}

	destroy(): void {
		this.el?.remove();
		this.overlay?.remove();
		this.el = null;
		this.overlay = null;
		this.currentImageUrl = null;
	}

	private position(el: HTMLElement, anchor: HTMLElement): void {
		const rect = anchor.getBoundingClientRect();
		const elRect = el.getBoundingClientRect();
		const vw = window.innerWidth;
		const vh = window.innerHeight;

		let left = rect.right + PREVIEW_MARGIN;
		if (left + elRect.width > vw - PREVIEW_MARGIN) {
			left = Math.max(PREVIEW_MARGIN, rect.left - elRect.width - PREVIEW_MARGIN);
		}

		let top = rect.top;
		if (top + elRect.height > vh - PREVIEW_MARGIN) {
			top = Math.max(PREVIEW_MARGIN, vh - elRect.height - PREVIEW_MARGIN);
		}

		el.setCssStyles({
			left: `${left}px`,
			top: `${top}px`,
		});
	}
}
