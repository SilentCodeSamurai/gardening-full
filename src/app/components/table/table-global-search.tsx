import type { ReactNode } from "react";
import { XIcon } from "lucide-react";
import { DebouncedInput } from "@/components/ui/debounced-input";
import { Button } from "@/components/ui/button";
import { ButtonTooltip } from "@/components/ui/button-tooltip";

type TableGlobalSearchProps = {
	value: string;
	onValueChange: (value: string) => void;
	onClearFilters: () => void;
	searchPlaceholder: string;
	clearSearchLabel: string;
	clearFiltersLabel: string;
	searchInputClassName?: string;
	trailingActions?: ReactNode;
};

export function TableGlobalSearch({
	value,
	onValueChange,
	onClearFilters,
	searchPlaceholder,
	clearSearchLabel,
	clearFiltersLabel,
	searchInputClassName = "w-full min-w-40 sm:w-56",
	trailingActions,
}: TableGlobalSearchProps) {
	return (
		<div className="flex flex-wrap items-end gap-2">
			<DebouncedInput
				className={searchInputClassName}
				placeholder={searchPlaceholder}
				value={value}
				onChange={onValueChange}
				showClear
				clearAriaLabel={clearSearchLabel}
				aria-label={searchPlaceholder}
			/>
			<ButtonTooltip label={clearFiltersLabel}>
				<Button
					type="button"
					variant="outline"
					size="icon"
					onClick={onClearFilters}
					aria-label={clearFiltersLabel}
				>
					<XIcon />
				</Button>
			</ButtonTooltip>
			{trailingActions}
		</div>
	);
}
