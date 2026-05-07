import { LayoutGridIcon, TableIcon } from "lucide-react";
import { ButtonTooltip } from "@/components/ui/button-tooltip";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import type { CollectionViewMode } from "@/hooks/use-collection-table-state";
import * as m from "@/paraglide/messages.js";

type TableViewModeToggleProps = {
	value: CollectionViewMode;
	onValueChange: (mode: CollectionViewMode) => void;
};

export function TableViewModeToggle({ value, onValueChange }: TableViewModeToggleProps) {
	const tableViewLabel = m.common_tableView();
	const listViewLabel = m.common_listView();

	return (
		<ToggleGroup
			type="single"
			variant="outline"
			size="md"
			value={value}
			onValueChange={(next) => {
				if (next === "table" || next === "list") onValueChange(next);
			}}
		>
			<ToggleGroupItem value="table" aria-label={tableViewLabel}>
				<ButtonTooltip label={tableViewLabel}>
					<span className="flex size-full items-center justify-center">
						<TableIcon className="size-4" />
					</span>
				</ButtonTooltip>
			</ToggleGroupItem>
			<ToggleGroupItem value="list" aria-label={listViewLabel}>
				<ButtonTooltip label={listViewLabel}>
					<span className="flex size-full items-center justify-center">
						<LayoutGridIcon className="size-4" />
					</span>
				</ButtonTooltip>
			</ToggleGroupItem>
		</ToggleGroup>
	);
}
