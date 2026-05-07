import type { SpeciesEntity } from "@backend/core/domain/gardening/entities";
import type { ItemPresentationValueObject } from "@backend/core/domain/gardening/value-objects";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
	type Column,
	type ColumnFiltersState,
	createColumnHelper,
	createTable,
	getCoreRowModel,
	getFilteredRowModel,
	getSortedRowModel,
	type SortingState,
	type Updater,
} from "@tanstack/react-table";
import { EllipsisVerticalIcon, ExternalLinkIcon, PencilIcon, PlusIcon, Trash2Icon } from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import { DashboardPageContent } from "#/app/components/layout/dashboard-page-content";
import { DashboardPageHeading } from "#/app/components/layout/dashboard-page-heading";
import { CultivarCreateDialog } from "@/components/gardening/cultivar/cultivar-create-dialog";
import { CultivarListCard } from "@/components/gardening/cultivar/cultivar-list-card";
import { CultivarUpdateDialog } from "@/components/gardening/cultivar/cultivar-update-dialog";
import { CultivarUpdateManyDialog } from "@/components/gardening/cultivar/cultivar-update-many-dialog";
import { DeleteConfirmDialog } from "@/components/gardening/shared/delete-confirm-dialog";
import { ItemPresentationIcon } from "@/components/icon/item-presentation-icon";
import { buildCollectionGlobalSearch, CollectionItemsView } from "@/components/table/collection-items-view";
import { DataTableColumnHeader } from "@/components/table/data-table-column-header";
import { fuzzyFilter } from "@/components/table/fuzzy-filter";
import {
	tableListCellClasses,
	tableListColumnSizes,
	tableListCompactHeaderInnerClass,
	tableListCompactHeaderInnerClassMuted,
	tableListHeaderClasses,
} from "@/components/table/table-list-column-sizes";
import { Button } from "@/components/ui/button";
import { ButtonTooltip } from "@/components/ui/button-tooltip";
import { Checkbox } from "@/components/ui/checkbox";
import {
	Combobox,
	ComboboxContent,
	ComboboxEmpty,
	ComboboxInput,
	ComboboxItem,
	ComboboxList,
} from "@/components/ui/combobox";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSub,
	DropdownMenuSubContent,
	DropdownMenuSubTrigger,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useCollectionPageState } from "@/hooks/use-collection-table-state";
import { CATALOG_FILTER_NO_VALUE } from "@/lib/catalog-filter-sentinel";
import { renderError } from "@/lib/render-error";
import { tableSelectionBulkTooltip } from "@/lib/table-selection-tooltips";
import { parseUrlColumnFilters, serializeUrlColumnFilters } from "@/lib/table-url-filters";
import { translateCatalogField } from "@/lib/translate-catalog-field";
import * as m from "@/paraglide/messages.js";
import { queryKeys } from "@/store/keys";
import { useCultivarDeleteManyMutation, useCultivarDeleteMutation } from "@/store/mutations";
import type { CachedCultivar } from "@/store/query-cache-types";
import { isQueryObjectPending } from "@/store/query-object-status";

type CultivarCategoryFilterOption = {
	value: string;
	label: string;
	presentation?: ItemPresentationValueObject | null;
};

type CultivarSpeciesFilterOption = {
	value: string;
	label: string;
	categoryId: string;
	presentation?: ItemPresentationValueObject | null;
};

export const Route = createFileRoute("/_authenticated/catalog/cultivars")({
	validateSearch: (search: Record<string, unknown>) => {
		const next: { q?: string; sortBy?: string; sortDesc?: boolean; cf?: string } = {};
		if (typeof search.q === "string") next.q = search.q;
		if (typeof search.sortBy === "string") next.sortBy = search.sortBy;
		if (typeof search.sortDesc === "boolean") next.sortDesc = search.sortDesc;
		if (typeof search.cf === "string") next.cf = search.cf;
		return next;
	},
	component: CultivarsPage,
});

