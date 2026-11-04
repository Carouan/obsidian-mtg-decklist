/** Shared settings constraints for the catalog explorer. */
export const CATALOG_PAGE_SIZES = [8, 12, 16, 20, 24, 32, 40, 48, 60] as const;
export const CATALOG_COLUMN_COUNTS = [2, 3, 4, 5, 6] as const;
export const DEFAULT_CATALOG_PAGE_SIZE = 24;
export const DEFAULT_CATALOG_COLUMNS = 4;

export function catalogPageSize(value: number): number {
	return CATALOG_PAGE_SIZES.some((size) => size === value) ? value : DEFAULT_CATALOG_PAGE_SIZE;
}

export function catalogColumnCount(value: number): number {
	return CATALOG_COLUMN_COUNTS.some((count) => count === value) ? value : DEFAULT_CATALOG_COLUMNS;
}
