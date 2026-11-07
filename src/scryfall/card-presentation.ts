import type { ScryfallCard, ScryfallCardFace } from "./types";

export type CardImagePreference = "readable" | "localized";

/**
 * Prefer a verified HD scan over a fuzzy localized scan, but never assume
 * that an English image is high definition merely because it is English.
 */
export function cardImageQualityScore(card: ScryfallCard): number {
	if (card.image_status === "missing" || card.image_status === "placeholder") return 0;
	if (card.image_status === "highres_scan") return 4;
	if (card.image_status === "lowres") return 1;
	if (card.highres_image === true) return 3;
	if (card.highres_image === false) return 1;
	return 2; // unknown quality: do not assert that it is HD
}

function hasCardImage(card: ScryfallCard): boolean {
	return Boolean(card.image_uris || card.card_faces?.some((face) => face.image_uris));
}

/** Only the image source changes; names and local printed text stay localized. */
export function preferredImageCard(
	localized: ScryfallCard,
	canonical: ScryfallCard | undefined,
	preference: CardImagePreference,
): ScryfallCard {
	if (!hasCardImage(localized)) return canonical && hasCardImage(canonical) ? canonical : localized;
	if (preference === "localized" || !canonical || localized.lang === "en" || localized.id === canonical.id) return localized;
	if (!hasCardImage(canonical)) return localized;
	const localizedQuality = cardImageQualityScore(localized);
	const englishQuality = cardImageQualityScore(canonical);
	// Switch only when the English printing is *known* high resolution and
	// the localized scan is *known* inadequate.
	return englishQuality >= 3 && localizedQuality <= 1 ? canonical : localized;
}

export interface CardTextFace {
	englishName: string;
	localizedName?: string;
	printedType?: string;
	printedText?: string;
	oracleType?: string;
	oracleText?: string;
}

/**
 * Scryfall's printed_text is the text at the time of printing; oracle_text
 * is the current English rules text. They must never be conflated.
 */
export function cardTextFaces(localized: ScryfallCard, oracle: ScryfallCard): CardTextFace[] {
	const length = Math.max(localized.card_faces?.length ?? 0, oracle.card_faces?.length ?? 0, 1);
	return Array.from({ length }, (_, index) => {
		const printed: ScryfallCardFace | ScryfallCard = localized.card_faces?.[index] ?? localized;
		const source: ScryfallCardFace | ScryfallCard = oracle.card_faces?.[index] ?? oracle;
		return {
			englishName: source.name ?? oracle.name,
			localizedName: localized.lang !== "en" ? printed.printed_name ?? undefined : undefined,
			printedType: localized.lang !== "en" ? printed.printed_type_line ?? undefined : undefined,
			printedText: localized.lang !== "en" ? printed.printed_text ?? undefined : undefined,
			oracleType: source.type_line ?? undefined,
			oracleText: source.oracle_text ?? undefined,
		};
	});
}
