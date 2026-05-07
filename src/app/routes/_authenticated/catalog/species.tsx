import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
	type Column,
	createColumnHelper,
	createTable,
	getCoreRowModel,
	getFilteredRowModel,
	getSortedRowModel,
	type SortingState,
} from "@tanstack/react-table";
import {
	CheckIcon,
	EllipsisVerticalIcon,
	ExternalLinkIcon,
	PencilIcon,
	PencilOffIcon,
	PlusIcon,
	Trash2Icon,
	XIcon,
} from "lucide-react";
import { useMemo, useState } from "react";
import { DashboardPageContent } from "#/app/components/layout/dashboard-page-content";
import { DashboardPageHeading } from "#/app/components/layout/dashboard-page-heading";
import type { SpeciesWithSystemCatalog } from "#/backend/core/application/use-cases/gardening/species.use-cases";
import { DeleteConfirmDialog } from "@/components/gardening/shared/delete-confirm-dialog";
import { SpeciesCreateDialog } from "@/components/gardening/species/species-create-dialog";
import { SpeciesListCard } from "@/components/gardening/species/species-list-card";
import { SpeciesUpdateDialog } from "@/components/gardening/species/species-update-dialog";
import { SpeciesUpdateManyDialog } from "@/components/gardening/species/species-update-many-dialog";
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
import { createTriStateColumnFilterFn, TableTriStateFilter } from "@/components/table/table-tri-state-filter";
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
import { renderError } from "@/lib/render-error";
import { tableSelectionBulkTooltip } from "@/lib/table-selection-tooltips";
import { parseUrlColumnFilters, serializeUrlColumnFilters } from "@/lib/table-url-filters";
import { translateCatalogField } from "@/lib/translate-catalog-field";
import * as m from "@/paraglide/messages.js";
import { queryKeys } from "@/store/keys";
import { useSpeciesDeleteManyMutation, useSpeciesDeleteMutation } from "@/store/mutations";

export const Route = createFileRoute("/_authenticated/catalog/species")({
	validateSearch: (search: Record<string, unknown>) => {
		const next: { q?: string; sortBy?: string; sortDesc?: boolean; cf?: string } = {};
		if (typeof search.q === "string") next.q = search.q;
		if (typeof search.sortBy === "string") next.sortBy = search.sortBy;
		if (typeof search.sortDesc === "boolean") next.sortDesc = search.sortDesc;
		if (typeof search.cf === "string") next.cf = search.cf;
		return next;
	},
	component: SpeciesPage,
});

const SPECIES_LIST_DEFAULT_SORTING: SortingState = [{ id: "name", desc: false }];

