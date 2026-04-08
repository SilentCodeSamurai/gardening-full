import * as m from "@/paraglide/messages.js";

export type TableSelectionBulkTooltipInput = {
	selectedCount: number;
	hasPlacedInSelection: boolean;
	/**
	 * When `"pickSingleLocationForEvent"`, more than one selected shows the “pick one location” message
	 * (table create-event from locations). Omit for plant lists or delete-many (multi-select OK).
	 */
	whenMoreThanOne?: "pickSingleLocationForEvent";
	enabledTooltip: string;
};

/**
 * Shared copy for table bulk actions: none selected, optional single-row rule, placed guard, then enabled hint.
 */
export function tableSelectionBulkTooltip(input: TableSelectionBulkTooltipInput): string {
	if (input.selectedCount === 0) return m["common.actionRequiresSelection"]();
	if (input.hasPlacedInSelection) return m["common.actionDisabledSelectionContainsPlaced"]();
	if (input.whenMoreThanOne === "pickSingleLocationForEvent" && input.selectedCount !== 1) {
		return m["collections.gardeningEvent.createFromTablePickSingleLocation"]();
	}
	return input.enabledTooltip;
}
