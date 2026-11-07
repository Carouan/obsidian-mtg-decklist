import { useTouchCardUi } from "../utils/touch-ui";
import type { ImageQuality } from "../settings";
import type { ScryfallCard } from "../scryfall/types";
import { localizedDisplayName } from "../scryfall/localization";
import type { CardLanguage } from "../settings";
import { t } from "../utils/i18n";
import { cardImageFaces } from "./card-image-faces";
import { cardTextFaces, preferredImageCard, type CardImagePreference } from "../scryfall/card-presentation";

const PREVIEW_MARGIN = 12;

export class CardPreview {
	constructor(
		private readonly currentLanguage: () => CardLanguage = () => "en",
		private readonly currentImagePreference: () => CardImagePreference = () => "readable",
		private readonly fetchCurrentText: (card: ScryfallCard) => Promise<ScryfallCard | null> = async () => null,
	) {}
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

	showHover(card: ScryfallCard, anchor: HTMLElement, quality: ImageQuality, canonical?: ScryfallCard): void {
		const imageCard = preferredImageCard(card, canonical, this.currentImagePreference());
		if (!this.pickImageUrl(imageCard, quality)) return;
		const faces = cardImageFaces(imageCard, quality);
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

	showTap(card: ScryfallCard, quality: ImageQuality, initialFace = 0, canonical?: ScryfallCard): void {
		this.openDetails(card, quality, initialFace, canonical);
	}

	/**
	 * Click/tap opens an accessible text view, without requiring a readable
	 * printed scan. The live Scryfall Oracle text is only fetched if the user
	 * actually expands the text, not for every gallery thumbnail.
	 */
	openDetails(card: ScryfallCard, quality: ImageQuality, initialFace = 0, canonical?: ScryfallCard): void {
		const imageCard = preferredImageCard(card, canonical, this.currentImagePreference());
		const faces = cardImageFaces(imageCard, quality);
		if (!faces.length) return;
		this.el?.addClass("is-hidden");
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

		const textButton = inner.createEl("button", {
			cls: "mtg-card-preview-text-toggle",
			text: t(this.currentLanguage(), "Show card text"),
			attr: { type: "button", "aria-expanded": "false" },
		});
		const textPanel = inner.createDiv({ cls: "mtg-card-preview-text-panel is-hidden" });
		let expanded = false;
		let requested = false;
		let updatedCard: ScryfallCard | null = null;
		let requestFailed = false;
		const renderText = () => {
			textPanel.empty();
			const oracle = updatedCard ?? canonical ?? card;
			const textFaces = cardTextFaces(card, oracle);
			const selected = faces.length > 1
				? [textFaces[Math.min(faceIndex, textFaces.length - 1)]!]
				: textFaces; // split/adventure cards: both texts on one physical face
			for (const face of selected) {
				const group = textPanel.createDiv({ cls: "mtg-card-preview-text-face" });
				group.createDiv({ cls: "mtg-card-preview-text-name", text: face.localizedName ?? face.englishName });
				if (face.printedText || face.printedType) {
					group.createDiv({ cls: "mtg-card-preview-text-heading", text: t(this.currentLanguage(), "Printed text (localized, historical)") });
					if (face.printedType) group.createDiv({ cls: "mtg-card-preview-text-type", text: face.printedType });
					if (face.printedText) group.createDiv({ cls: "mtg-card-preview-text-rules", text: face.printedText });
				}
				group.createDiv({ cls: "mtg-card-preview-text-heading", text: t(this.currentLanguage(), "Oracle text (English, current rules)") });
				if (face.oracleType) group.createDiv({ cls: "mtg-card-preview-text-type", text: face.oracleType });
				group.createDiv({ cls: "mtg-card-preview-text-rules", text: face.oracleText ?? t(this.currentLanguage(), "No rules text available") });
			}
			const status = updatedCard
				? "Oracle text checked with Scryfall"
				: requestFailed ? "Live lookup unavailable; showing cached text" : "Checking current Oracle text…";
			textPanel.createDiv({ cls: "mtg-card-preview-text-status", text: t(this.currentLanguage(), status) });
		};
		// Keep text in sync when the user changes faces after opening it.
		for (const button of faceButtons) {
			button.addEventListener("click", () => { if (expanded) renderText(); });
		}
		textButton.addEventListener("click", () => {
			expanded = !expanded;
			inner.toggleClass("has-text", expanded);
			textPanel.toggleClass("is-hidden", !expanded);
			textButton.setText(t(this.currentLanguage(), expanded ? "Hide card text" : "Show card text"));
			textButton.setAttribute("aria-expanded", String(expanded));
			if (!expanded) return;
			renderText();
			if (requested) return;
			requested = true;
			void this.fetchCurrentText(canonical ?? card).then((fresh) => {
				if (!textPanel.isConnected) return;
				updatedCard = fresh;
				requestFailed = !fresh;
				if (expanded) renderText();
			}).catch(() => {
				if (!textPanel.isConnected) return;
				requestFailed = true;
				if (expanded) renderText();
			});
		});

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

	show(card: ScryfallCard, anchor: HTMLElement, quality: ImageQuality, faceIndex = 0, canonical?: ScryfallCard): void {
		if (useTouchCardUi()) {
			this.showTap(card, quality, faceIndex, canonical);
		} else {
			this.showHover(card, anchor, quality, canonical);
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