function SpeciesPage() {
	const navigate = useNavigate({ from: Route.fullPath });
	const {
		q: qFromSearch,
		sortBy: sortByFromSearch,
		sortDesc: sortDescFromSearch,
		cf: cfFromSearch,
	} = Route.useSearch();
	const {
		data: speciesData,
		isPending: spPending,
		isError: spError,
		error: spErrorValue,
	} = useQuery({
		...queryKeys.species.all,
	});
	const { data: catData } = useQuery({ ...queryKeys.speciesCategory.all });
	const { data: cultivarsData } = useQuery({ ...queryKeys.cultivar.all });

	const categoryTitle = useMemo(() => {
		const map = new Map<string, string>();
		for (const c of catData?.items ?? []) {
			map.set(String(c.id), translateCatalogField(c.title, c.systemCatalog) ?? String(c.id));
		}
		return map;
	}, [catData?.items]);

	const items = useMemo(() => speciesData?.items ?? [], [speciesData?.items]);
	const cultivarCountBySpeciesId = useMemo(() => {
		const map = new Map<string, number>();
		for (const cultivar of cultivarsData?.items ?? []) {
			const key = String(cultivar.speciesId ?? "");
			map.set(key, (map.get(key) ?? 0) + 1);
		}
		return map;
	}, [cultivarsData?.items]);

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
		initialSortId: "name",
		searchQ: qFromSearch,
		searchSortBy: sortByFromSearch,
		searchSortDesc: sortDescFromSearch,
		initialColumnFilters: () => parseUrlColumnFilters(cfFromSearch),
		navigate,
		urlSearch: {
			q: qFromSearch,
			sortBy: sortByFromSearch,
			sortDesc: sortDescFromSearch,
			cf: cfFromSearch,
		},
		initialSorting: SPECIES_LIST_DEFAULT_SORTING,
	});
	const [createOpen, setCreateOpen] = useState(false);
	const [bulkUpdateOpen, setBulkUpdateOpen] = useState(false);
	const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
	const bulkDeleteMany = useSpeciesDeleteManyMutation();

	const categoryComboboxOptions = useMemo(() => {
		const cats = catData?.items ?? [];
		return cats.map((c) => ({
			value: String(c.id),
			label: translateCatalogField(c.title, c.systemCatalog) ?? String(c.id),
			presentation: c.presentation,
		}));
	}, [catData?.items]);

	const columnHelper = useMemo(() => createColumnHelper<SpeciesWithSystemCatalog>(), []);
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
				cell: ({ row }) => {
					const name =
						translateCatalogField(row.original.characteristics.name, row.original.systemCatalog) ??
						String(row.original.id);
					return (
						<div className={tableListCompactHeaderInnerClass}>
							<Checkbox
								aria-label={m.table_selectRow({ name })}
								checked={row.getIsSelected()}
								onCheckedChange={(checked) => row.toggleSelected(checked === true)}
							/>
						</div>
					);
				},
				enableColumnFilter: false,
				enableGlobalFilter: false,
				enableSorting: false,
			}),
			columnHelper.accessor(
				(s) => {
					const name = translateCatalogField(s.characteristics.name, s.systemCatalog) ?? "";
					const desc = translateCatalogField(s.characteristics.description, s.systemCatalog) ?? "";
					const cat = categoryTitle.get(String(s.categoryId)) ?? "";
					return `${name} ${desc} ${cat}`;
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
			columnHelper.accessor((s) => translateCatalogField(s.characteristics.name, s.systemCatalog) ?? "", {
				id: "name",
				...tableListColumnSizes.primaryLink,
				header: ({ column }) => <DataTableColumnHeader column={column} title={m.fields_name()} />,
				filterFn: "includesString",
				enableGlobalFilter: false,
				meta: { displayRequired: true },
				cell: ({ row }) => {
					const species = row.original;
					const name = translateCatalogField(species.characteristics.name, species.systemCatalog);
					return (
						<Link
							to="/catalog/species-detail/$speciesId"
							params={{ speciesId: String(species.id) }}
							search={{ category: String(species.categoryId) }}
							className="flex min-w-0 items-center gap-2 rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
						>
							<ItemPresentationIcon presentation={species.presentation} />
							<p className="truncate font-medium">{name}</p>
						</Link>
					);
				},
			}),

			columnHelper.accessor((s) => String(s.categoryId), {
				id: "category",
				header: ({ column }) => (
					<DataTableColumnHeader column={column} title={m.collections_speciesCategory_title()} />
				),
				sortingFn: (rowA, rowB) => {
					const a = categoryTitle.get(String(rowA.original.categoryId)) ?? "";
					const b = categoryTitle.get(String(rowB.original.categoryId)) ?? "";
					return a.localeCompare(b, undefined, { sensitivity: "base" });
				},
				filterFn: (row, _columnId, filterValue) => {
					if (filterValue == null || filterValue === "") return true;
					return String(row.original.categoryId) === String(filterValue);
				},
				enableGlobalFilter: false,
				meta: {
					filter: ({ column }: { column: Column<SpeciesWithSystemCatalog, unknown> }) => {
						const value = String(column.getFilterValue() ?? "");
						const selected = categoryComboboxOptions.find((opt) => opt.value === value) ?? null;
						return (
							<Combobox
								items={categoryComboboxOptions}
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
												<ItemPresentationIcon presentation={item.presentation} />
												<span className="min-w-0 flex-1 truncate">{item.label}</span>
											</ComboboxItem>
										)}
									</ComboboxList>
								</ComboboxContent>
							</Combobox>
						);
					},
				},
				cell: ({ row }) => (
					<span className="text-muted-foreground text-xs">
						{categoryTitle.get(String(row.original.categoryId)) ??
							`${m.common_unknown()} ${m.collections_speciesCategory_title().toLowerCase()}`}
					</span>
				),
			}),
			columnHelper.accessor((s) => translateCatalogField(s.characteristics.description, s.systemCatalog) ?? "", {
				id: "description",
				header: ({ column }) => <DataTableColumnHeader column={column} title={m.fields_description()} />,
				filterFn: "includesString",
				enableGlobalFilter: false,
				cell: ({ row }) => {
					const description = translateCatalogField(
						row.original.characteristics.description,
						row.original.systemCatalog,
					);
					return (
						<span className="line-clamp-2 max-w-md whitespace-normal text-muted-foreground text-xs">
							{description || "-"}
						</span>
					);
				},
			}),

			columnHelper.accessor((s) => (s.systemCatalog ? "default" : "custom"), {
				id: "isCustom",
				...tableListColumnSizes.iconFlag,
				header: () => <div className={tableListCompactHeaderInnerClass}>{m.fields_isCustom()}</div>,
				enableSorting: false,
				filterFn: createTriStateColumnFilterFn({
					filterTrue: "custom",
					filterFalse: "default",
					cellTrue: "custom",
					cellFalse: "default",
				}),
				enableGlobalFilter: false,
				meta: {
					headerClassName: tableListHeaderClasses.iconFlag,
					cellClassName: tableListCellClasses.iconFlag,
					filter: ({
						column,
					}: {
						column: { getFilterValue: () => unknown; setFilterValue: (v: string) => void };
					}) => (
						<div className="flex w-full items-center justify-center">
							<TableTriStateFilter
								column={column}
								filterTrue="custom"
								filterFalse="default"
								labels={{
									all: m.filtering_customFilterAll(),
									true: m.filtering_customFilterCustom(),
									false: m.filtering_customFilterDefault(),
								}}
							/>
						</div>
					),
				},
				cell: ({ row }) => {
					const isCustom = !row.original.systemCatalog;
					return (
						<div className="flex w-full items-center justify-center">
							{isCustom ? (
								<CheckIcon aria-label={m.fields_isCustom()} className="size-3.5 text-emerald-500" />
							) : (
								<XIcon aria-label={m.common_default()} className="size-3.5 text-muted-foreground" />
							)}
						</div>
					);
				},
			}),
			columnHelper.accessor((s) => s.createdAt.getTime(), {
				id: "createdAt",
				header: ({ column }) => <DataTableColumnHeader column={column} title={m.fields_updatedAt()} />,
				sortingFn: "datetime",
				enableColumnFilter: false,
				enableGlobalFilter: false,
				cell: ({ row }) => (
					<span className="text-muted-foreground text-xs">
						{row.original.createdAt.toLocaleString(undefined, {
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
					<SpeciesRowActions
						species={row.original}
						categoryId={String(row.original.categoryId)}
						linkedCultivarsCount={cultivarCountBySpeciesId.get(String(row.original.id)) ?? 0}
					/>
				),
			}),
		],
		[categoryComboboxOptions, categoryTitle, columnHelper, cultivarCountBySpeciesId],
	);

	const table = useMemo(
		() =>
			createTable<SpeciesWithSystemCatalog>({
				data: items,
				columns,
				globalFilterFn: fuzzyFilter,
				getCoreRowModel: getCoreRowModel(),
				getFilteredRowModel: getFilteredRowModel(),
				getSortedRowModel: getSortedRowModel(),
				getRowId: (row) => String(row.id),
				onStateChange: () => undefined,
				onSortingChange: setSorting,
				onColumnFiltersChange: setColumnFilters,
				onGlobalFilterChange: setGlobalFilter,
				onRowSelectionChange: setRowSelection,
				onColumnVisibilityChange: setColumnVisibility,
				renderFallbackValue: null,
				state: {
					sorting,
					globalFilter,
					columnFilters,
					rowSelection,
					columnVisibility,
					columnPinning: { left: [], right: [] },
				},
			}),
		[
			columnFilters,
			columnVisibility,
			columns,
			globalFilter,
			items,
			rowSelection,
			setColumnFilters,
			setColumnVisibility,
			setGlobalFilter,
			setRowSelection,
			setSorting,
			sorting,
		],
	);

	const filteredRowCount = table.getFilteredRowModel().rows.length;
	const selectedSpeciesIds = useMemo(
		() => table.getFilteredSelectedRowModel().rows.map((row) => row.original.id),
		[table],
	);
	const selectedSpecies = useMemo(() => table.getFilteredSelectedRowModel().rows.map((row) => row.original), [table]);
	const selectionIncludesSystemCatalog = useMemo(
		() => table.getFilteredSelectedRowModel().rows.some((row) => row.original.systemCatalog),
		[table],
	);
	const bulkDeleteDisabled = selectedSpeciesIds.length === 0 || selectionIncludesSystemCatalog;
	const bulkUpdateDisabled = selectedSpeciesIds.length === 0 || selectionIncludesSystemCatalog;
	const bulkDeleteTooltip = tableSelectionBulkTooltip({
		selectedCount: selectedSpeciesIds.length,
		hasPlacedInSelection: false,
		selectionIncludesDefaultCatalog: selectionIncludesSystemCatalog,
		enabledTooltip: m.collections_species_deleteManyTooltip(),
	});
	const bulkUpdateTooltip = tableSelectionBulkTooltip({
		selectedCount: selectedSpeciesIds.length,
		hasPlacedInSelection: false,
		selectionIncludesDefaultCatalog: selectionIncludesSystemCatalog,
		defaultCatalogAction: "update",
		enabledTooltip: m.common_updateSelected(),
	});
	const emptyMessage =
		items.length === 0
			? m.items_noElements()
			: filteredRowCount === 0
				? m.filtering_noFilteredElements()
				: m.items_noElements();
	return (
		<div id="species-page" className="flex min-h-0 flex-1 flex-col overflow-hidden">
			<DashboardPageHeading collection="species" viewModeToggle={{ value: viewMode, onValueChange: setViewMode }}>
				<h1 className="font-heading font-medium text-lg" id="page-title">
					{m.collections_species_titlePlural()}
				</h1>
				<ButtonTooltip label={m.collections_species_create()}>
					<Button type="button" size="icon" variant="outline" onClick={() => setCreateOpen(true)}>
						<span className="sr-only">{m.collections_species_create()}</span>
						<PlusIcon />
					</Button>
				</ButtonTooltip>
			</DashboardPageHeading>
			<DashboardPageContent className="flex min-h-0 min-w-0 flex-1 flex-col gap-3 overflow-hidden">
				<div className="flex min-h-0 min-w-0 flex-1 flex-col px-1 pt-1 pb-2">
					<CollectionItemsView
						viewMode={viewMode}
						table={table}
						isPending={spPending}
						isError={spError}
						errorMessage={renderError(spErrorValue, m.common_loadError())}
						emptyMessage={emptyMessage}
						globalSearch={buildCollectionGlobalSearch({
							globalFilter,
							setGlobalFilter,
							setColumnFilters,
							setRowSelection,
						})}
						highlightPendingRows
						listDefaultSorting={SPECIES_LIST_DEFAULT_SORTING}
						selectedActions={
							<div className="flex items-center gap-2">
								<ButtonTooltip label={bulkUpdateTooltip} disabled={bulkUpdateDisabled}>
									<Button
										type="button"
										variant="outline"
										disabled={bulkUpdateDisabled}
										onClick={() => setBulkUpdateOpen(true)}
									>
										{m.common_updateSelected()}
									</Button>
								</ButtonTooltip>
								<ButtonTooltip label={bulkDeleteTooltip} disabled={bulkDeleteDisabled}>
									<Button
										type="button"
										variant="outline"
										disabled={bulkDeleteDisabled}
										onClick={() => setBulkDeleteOpen(true)}
									>
										{m.collections_species_deleteMany()}
									</Button>
								</ButtonTooltip>
							</div>
						}
						renderListItem={(row) => (
							<SpeciesListCard
								species={row.original}
								categoryId={String(row.original.categoryId)}
								categoryLabel={categoryTitle.get(String(row.original.categoryId)) ?? ""}
								selected={row.getIsSelected()}
								onSelectedChange={(checked) => row.toggleSelected(checked)}
							/>
						)}
					/>
				</div>
			</DashboardPageContent>
			<SpeciesCreateDialog open={createOpen} onOpenChange={setCreateOpen} />
			<SpeciesUpdateManyDialog open={bulkUpdateOpen} onOpenChange={setBulkUpdateOpen} items={selectedSpecies} />
			<DeleteConfirmDialog
				open={bulkDeleteOpen}
				onOpenChange={setBulkDeleteOpen}
				title={m.collections_species_deleteMany()}
				description={m.collections_species_deleteManyConfirmDescription({
					count: selectedSpeciesIds.length,
				})}
				isPending={bulkDeleteMany.isPending}
				onConfirm={async () => {
					setBulkDeleteOpen(false);
					setRowSelection({});
					await bulkDeleteMany.mutateAsync({ ids: selectedSpeciesIds });
				}}
			/>
		</div>
	);
}

