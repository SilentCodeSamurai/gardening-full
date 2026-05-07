import type { NavigateFn } from "@tanstack/react-router";
import type { ColumnFiltersState, RowSelectionState, SortingState, VisibilityState } from "@tanstack/react-table";
import { useCallback, useEffect, useState } from "react";
import { useIsMobile } from "@/hooks/use-mobile";
import { useTableUrlSync } from "@/lib/use-table-url-sync";

export type CollectionViewMode = "table" | "list";

/** One preference for all collection list pages (shared via localStorage). */
export const COLLECTION_VIEW_MODE_STORAGE_KEY = "gardening-full:collection-view-mode";

export type CollectionPageUrlSearch = {
	q?: string;
	sortBy?: string;
	sortDesc?: boolean;
	cf?: string;
};

export function useCollectionViewMode() {
	const isMobile = useIsMobile();
	const [viewModeOverride, setViewModeOverride] = useState<CollectionViewMode | null>(null);

	useEffect(() => {
		if (typeof window === "undefined") return;
		const read = () => {
			const saved = window.localStorage.getItem(COLLECTION_VIEW_MODE_STORAGE_KEY);
			if (saved === "table" || saved === "list") {
				setViewModeOverride(saved);
			}
		};
		read();
		const onStorage = (event: StorageEvent) => {
			if (event.key !== COLLECTION_VIEW_MODE_STORAGE_KEY) return;
			if (event.newValue === "table" || event.newValue === "list") {
				setViewModeOverride(event.newValue);
			}
			if (event.newValue === null) {
				setViewModeOverride(null);
			}
		};
		window.addEventListener("storage", onStorage);
		return () => window.removeEventListener("storage", onStorage);
	}, []);

	const setViewMode = useCallback((next: CollectionViewMode) => {
		setViewModeOverride(next);
		if (typeof window !== "undefined") {
			window.localStorage.setItem(COLLECTION_VIEW_MODE_STORAGE_KEY, next);
		}
	}, []);

	const viewMode: CollectionViewMode = viewModeOverride ?? (isMobile ? "list" : "table");

	return { viewMode, setViewMode, isMobile };
}

type UseCollectionTableStateArgs = {
	initialSortId: string;
	searchQ?: string;
	searchSortBy?: string;
	searchSortDesc?: boolean;
	initialColumnFilters?: () => ColumnFiltersState;
	initialColumnVisibility?: VisibilityState;
};

export function useCollectionTableState({
	initialSortId,
	searchQ,
	searchSortBy,
	searchSortDesc,
	initialColumnFilters,
	initialColumnVisibility = { globalSearch: false },
}: UseCollectionTableStateArgs) {
	const { viewMode, setViewMode, isMobile } = useCollectionViewMode();
	const [sorting, setSorting] = useState<SortingState>([
		{ id: searchSortBy ?? initialSortId, desc: Boolean(searchSortDesc) },
	]);
	const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>(() => initialColumnFilters?.() ?? []);
	const [globalFilter, setGlobalFilter] = useState(searchQ ?? "");
	const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
	const [columnVisibility, setColumnVisibility] = useState<VisibilityState>(initialColumnVisibility);

	return {
		sorting,
		setSorting,
		columnFilters,
		setColumnFilters,
		globalFilter,
		setGlobalFilter,
		rowSelection,
		setRowSelection,
		columnVisibility,
		setColumnVisibility,
		viewMode,
		setViewMode,
		isMobile,
	};
}

type UseCollectionPageStateArgs = UseCollectionTableStateArgs & {
	navigate: NavigateFn;
	urlSearch: CollectionPageUrlSearch;
	initialSorting: SortingState;
	/**
	 * When column filters are reconciled before persisting to `cf` (e.g. plants, cultivars),
	 * return the canonical filter list to serialize in the URL.
	 */
	getUrlColumnFilters?: (columnFilters: ColumnFiltersState) => ColumnFiltersState;
};

/** Table state + URL sync for collection pages that use plain column filter state (no reconcile layer). */
export function useCollectionPageState({
	navigate,
	urlSearch,
	initialSorting,
	getUrlColumnFilters,
	...tableArgs
}: UseCollectionPageStateArgs) {
	const state = useCollectionTableState(tableArgs);
	const columnFiltersForUrl = getUrlColumnFilters
		? getUrlColumnFilters(state.columnFilters)
		: state.columnFilters;
	useTableUrlSync({
		searchQ: urlSearch.q,
		searchSortBy: urlSearch.sortBy,
		searchSortDesc: urlSearch.sortDesc,
		searchCf: urlSearch.cf,
		initialSorting,
		sorting: state.sorting,
		setSorting: state.setSorting,
		globalFilter: state.globalFilter,
		setGlobalFilter: state.setGlobalFilter,
		columnFilters: columnFiltersForUrl,
		setColumnFilters: state.setColumnFilters,
		navigate,
		currentSearch: {
			q: urlSearch.q,
			sortBy: urlSearch.sortBy,
			sortDesc: urlSearch.sortDesc,
			cf: urlSearch.cf,
		},
	});
	return state;
}