const CULTIVARS_LIST_DEFAULT_SORTING: SortingState = [{ id: "title", desc: false }];

function applyUpdater<T>(updater: Updater<T>, previous: T): T {
	return typeof updater === "function" ? (updater as (old: T) => T)(previous) : updater;
}

function getFilterString(filters: ColumnFiltersState, id: string): string {
	const entry = filters.find((f) => f.id === id);
	return entry == null ? "" : String(entry.value ?? "");
}

function cultivarCatalogCategoryKey(cultivar: CachedCultivar, speciesById: Map<string, SpeciesEntity>): string {
	if (cultivar.speciesId == null) return CATALOG_FILTER_NO_VALUE;
	const species = speciesById.get(String(cultivar.speciesId));
	if (species == null) return CATALOG_FILTER_NO_VALUE;
	if (species.categoryId == null || String(species.categoryId) === "") return CATALOG_FILTER_NO_VALUE;
	return String(species.categoryId);
}

function cultivarSpeciesColumnKey(cultivar: CachedCultivar): string {
	if (cultivar.speciesId == null) return CATALOG_FILTER_NO_VALUE;
	return String(cultivar.speciesId);
}

function matchesCultivarCatalogFilter(cellValue: string, filterValue: unknown): boolean {
	const f = String(filterValue ?? "");
	if (f === "") return true;
	if (f === CATALOG_FILTER_NO_VALUE) return cellValue === CATALOG_FILTER_NO_VALUE;
	return cellValue === f;
}

function setFilterValue(filters: ColumnFiltersState, id: string, value: string): ColumnFiltersState {
	const without = filters.filter((f) => f.id !== id);
	if (value === "") return without;
	return [...without, { id, value }];
}

function reconcileCultivarColumnFilters(
	previous: ColumnFiltersState,
	incoming: ColumnFiltersState,
	speciesById: Map<string, SpeciesEntity>,
): ColumnFiltersState {
	let next = [...incoming];
	const prevCategory = getFilterString(previous, "category");
	const prevSpecies = getFilterString(previous, "species");
	let category = getFilterString(next, "category");
	let species = getFilterString(next, "species");

	if (species !== "" && species !== CATALOG_FILTER_NO_VALUE) {
		const speciesEntity = speciesById.get(species);
		const speciesCategory = speciesEntity == null ? "" : String(speciesEntity.categoryId ?? "");
		if (speciesCategory !== "") category = speciesCategory;
	}

	if (
		category !== "" &&
		category !== CATALOG_FILTER_NO_VALUE &&
		species !== "" &&
		species !== CATALOG_FILTER_NO_VALUE
	) {
		const speciesEntity = speciesById.get(species);
		const speciesCategory = speciesEntity == null ? "" : String(speciesEntity.categoryId ?? "");
		if (speciesCategory !== category) species = "";
	}

	const categoryChanged = category !== prevCategory;
	if (categoryChanged && prevSpecies !== "" && prevSpecies !== CATALOG_FILTER_NO_VALUE && species === prevSpecies) {
		const speciesEntity = speciesById.get(prevSpecies);
		const speciesCategory = speciesEntity == null ? "" : String(speciesEntity.categoryId ?? "");
		if (speciesCategory !== category) species = "";
	}

	next = setFilterValue(next, "category", category);
	next = setFilterValue(next, "species", species);
	return next;
}

