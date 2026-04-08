import { useMemo } from "react";

import { ItemPresentationIcon } from "@/components/icon/item-presentation-icon";
import {
	Combobox,
	ComboboxContent,
	ComboboxEmpty,
	ComboboxInput,
	ComboboxItem,
	ComboboxList,
} from "@/components/ui/combobox";
import type { ItemPresentationValueObject } from "@backend/core/domain/gardening/value-objects";

export type PlacementFilterComboboxItem = {
	id: string;
	filter: string;
	label: string;
	presentation?: ItemPresentationValueObject;
};

type ColumnLike = {
	getFilterValue: () => unknown;
	setFilterValue: (v: string) => void;
};

/**
 * Placement column filter: combobox with dynamic location options (e.g. unplaced, root/self, under each location).
 */
export function TablePlacementFilterCombobox({
	column,
	items,
	allPlaceholder,
	emptyMessage,
	ariaLabel,
}: {
	column: ColumnLike;
	items: PlacementFilterComboboxItem[];
	allPlaceholder: string;
	emptyMessage: string;
	ariaLabel: string;
}) {
	const raw = String(column.getFilterValue() ?? "");
	const selected = useMemo(() => items.find((o) => o.filter === raw) ?? items[0], [items, raw]);

	return (
		<Combobox
			items={items}
			value={selected}
			onValueChange={(item) => column.setFilterValue(item?.filter ?? "")}
			itemToStringLabel={(o) => o.label}
			itemToStringValue={(o) => o.id}
			isItemEqualToValue={(a, b) => a.id === b.id}
		>
			<ComboboxInput
				className="min-w-0 w-full"
				placeholder={allPlaceholder}
				aria-label={ariaLabel}
				showClear={selected.filter !== ""}
				startAdornment={
					selected?.presentation ? <ItemPresentationIcon presentation={selected.presentation} /> : null
				}
			/>
			<ComboboxContent className="z-100">
				<ComboboxEmpty>{emptyMessage}</ComboboxEmpty>
				<ComboboxList>
					{(item) => (
						<ComboboxItem key={item.id} value={item}>
							{item.presentation ? <ItemPresentationIcon presentation={item.presentation} /> : null}
							<span className="min-w-0 flex-1 truncate">{item.label}</span>
						</ComboboxItem>
					)}
				</ComboboxList>
			</ComboboxContent>
		</Combobox>
	);
}
