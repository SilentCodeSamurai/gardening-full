/**
 * Pixel widths for TanStack column defs used with `DataTable` (`table-fixed` + `<colgroup>`).
 * Tune here to rebalance select / primary name/title vs compact icon columns across list pages.
 *
 * `iconFlag` columns show short header *words* in some locales but long ones in others (e.g. RU
 * **Пользовательский**); keep enough default width + wrapping `th` classes so labels do not paint
 * into the next column. `rowActions` stays a bit narrower (⋯ only in cells).
 */

/** Row-selection column: fixed width everywhere (`colgroup` + `th`/`td` classes must match). */
export const TABLE_LIST_SELECT_COLUMN_WIDTH_PX = 32;

const iconFlagColumn = { size: 140, minSize: 112, maxSize: 280 } as const;
const rowActionsColumn = { size: 72, minSize: 56, maxSize: 120 } as const;
/** Parent / root canvas / unplaced — combobox-style cell */
const placementColumn = { size: 220, minSize: 168, maxSize: 420 } as const;

const selectColumnSizing = {
	size: TABLE_LIST_SELECT_COLUMN_WIDTH_PX,
	minSize: TABLE_LIST_SELECT_COLUMN_WIDTH_PX,
	maxSize: TABLE_LIST_SELECT_COLUMN_WIDTH_PX,
} as const;

export const tableListColumnSizes = {
	select: selectColumnSizing,
	/** Main name / title link column */
	primaryLink: { size: 300, minSize: 120, maxSize: 320 },
	/** Custom/default, species-category flags, etc. */
	iconFlag: iconFlagColumn,
	placement: placementColumn,
	rowActions: rowActionsColumn,
} as const;

/**
 * No `max-w-*` / `w-*` on `th`: those forced ~44px while `TableHead` is `whitespace-nowrap`, so long
 * i18n titles overflow into sibling columns. `whitespace-normal` + `break-words` keeps text in-column.
 */
const compactCenteredHeader = "min-w-0 px-0.5 text-center whitespace-normal leading-tight break-words";

const placementHeader = "min-w-0 px-2 text-left whitespace-normal leading-tight break-words align-middle";

/** Literal `36` for Tailwind content scan; keep in sync with `TABLE_LIST_SELECT_COLUMN_WIDTH_PX`. */
const selectHeaderAndCellWidthClass = "box-border w-[36px] min-w-[36px] max-w-[36px]";

export const tableListHeaderClasses = {
	select: `${selectHeaderAndCellWidthClass} px-0.5`,
	iconFlag: compactCenteredHeader,
	placement: placementHeader,
	actions: compactCenteredHeader,
} as const;

/** `min-w-0` so flex children respect narrow `colgroup` widths and long i18n titles wrap. */
export const tableListCompactHeaderInnerClass =
	"flex w-full min-w-0 items-center justify-center text-center text-xs font-medium leading-tight px-3";

export const tableListCompactHeaderInnerClassMuted =
	"flex w-full min-w-0 items-center justify-center text-center text-xs font-medium leading-tight text-muted-foreground px-3";

/** Left-aligned title inside `placement` column header `th`. */
export const tableListPlacementHeaderInnerClass = "block w-full min-w-0 text-left text-xs font-medium leading-tight";

/**
 * Match compact header horizontal padding (`px-0.5`); override default `TableCell` `p-2`, which
 * made narrow icon columns look off-center vs `th`. Keep `table-cell` display — center with inner
 * `flex w-full …` wrappers, not `display:flex` on `td` (breaks table layout in some engines).
 */
const compactCenteredCell = "px-0.5 py-2 text-center align-middle";

const placementCell = "min-w-0 px-2 py-1.5 align-middle";

export const tableListCellClasses = {
	select: `${compactCenteredCell} ${selectHeaderAndCellWidthClass}`,
	iconFlag: compactCenteredCell,
	placement: placementCell,
	actions: compactCenteredCell,
} as const;
