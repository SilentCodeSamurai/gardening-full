import type {
	ColumnFiltersState,
	Row,
	RowData,
	RowSelectionState,
	SortingState,
	Table as TanstackTable,
} from "@tanstack/react-table";
import type { Dispatch, ReactNode, SetStateAction } from "react";
import { DataTable } from "@/components/table/data-table";
import { ItemList } from "@/components/table/item-list";
import type { CollectionViewMode } from "@/hooks/use-collection-table-state";
import * as m from "@/paraglide/messages.js";

export type CollectionGlobalSearchConfig = {
	value: string;
	onValueChange: (value: string) => void;
	onClearFilters: () => void;
	searchPlaceholder: string;
	clearSearchLabel: string;
	clearFiltersLabel: string;
	trailingActions?: ReactNode;
};

export function buildCollectionGlobalSearch(api: {
	globalFilter: string;
	setGlobalFilter: Dispatch<SetStateAction<string>>;
	setColumnFilters: Dispatch<SetStateAction<ColumnFiltersState>>;
	setRowSelection: Dispatch<SetStateAction<RowSelectionState>>;
}): CollectionGlobalSearchConfig {
	return {
		value: api.globalFilter,
		onValueChange: api.setGlobalFilter,
		searchPlaceholder: m.common_search(),
		clearSearchLabel: m.filtering_clearSearch(),
		clearFiltersLabel: m.filtering_clearFilters(),
		onClearFilters: () => {
			api.setGlobalFilter("");
			api.setColumnFilters([]);
			api.setRowSelection({});
		},
	};
}

type CollectionItemsViewProps<TData extends RowData> = {
	viewMode: CollectionViewMode;
	table: TanstackTable<TData>;
	isPending: boolean;
	isError: boolean;
	errorMessage: string;
	emptyMessage: string;
	globalSearch: CollectionGlobalSearchConfig;
	selectedActions?: ReactNode;
	renderListItem: (row: Row<TData>) => ReactNode;
	highlightPendingRows?: boolean;
	/** List view sort menu: must match `initialSorting` for this collection. */
	listDefaultSorting: SortingState;
};

export function CollectionItemsView<TData extends RowData>({
	viewMode,
	table,
	isPending,
	isError,
	errorMessage,
	emptyMessage,
	globalSearch,
	selectedActions,
	renderListItem,
	highlightPendingRows,
	listDefaultSorting,
}: CollectionItemsViewProps<TData>) {
	if (viewMode === "list") {
		return (
			<ItemList
				table={table}
				isPending={isPending}
				isError={isError}
				errorMessage={errorMessage}
				emptyMessage={emptyMessage}
				globalSearch={globalSearch}
				selectedActions={selectedActions}
				renderItem={renderListItem}
				listDefaultSorting={listDefaultSorting}
			/>
		);
	}
	return (
		<DataTable
			table={table}
			isPending={isPending}
			isError={isError}
			errorMessage={errorMessage}
			emptyMessage={emptyMessage}
			globalSearch={globalSearch}
			highlightPendingRows={highlightPendingRows}
			selectedActions={selectedActions}
		/>
	);
}
