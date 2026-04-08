import type { Column } from "@tanstack/react-table";
import { ArrowDownIcon, ArrowUpIcon, ChevronsUpDownIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type DataTableColumnHeaderProps<TData, TValue> = {
	column: Column<TData, TValue>;
	title: string;
	className?: string;
};

export function DataTableColumnHeader<TData, TValue>({
	column,
	title,
	className,
}: DataTableColumnHeaderProps<TData, TValue>) {
	if (!column.getCanSort()) {
		return <div className={cn(className)}>{title}</div>;
	}

	return (
		<Button
			type="button"
			variant="ghost"
			size="sm"
			className={cn("-ml-2 h-8 px-2", className)}
			onClick={column.getToggleSortingHandler()}
		>
			<span>{title}</span>
			{column.getIsSorted() === "asc" ? (
				<ArrowUpIcon className="ml-1 size-3.5" />
			) : column.getIsSorted() === "desc" ? (
				<ArrowDownIcon className="ml-1 size-3.5" />
			) : (
				<ChevronsUpDownIcon className="ml-1 size-3.5" />
			)}
		</Button>
	);
}
