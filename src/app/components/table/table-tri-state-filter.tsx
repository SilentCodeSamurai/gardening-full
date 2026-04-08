import type { FilterFn, RowData } from "@tanstack/react-table";
import type { ReactNode } from "react";
import { CheckIcon, MinusIcon, XIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuRadioGroup,
	DropdownMenuRadioItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

type ColumnLike = {
	getFilterValue: () => unknown;
	setFilterValue: (v: string) => void;
};

export type TableTriStateFilterLabels = {
	all: string;
	true: string;
	false: string;
};

export function createTriStateColumnFilterFn<TData extends RowData>(params: {
	filterTrue: string;
	filterFalse: string;
	cellTrue: string;
	cellFalse: string;
}): FilterFn<TData> {
	return (row, columnId, filterValue) => {
		const v = String(filterValue ?? "");
		if (v === "") return true;
		const cell = String(row.getValue(columnId));
		if (v === params.filterTrue) return cell === params.cellTrue;
		if (v === params.filterFalse) return cell === params.cellFalse;
		return true;
	};
}

type TableTriStateFilterProps = {
	column: ColumnLike;
	filterTrue: string;
	filterFalse: string;
	labels: TableTriStateFilterLabels;
};

/**
 * Tri-state column filter: dropdown + icon (minus = all, check = yes, X = no) with tooltip.
 */
export function TableTriStateFilter({ column, filterTrue, filterFalse, labels }: TableTriStateFilterProps) {
	const raw = String(column.getFilterValue() ?? "");
	const mode = raw === filterTrue ? "true" : raw === filterFalse ? "false" : "all";

	let icon: ReactNode;
	if (mode === "all") {
		icon = <MinusIcon className="size-3.5 text-muted-foreground" aria-hidden />;
	} else if (mode === "true") {
		icon = <CheckIcon className="size-3.5 text-emerald-500" aria-hidden />;
	} else {
		icon = <XIcon className="size-3.5 text-muted-foreground" aria-hidden />;
	}
	const tooltipText = mode === "all" ? labels.all : mode === "true" ? labels.true : labels.false;

	return (
		<DropdownMenu>
			<Tooltip>
				<TooltipTrigger asChild>
					<DropdownMenuTrigger asChild>
						<Button
							type="button"
							variant="outline"
							size="icon"
							className="h-8 w-8 shrink-0"
							aria-label={tooltipText}
						>
							{icon}
						</Button>
					</DropdownMenuTrigger>
				</TooltipTrigger>
				<TooltipContent side="top">{tooltipText}</TooltipContent>
			</Tooltip>
			<DropdownMenuContent align="center" className="w-44">
				<DropdownMenuRadioGroup
					value={mode === "all" ? "all" : mode === "true" ? "t" : "f"}
					onValueChange={(v) => {
						if (v === "all") column.setFilterValue("");
						else if (v === "t") column.setFilterValue(filterTrue);
						else column.setFilterValue(filterFalse);
					}}
				>
					<DropdownMenuRadioItem value="all">{labels.all}</DropdownMenuRadioItem>
					<DropdownMenuRadioItem value="t">{labels.true}</DropdownMenuRadioItem>
					<DropdownMenuRadioItem value="f">{labels.false}</DropdownMenuRadioItem>
				</DropdownMenuRadioGroup>
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
