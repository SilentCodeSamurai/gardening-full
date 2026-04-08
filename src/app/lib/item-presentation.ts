import type { ItemPresentationValueObject } from "@backend/core/domain/gardening/value-objects";
import type { ItemPresentationIconKey as BackendItemPresentationIconKey } from "@backend/core/domain/gardening/enums";
import { ITEM_PRESENTATION_ICON_KEYS } from "@/lib/item-presentation-icon-registry";

export { ITEM_PRESENTATION_ICON_KEYS };
export type ItemPresentationIconKey = BackendItemPresentationIconKey;

export function normalizePresentationInput(input: {
	iconKey: string;
	iconColor: string;
	backgroundColor: string;
}): ItemPresentationValueObject | undefined {
	const iconKeyRaw = input.iconKey.trim();
	const iconColor = input.iconColor.trim();
	const backgroundColor = input.backgroundColor.trim();
	const iconKey = ITEM_PRESENTATION_ICON_KEYS.includes(iconKeyRaw as ItemPresentationIconKey)
		? (iconKeyRaw as ItemPresentationIconKey)
		: undefined;

	if (!iconKey && !iconColor && !backgroundColor) return undefined;

	return {
		...(iconKey ? { iconKey } : {}),
		...(iconColor ? { iconColor } : {}),
		...(backgroundColor ? { backgroundColor } : {}),
	};
}
