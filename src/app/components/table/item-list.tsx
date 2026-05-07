import type { Row, RowData, SortingState, Table as TanstackTable } from "@tanstack/react-table";
import { useVirtualizer } from "@tanstack/react-virtual";
import type { ReactNode } from "react";
import { useCallback, useRef } from "react";
import { PageLoading } from "@/components/layout/page-loading";
import { ListViewFiltersModalControl, ListViewSortDropdown } from "@/components/table/list-view-filters-sort";
import { TableGlobalSearch } from "@/components/table/table-global-search";
import { ItemGroup } from "@/components/ui/item";
import * as m from "@/paraglide/messages.js";

type ItemListProps<TData extends RowData> = {
	table: TanstackTable<TData>;
	isPending: boolean;
	isError: boolean;
	errorMessage: string;
	emptyMessage: string;
	renderItem: (row: Row<TData>) => ReactNode;
	selectedLabel?: string;
	selectedActions?: ReactNode;
	globalSearch?: {
		value: string;
		onValueChange: (value: string) => void;
		onClearFilters: () => void;
		searchPlaceholder: string;
		clearSearchLabel: string;
		clearFiltersLabel: string;
		trailingActions?: ReactNode;
	};
	listDefaultSorting: SortingState;
};

const ITEM_LIST_OVERSCAN = 10;

export function ItemList<TData extends RowData>({
	table,
	isPending,
	isError,
	errorMessage,
	emptyMessage,
	renderItem,
	selectedLabel = m.common_selected(),
	selectedActions,
	globalSearch,
	listDefaultSorting,
}: ItemListProps<TData>) {
	const rows = table.getRowModel().rows;
	const rowCount = rows.length;
	const selectedCount = table.getFilteredSelectedRowModel().rows.length;
	const scrollParentRef = useRef<HTMLDivElement>(null);
	const rowsRef = useRef(rows);
	rowsRef.current = rows;
	const getItemKey = useCallback((index: number) => rowsRef.current[index]?.id ?? index, []);

	// eslint-disable-next-line react-hooks/incompatible-library -- TanStack Virtual scroll sync; compiler skips memoization for this subtree.
	const rowVirtualizer = useVirtualizer({
		count: rowCount,
		enabled: rowCount > 0 && !isError,
		getScrollElement: () => scrollParentRef.current,
		estimateSize: () => 112,
		overscan: ITEM_LIST_OVERSCAN,
		getItemKey,
	});
	const virtualRows = rowVirtualizer.getVirtualItems();

	if (isError) {
		return (
			<p className="text-destructive text-sm" role="alert">
				{errorMessage}
			</p>
		);
	}

	return (
		<div className="flex min-h-0 min-w-0 flex-1 flex-col gap-2">
			{globalSearch ? (
				<TableGlobalSearch
					value={globalSearch.value}
					onValueChange={globalSearch.onValueChange}
					onClearFilters={globalSearch.onClearFilters}
					searchPlaceholder={globalSearch.searchPlaceholder}
					clearSearchLabel={globalSearch.clearSearchLabel}
					clearFiltersLabel={globalSearch.clearFiltersLabel}
					trailingActions={
						<>
							<ListViewFiltersModalControl table={table} />
							<ListViewSortDropdown table={table} listDefaultSorting={listDefaultSorting} />
							{globalSearch.trailingActions}
						</>
					}
				/>
			) : null}
			<div className="flex min-h-8 shrink-0 flex-wrap items-center gap-2">
				<p className="text-muted-foreground text-xs">{`${selectedCount} / ${rowCount} ${selectedLabel}`}</p>
				{selectedActions}
			</div>
			{rowCount === 0 ? (
				isPending ? (
					<div className="flex min-h-0 min-w-0 flex-1 flex-col">
						<PageLoading showLabel={false} variant="page" className="w-full" />
					</div>
				) : (
					<div className="flex min-h-0 min-w-0 flex-1 items-center justify-center text-sm">{emptyMessage}</div>
				)
			) : (
				<div
					ref={scrollParentRef}
					className="min-h-0 min-w-0 flex-1 overflow-y-auto overflow-x-hidden [scrollbar-gutter:stable]"
				>
					<div className="relative w-full" style={{ height: `${rowVirtualizer.getTotalSize()}px` }}>
						<ItemGroup
							className="absolute inset-0 gap-0"
							style={{ position: "relative", height: `${rowVirtualizer.getTotalSize()}px` }}
						>
							{virtualRows.map((virtualRow) => {
								const row = rows[virtualRow.index];
								if (!row) return null;
								return (
									<div
										key={row.id}
										data-index={virtualRow.index}
										ref={rowVirtualizer.measureElement}
										className="absolute top-0 left-0 w-full pb-2"
										style={{ transform: `translateY(${virtualRow.start}px)` }}
									>
										{renderItem(row)}
									</div>
								);
							})}
						</ItemGroup>
					</div>
				</div>
			)}
		</div>
	);
}