function CultivarsPage() {
	const navigate = useNavigate({ from: Route.fullPath });
	const {
		q: qFromSearch,
		sortBy: sortByFromSearch,
		sortDesc: sortDescFromSearch,
		cf: cfFromSearch,
	} = Route.useSearch();
	const { data, isPending, isError, error } = useQuery({ ...queryKeys.cultivar.all });
	const { data: speciesData } = useQuery({ ...queryKeys.species.all });
	const { data: categoriesData } = useQuery({ ...queryKeys.speciesCategory.all });
	const { data: plantsData } = useQuery({ ...queryKeys.plant.all });

	const items = useMemo(() => data?.items ?? [], [data?.items]);

	const speciesById = useMemo(
		() => new Map((speciesData?.items ?? []).map((s) => [String(s.id), s] as const)),
		[speciesData?.items],
	);
	const categoryLabelById = useMemo(() => {
		const map = new Map<string, string>();
		for (const category of categoriesData?.items ?? []) {
			map.set(
				String(category.id),
				translateCatalogField(category.title, category.systemCatalog) ?? String(category.id),
			);
		}
		return map;
	}, [categoriesData?.items]);
	const linkedPlantsCountByCultivarId = useMemo(() => {
		const map = new Map<string, number>();
		for (const plant of plantsData?.items ?? []) {
			const key = String(plant.cultivarId ?? "");
			map.set(key, (map.get(key) ?? 0) + 1);
		}
		return map;
	}, [plantsData?.items]);

	const categoryFilterOptions = useMemo((): CultivarCategoryFilterOption[] => {
		const seen = new Set<string>();
		const options: CultivarCategoryFilterOption[] = [];
		let anyNoCategory = false;
		for (const cultivar of items) {
			const key = cultivarCatalogCategoryKey(cultivar, speciesById);
			if (key === CATALOG_FILTER_NO_VALUE) {
				anyNoCategory = true;
				continue;
			}
			if (seen.has(key)) continue;
			seen.add(key);
			options.push({
				value: key,
				label: categoryLabelById.get(key) ?? key,
				presentation: categoriesData?.items.find((c) => String(c.id) === key)?.presentation ?? undefined,
			});
		}
		const sorted = options.sort((a, b) => a.label.localeCompare(b.label, undefined, { sensitivity: "base" }));
		if (anyNoCategory) {
			sorted.unshift({
				value: CATALOG_FILTER_NO_VALUE,
				label: m.filtering_catalogNoCategory(),
				presentation: undefined,
			});
		}
		return sorted;
	}, [categoriesData?.items, categoryLabelById, items, speciesById]);

	const speciesFilterOptions = useMemo((): CultivarSpeciesFilterOption[] => {
		const seen = new Set<string>();
		const options: CultivarSpeciesFilterOption[] = [];
		let anyNoSpecies = false;
		for (const cultivar of items) {
			if (cultivar.speciesId == null) {
				anyNoSpecies = true;
				continue;
			}
			const species = speciesById.get(String(cultivar.speciesId));
			if (species == null) continue;
			const speciesId = String(species.id);
			if (seen.has(speciesId)) continue;
			seen.add(speciesId);
			options.push({
				value: speciesId,
				label: translateCatalogField(species.characteristics.name, species.systemCatalog) ?? String(species.id),
				categoryId: String(species.categoryId ?? ""),
				presentation: species.presentation,
			});
		}
		const sorted = options.sort((a, b) => a.label.localeCompare(b.label, undefined, { sensitivity: "base" }));
		if (anyNoSpecies) {
			sorted.unshift({
				value: CATALOG_FILTER_NO_VALUE,
				label: m.filtering_catalogNoSpecies(),
				categoryId: "",
				presentation: undefined,
			});
		}
		return sorted;
	}, [items, speciesById]);

	const {
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
	} = useCollectionPageState({
		initialSortId: "title",
		searchQ: qFromSearch,
		searchSortBy: sortByFromSearch,
		searchSortDesc: sortDescFromSearch,
		initialColumnFilters: () => {
			const parsed = parseUrlColumnFilters(cfFromSearch);
			return parsed.length > 0 ? parsed : [];
		},
		getUrlColumnFilters: (filters) => reconcileCultivarColumnFilters(filters, filters, speciesById),
		navigate,
		urlSearch: {
			q: qFromSearch,
			sortBy: sortByFromSearch,
			sortDesc: sortDescFromSearch,
			cf: cfFromSearch,
		},
		initialSorting: CULTIVARS_LIST_DEFAULT_SORTING,
	});
	const [createOpen, setCreateOpen] = useState(false);
	const [bulkUpdateOpen, setBulkUpdateOpen] = useState(false);
	const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
	const bulkDeleteMany = useCultivarDeleteManyMutation();

	const effectiveColumnFilters = useMemo(
		() => reconcileCultivarColumnFilters(columnFilters, columnFilters, speciesById),
		[columnFilters, speciesById],
	);

	const onColumnFiltersChange = useCallback(
		(updater: Updater<ColumnFiltersState>) => {
			setColumnFilters((prev) => {
				const prevEffective = reconcileCultivarColumnFilters(prev, prev, speciesById);
				const next = applyUpdater(updater, prevEffective);
				return reconcileCultivarColumnFilters(prevEffective, next, speciesById);
			});
		},
		[setColumnFilters, speciesById],
	);

	const columnHelper = useMemo(() => createColumnHelper<CachedCultivar>(), []);
	const columns = useMemo(
		() => [
			columnHelper.display({
				id: "select",
				...tableListColumnSizes.select,
				meta: {
					headerClassName: tableListHeaderClasses.select,
					cellClassName: tableListCellClasses.select,
				},
				header: ({ table }) => (
					<div className={tableListCompactHeaderInnerClass}>
						<Checkbox
							aria-label={m.table_selectAll()}
							checked={table.getIsAllRowsSelected()}
							onCheckedChange={(checked) => table.toggleAllRowsSelected(checked === true)}
						/>
					</div>
				),
				cell: ({ row }) => (
					<div className={tableListCompactHeaderInnerClass}>
						<Checkbox
							aria-label={m.table_selectRow({
								name: row.original.characteristics.name || m.items_untitled(),
							})}
							checked={row.getIsSelected()}
							onCheckedChange={(checked) => row.toggleSelected(checked === true)}
						/>
					</div>
				),
				enableColumnFilter: false,
				enableGlobalFilter: false,
				enableSorting: false,
			}),
			columnHelper.accessor(
				(cultivar) => {
					const species = cultivar.speciesId != null ? speciesById.get(String(cultivar.speciesId)) : null;
					const speciesLabel =
						species == null
							? ""
							: (translateCatalogField(species.characteristics.name, species.systemCatalog) ??
								String(species.id));
					const categoryLabel =
						species == null
							? ""
							: species.categoryId != null
								? (categoryLabelById.get(String(species.categoryId)) ?? "")
								: "";
					return `${cultivar.characteristics.name} ${cultivar.characteristics.description ?? ``} ${speciesLabel} ${categoryLabel}`;
				},
				{
					id: "globalSearch",
					enableColumnFilter: false,
					enableSorting: false,
					enableGlobalFilter: true,
					header: () => null,
					cell: () => null,
				},
			),
			columnHelper.accessor((cultivar) => cultivar.characteristics.name, {
				id: "title",
				...tableListColumnSizes.primaryLink,
				header: ({ column }) => <DataTableColumnHeader column={column} title={m.fields_title()} />,
				filterFn: "includesString",
				enableGlobalFilter: false,
				meta: { displayRequired: true },
				cell: ({ row }) => (
					<Link
						to="/catalog/cultivar/$cultivarId"
						params={{ cultivarId: String(row.original.id) }}
						className="flex min-w-0 items-center gap-2 rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
					>
						<ItemPresentationIcon presentation={row.original.presentation} />
						<span className="truncate font-medium">{row.original.characteristics.name}</span>
					</Link>
				),
			}),
			columnHelper.accessor((cultivar) => cultivarCatalogCategoryKey(cultivar, speciesById), {
				id: "category",
				header: ({ column }) => (
					<DataTableColumnHeader column={column} title={m.collections_speciesCategory_title()} />
				),
				filterFn: (row, _columnId, filterValue) =>
					matchesCultivarCatalogFilter(cultivarCatalogCategoryKey(row.original, speciesById), filterValue),
				enableGlobalFilter: false,
				cell: ({ row }) => {
					const key = cultivarCatalogCategoryKey(row.original, speciesById);
					const label =
						key === CATALOG_FILTER_NO_VALUE
							? m.filtering_catalogNoCategory()
							: (categoryLabelById.get(key) ?? "—");
					return <span className="text-muted-foreground text-xs">{label}</span>;
				},
				meta: {
					filter: ({ column }: { column: Column<CachedCultivar, unknown> }) => {
						const value = String(column.getFilterValue() ?? "");
						const selected = categoryFilterOptions.find((opt) => opt.value === value) ?? null;
						return (
							<Combobox
								items={categoryFilterOptions}
								value={selected}
								onValueChange={(item) => column.setFilterValue(item?.value ?? "")}
								itemToStringLabel={(o) => o.label}
								itemToStringValue={(o) => o.value}
								isItemEqualToValue={(a, b) => a.value === b.value}
							>
								<ComboboxInput
									className="w-full min-w-0"
									placeholder={`${m.common_all()} ${m.collections_speciesCategory_titlePlural().toLowerCase()}`}
									aria-label={m.filtering_filterBy({
										label: m.collections_speciesCategory_title().toLowerCase(),
									})}
									showClear
									startAdornment={
										selected?.presentation ? (
											<ItemPresentationIcon presentation={selected.presentation} />
										) : null
									}
								/>
								<ComboboxContent className="z-100">
									<ComboboxEmpty>{m.filtering_comboboxEmpty()}</ComboboxEmpty>
									<ComboboxList>
										{(item) => (
											<ComboboxItem key={item.value} value={item}>
												{item.presentation ? (
													<ItemPresentationIcon presentation={item.presentation} />
												) : null}
												<span className="min-w-0 flex-1 truncate">{item.label}</span>
											</ComboboxItem>
										)}
									</ComboboxList>
								</ComboboxContent>
							</Combobox>
						);
					},
				},
			}),
			columnHelper.accessor((cultivar) => cultivarSpeciesColumnKey(cultivar), {
				id: "species",
				header: ({ column }) => <DataTableColumnHeader column={column} title={m.collections_species_title()} />,
				filterFn: (row, _columnId, filterValue) =>
					matchesCultivarCatalogFilter(cultivarSpeciesColumnKey(row.original), filterValue),
				enableGlobalFilter: false,
				cell: ({ row }) => {
					const species =
						row.original.speciesId != null ? speciesById.get(String(row.original.speciesId)) : null;
					if (species == null) {
						return <span className="text-muted-foreground text-xs">{m.filtering_catalogNoSpecies()}</span>;
					}
					return (
						<span className="text-muted-foreground text-xs">
							{translateCatalogField(species.characteristics.name, species.systemCatalog) ??
								String(species.id)}
						</span>
					);
				},
				meta: {
					filter: ({
						column,
						table,
					}: {
						column: Column<CachedCultivar, unknown>;
						table: { getColumn: (id: string) => { getFilterValue: () => unknown } | undefined };
					}) => {
						const categoryFilter = String(table.getColumn("category")?.getFilterValue() ?? "");
						const visibleSpeciesOptions =
							categoryFilter === CATALOG_FILTER_NO_VALUE
								? speciesFilterOptions.filter(
										(opt) => opt.value === CATALOG_FILTER_NO_VALUE || opt.categoryId === "",
									)
								: categoryFilter
									? speciesFilterOptions.filter((opt) => opt.categoryId === categoryFilter)
									: speciesFilterOptions;
						const value = String(column.getFilterValue() ?? "");
						const selected = visibleSpeciesOptions.find((opt) => opt.value === value) ?? null;
						return (
							<Combobox
								items={visibleSpeciesOptions}
								value={selected}
								onValueChange={(item) => column.setFilterValue(item?.value ?? "")}
								itemToStringLabel={(o) => o.label}
								itemToStringValue={(o) => o.value}
								isItemEqualToValue={(a, b) => a.value === b.value}
							>
								<ComboboxInput
									className="w-full min-w-0"
									placeholder={`${m.common_all()} ${m.collections_species_titlePlural().toLowerCase()}`}
									aria-label={m.filtering_filterBy({
										label: m.collections_species_title().toLowerCase(),
									})}
									showClear
									startAdornment={
										selected?.presentation ? (
											<ItemPresentationIcon presentation={selected.presentation} />
										) : null
									}
								/>
								<ComboboxContent className="z-100">
									<ComboboxEmpty>{m.filtering_comboboxEmpty()}</ComboboxEmpty>
									<ComboboxList>
										{(item) => (
											<ComboboxItem key={item.value} value={item}>
												{item.presentation ? (
													<ItemPresentationIcon presentation={item.presentation} />
												) : null}
												<span className="min-w-0 flex-1 truncate">{item.label}</span>
											</ComboboxItem>
										)}
									</ComboboxList>
								</ComboboxContent>
							</Combobox>
						);
					},
				},
			}),
			columnHelper.accessor((cultivar) => cultivar.updatedAt.getTime(), {
				id: "updatedAt",
				header: ({ column }) => <DataTableColumnHeader column={column} title={m.fields_updatedAt()} />,
				sortingFn: "datetime",
				enableColumnFilter: false,
				enableGlobalFilter: false,
				cell: ({ row }) => (
					<span className="text-muted-foreground text-xs">
						{row.original.updatedAt.toLocaleString(undefined, {
							dateStyle: "short",
							timeStyle: "short",
						})}
					</span>
				),
			}),
			columnHelper.display({
				id: "actions",
				...tableListColumnSizes.rowActions,
				header: () => (
					<div className={tableListCompactHeaderInnerClassMuted}>
						<span className="text-center leading-tight">{m.common_actions()}</span>
					</div>
				),
				enableColumnFilter: false,
				enableGlobalFilter: false,
				enableSorting: false,
				meta: {
					headerClassName: tableListHeaderClasses.actions,
					cellClassName: tableListCellClasses.actions,
				},
				cell: ({ row }) => (
					<CultivarRowActions
						cultivar={row.original}
						linkedPlantsCount={linkedPlantsCountByCultivarId.get(String(row.original.id)) ?? 0}
					/>
				),
			}),
		],
		[
			categoryFilterOptions,
			categoryLabelById,
			columnHelper,
			linkedPlantsCountByCultivarId,
			speciesById,
			speciesFilterOptions,
		],
	);

	const table = useMemo(
		() =>
			createTable<CachedCultivar>({
				data: items,
				columns,
				globalFilterFn: fuzzyFilter,
				getCoreRowModel: getCoreRowModel(),
				getFilteredRowModel: getFilteredRowModel(),
				getSortedRowModel: getSortedRowModel(),
				getRowId: (row) => String(row.id),
				onStateChange: () => undefined,
				onSortingChange: setSorting,
				onColumnFiltersChange,
				onGlobalFilterChange: setGlobalFilter,
				onRowSelectionChange: setRowSelection,
				onColumnVisibilityChange: setColumnVisibility,
				renderFallbackValue: null,
				state: {
					sorting,
					globalFilter,
					columnFilters: effectiveColumnFilters,
					rowSelection,
					columnVisibility,
					columnPinning: { left: [], right: [] },
				},
			}),
		[
			columnVisibility,
			columns,
			effectiveColumnFilters,
			globalFilter,
			items,
			onColumnFiltersChange,
			rowSelection,
			setColumnVisibility,
			setGlobalFilter,
			setRowSelection,
			setSorting,
			sorting,
		],
	);

	const filteredRowCount = table.getFilteredRowModel().rows.length;
	const selectedCultivarIds = useMemo(
		() => table.getFilteredSelectedRowModel().rows.map((row) => row.original.id),
		[table],
	);
	const selectedCultivars = useMemo(
		() => table.getFilteredSelectedRowModel().rows.map((row) => row.original),
		[table],
	);
	const bulkDeleteDisabled = selectedCultivarIds.length === 0;
	const bulkUpdateDisabled = selectedCultivarIds.length === 0;
	const bulkDeleteTooltip = tableSelectionBulkTooltip({
		selectedCount: selectedCultivarIds.length,
		hasPlacedInSelection: false,
		enabledTooltip: m.collections_cultivar_deleteManyTooltip(),
	});
	const emptyMessage =
		items.length === 0
			? m.items_noElements()
			: filteredRowCount === 0
				? m.filtering_noFilteredElements()
				: m.items_noElements();
	return (
		<div id="cultivars-page" className="flex min-h-0 flex-1 flex-col overflow-hidden">
			<DashboardPageHeading
				collection="cultivar"
				viewModeToggle={{ value: viewMode, onValueChange: setViewMode }}
			>
				<h1 className="font-heading font-medium text-lg" id="page-title">
					{m.collections_cultivar_titlePlural()}
				</h1>
				<ButtonTooltip label={m.collections_cultivar_create()}>
					<Button type="button" size="icon" variant="outline" onClick={() => setCreateOpen(true)}>
						<span className="sr-only">{m.collections_cultivar_create()}</span>
						<PlusIcon />
					</Button>
				</ButtonTooltip>
			</DashboardPageHeading>
			<DashboardPageContent className="flex min-h-0 min-w-0 flex-1 flex-col gap-3 overflow-hidden">
				<div className="flex min-h-0 min-w-0 flex-1 flex-col px-1 pt-1 pb-2">
					<CollectionItemsView
						viewMode={viewMode}
						table={table}
						isPending={isPending}
						isError={isError}
						errorMessage={renderError(error, m.common_loadError())}
						emptyMessage={emptyMessage}
						globalSearch={buildCollectionGlobalSearch({
							globalFilter,
							setGlobalFilter,
							setColumnFilters,
							setRowSelection,
						})}
						highlightPendingRows
						listDefaultSorting={CULTIVARS_LIST_DEFAULT_SORTING}
						selectedActions={
							<div className="flex items-center gap-2">
								<Button
									type="button"
									variant="outline"
									disabled={bulkUpdateDisabled}
									onClick={() => setBulkUpdateOpen(true)}
								>
									{m.common_updateSelected()}
								</Button>
								<ButtonTooltip label={bulkDeleteTooltip} disabled={bulkDeleteDisabled}>
									<Button
										type="button"
										variant="outline"
										disabled={bulkDeleteDisabled}
										onClick={() => setBulkDeleteOpen(true)}
									>
										{m.collections_cultivar_deleteMany()}
									</Button>
								</ButtonTooltip>
							</div>
						}
						renderListItem={(row) => {
							const c = row.original;
							const sp = c.speciesId != null ? speciesById.get(String(c.speciesId)) : undefined;
							const speciesLabel =
								sp != null
									? (translateCatalogField(sp.characteristics.name, sp.systemCatalog) ?? "")
									: m.filtering_catalogNoSpecies();
							return (
								<CultivarListCard
									cultivar={c}
									speciesLabel={speciesLabel}
									linkedPlantsCount={linkedPlantsCountByCultivarId.get(String(c.id)) ?? 0}
									selected={row.getIsSelected()}
									onSelectedChange={(checked) => row.toggleSelected(checked)}
								/>
							);
						}}
					/>
				</div>
			</DashboardPageContent>
			<CultivarCreateDialog open={createOpen} onOpenChange={setCreateOpen} />
			<CultivarUpdateManyDialog
				open={bulkUpdateOpen}
				onOpenChange={setBulkUpdateOpen}
				items={selectedCultivars}
			/>
			<DeleteConfirmDialog
				open={bulkDeleteOpen}
				onOpenChange={setBulkDeleteOpen}
				title={m.collections_cultivar_deleteMany()}
				description={m.collections_cultivar_deleteManyConfirmDescription({
					count: selectedCultivarIds.length,
				})}
				isPending={bulkDeleteMany.isPending}
				onConfirm={async () => {
					setBulkDeleteOpen(false);
					setRowSelection({});
					await bulkDeleteMany.mutateAsync({ ids: selectedCultivarIds });
				}}
			/>
		</div>
	);
}