function SpeciesRowActions({
	species,
	categoryId,
	linkedCultivarsCount,
}: {
	species: SpeciesWithSystemCatalog;
	categoryId: string;
	linkedCultivarsCount: number;
}) {
	const [editOpen, setEditOpen] = useState(false);
	const [deleteOpen, setDeleteOpen] = useState(false);
	const del = useSpeciesDeleteMutation();
	const name = translateCatalogField(species.characteristics.name, species.systemCatalog);

	const editTitle = species.systemCatalog ? m.common_editDisabledDefaultCatalog() : m.common_edit();
	const deleteTitle = species.systemCatalog ? m.common_editDisabledDefaultCatalog() : m.common_delete();
	const linkedTitle = m.common_related();

	return (
		<div className="flex w-full items-center justify-center">
			<DropdownMenu>
				<DropdownMenuTrigger asChild>
					<Button type="button" variant="outline" size="icon" aria-label={m.common_actions()}>
						<EllipsisVerticalIcon />
					</Button>
				</DropdownMenuTrigger>
				<DropdownMenuContent className="flex flex-col gap-1" align="end">
					{species.systemCatalog ? (
						<ButtonTooltip label={editTitle} disabled>
							<DropdownMenuItem disabled title={editTitle}>
								<PencilOffIcon />
								{m.common_edit()}
							</DropdownMenuItem>
						</ButtonTooltip>
					) : (
						<DropdownMenuItem onSelect={() => setEditOpen(true)} title={editTitle}>
							<PencilIcon />
							{m.common_edit()}
						</DropdownMenuItem>
					)}

					{species.systemCatalog ? (
						<ButtonTooltip label={deleteTitle} disabled>
							<DropdownMenuItem disabled title={deleteTitle}>
								<Trash2Icon />
								{m.common_delete()}
							</DropdownMenuItem>
						</ButtonTooltip>
					) : (
						<DropdownMenuItem onSelect={() => setDeleteOpen(true)} title={deleteTitle}>
							<Trash2Icon />
							{m.common_delete()}
						</DropdownMenuItem>
					)}

					<DropdownMenuSub>
						<DropdownMenuSubTrigger title={linkedTitle} aria-label={linkedTitle}>
							<ExternalLinkIcon />
							{linkedTitle}
						</DropdownMenuSubTrigger>
						<DropdownMenuSubContent className="flex flex-col gap-1">
							<DropdownMenuItem asChild>
								<Button asChild variant="outline" size="xs" title={linkedTitle}>
									<Link
										to="/catalog/cultivars"
										search={{
											cf: serializeUrlColumnFilters([
												{ id: "category", value: String(categoryId) },
												{ id: "species", value: String(species.id) },
											]),
										}}
										aria-label={linkedTitle}
									>
										<ExternalLinkIcon />
										{m.collections_cultivar_titlePlural()}
									</Link>
								</Button>
							</DropdownMenuItem>
							<DropdownMenuItem asChild>
								<Button asChild variant="outline" size="xs" title={linkedTitle}>
									<Link
										to="/plants"
										search={{
											cf: serializeUrlColumnFilters([
												{ id: "category", value: String(categoryId) },
												{ id: "species", value: String(species.id) },
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
			{!species.systemCatalog ? (
				<SpeciesUpdateDialog species={species} open={editOpen} onOpenChange={setEditOpen} />
			) : null}
			<DeleteConfirmDialog
				open={deleteOpen}
				onOpenChange={setDeleteOpen}
				title={m.collections_species_delete()}
				description={name ?? ""}
				warningDescription={
					linkedCultivarsCount > 0
						? linkedCultivarsCount === 1
							? m.collections_species_deleteLinkedSingle()
							: m.collections_species_deleteLinkedMany({ count: String(linkedCultivarsCount) })
						: undefined
				}
				isPending={del.isPending}
				onConfirm={async () => {
					setDeleteOpen(false);
					await del.mutateAsync({ id: species.id });
				}}
			/>
		</div>
	);
}
