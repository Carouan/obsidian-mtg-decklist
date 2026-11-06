import type { ImageQuality } from "../settings";
import type { ScryfallCard, ScryfallImageUris } from "../scryfall/types";

/** A physical front or back; not two spells printed on the same front side. */
export interface CardImageFace {
	url: string;
	name: string;
}

const DOUBLE_SIDED_LAYOUTS = new Set([
	"transform",
	"modal_dfc",
	"double_faced_token",
	"reversible_card",
	"art_series",
]);

export function imageUrlForQuality(uris: ScryfallImageUris | undefined, quality: ImageQuality): string | null {
	if (!uris) return null;
	if (quality === "png") return uris.png ?? uris.large ?? uris.normal ?? uris.small ?? null;
	return uris[quality] ?? uris.normal ?? uris.large ?? uris.small ?? null;
}

/**
 * Scryfall places DFC images on individual card_faces; split, adventure and
 * flip layouts normally have one combined front image at the card level.
 * Do not invent a back side from the mere presence of card_faces.
 */
export function cardImageFaces(card: ScryfallCard, quality: ImageQuality): CardImageFace[] {
	const faces = card.card_faces ?? [];
	const faceUrls = faces.map((face) => imageUrlForQuality(face.image_uris, quality));
	const isDoubleSided = DOUBLE_SIDED_LAYOUTS.has(card.layout ?? "") ||
		(!card.layout && !card.image_uris && faceUrls.length > 1 && faceUrls.every(Boolean));

	if (isDoubleSided && faceUrls.length > 1 && faceUrls.every(Boolean)) {
		return faces.map((face, index) => ({
			url: faceUrls[index]!,
			name: face.printed_name ?? face.name ?? card.name.split(" // ")[index] ?? card.name,
		}));
	}

	const front = imageUrlForQuality(card.image_uris, quality) ??
		imageUrlForQuality(faces[0]?.image_uris, quality);
	return front ? [{
		url: front,
		name: card.printed_name ?? card.name,
	}] : [];
}