function CultivarRowActions({ cultivar, linkedPlantsCount }: { cultivar: CachedCultivar; linkedPlantsCount: number }) {
	const [editOpen, setEditOpen] = useState(false);
	const [deleteOpen, setDeleteOpen] = useState(false);
	const del = useCultivarDeleteMutation();
	const linkedTitle = m.common_related();
	const syncPending = isQueryObjectPending(cultivar);

	return (
		<div className="flex w-full items-center justify-center">
			<DropdownMenu>
				<DropdownMenuTrigger asChild>
					<Button type="button" variant="outline" size="icon" aria-label={m.common_actions()}>
						<EllipsisVerticalIcon />
					</Button>
				</DropdownMenuTrigger>
				<DropdownMenuContent className="flex flex-col gap-1" align="end">
					<DropdownMenuItem
						disabled={syncPending}
						title={syncPending ? m.common_editDisabledPendingSync() : m.common_edit()}
						onSelect={() => setEditOpen(true)}
					>
						<PencilIcon />
						{m.common_edit()}
					</DropdownMenuItem>
					<DropdownMenuItem
						disabled={syncPending}
						title={syncPending ? m.common_editDisabledPendingSync() : m.common_delete()}
						onSelect={() => setDeleteOpen(true)}
					>
						<Trash2Icon />
						{m.common_delete()}
					</DropdownMenuItem>
					<DropdownMenuSub>
						<DropdownMenuSubTrigger title={linkedTitle} aria-label={linkedTitle}>
							<ExternalLinkIcon />
							{linkedTitle}
						</DropdownMenuSubTrigger>
						<DropdownMenuSubContent className="flex flex-col gap-1">
							<DropdownMenuItem asChild>
								<Button asChild variant="outline" size="xs" title={linkedTitle}>
									<Link
										to="/plants"
										search={{
											cf: serializeUrlColumnFilters([
												{ id: "cultivar", value: String(cultivar.id) },
											]),
										}}
										aria-label={linkedTitle}
									>
										<ExternalLinkIcon />
										{m.collections_plant_titlePlural()}
									</Link>
								</Button>
							</DropdownMenuItem>
						</DropdownMenuSubContent>
					</DropdownMenuSub>
				</DropdownMenuContent>
			</DropdownMenu>
			<CultivarUpdateDialog cultivar={cultivar} open={editOpen} onOpenChange={setEditOpen} />
			<DeleteConfirmDialog
				open={deleteOpen}
				onOpenChange={setDeleteOpen}
				title={m.collections_cultivar_delete()}
				description={cultivar.characteristics.name}
				warningDescription={
					linkedPlantsCount > 0
						? linkedPlantsCount === 1
							? m.collections_cultivar_deleteLinkedSingle()
							: m.collections_cultivar_deleteLinkedMany({ count: String(linkedPlantsCount) })
						: undefined
				}
				isPending={del.isPending}
				onConfirm={async () => {
					setDeleteOpen(false);
					await del.mutateAsync({ id: cultivar.id });
				}}
			/>
		</div>
	);
}
