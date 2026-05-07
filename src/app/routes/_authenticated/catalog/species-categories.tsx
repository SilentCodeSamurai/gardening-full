import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
	type ColumnFiltersState,
	type VisibilityState,
	createColumnHelper,
	createTable,
	getCoreRowModel,
	getFilteredRowModel,
	getSortedRowModel,
	type RowSelectionState,
	type SortingState,
} from "@tanstack/react-table";
import {
	CheckIcon,
	EllipsisVerticalIcon,
	ExternalLinkIcon,
	PencilIcon,
	PlusIcon,
	Trash2Icon,
	XIcon,
} from "lucide-react";
import { useMemo, useState } from "react";
import { DashboardPageContent } from "#/app/components/layout/dashboard-page-content";
import { DashboardPageHeading } from "#/app/components/layout/dashboard-page-heading";
import type { SpeciesCategoryWithSystemCatalog } from "#/backend/core/application/use-cases/gardening/species-category.use-cases";
import { DeleteConfirmDialog } from "@/components/gardening/shared/delete-confirm-dialog";
import { SpeciesCategoryCreateDialog } from "@/components/gardening/species-category/species-category-create-dialog";
import { SpeciesCategoryUpdateManyDialog } from "@/components/gardening/species-category/species-category-update-many-dialog";
import { SpeciesCategoryUpdateDialog } from "@/components/gardening/species-category/species-category-update-dialog";
import { ItemPresentationIcon } from "@/components/icon/item-presentation-icon";
import { DataTable } from "@/components/table/data-table";
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
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSub,
	DropdownMenuSubContent,
	DropdownMenuSubTrigger,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { renderError } from "@/lib/render-error";
import { tableSelectionBulkTooltip } from "@/lib/table-selection-tooltips";
import { parseUrlColumnFilters, serializeUrlColumnFilters } from "@/lib/table-url-filters";
import { useTableUrlSync } from "@/lib/use-table-url-sync";
import { translateCatalogField } from "@/lib/translate-catalog-field";
import * as m from "@/paraglide/messages.js";
import { queryKeys } from "@/store/keys";
import { useSpeciesCategoryDeleteManyMutation, useSpeciesCategoryDeleteMutation } from "@/store/mutations";

export const Route = createFileRoute("/_authenticated/catalog/species-categories")({
	validateSearch: (search: Record<string, unknown>) => {
		const next: { q?: string; sortBy?: string; sortDesc?: boolean; cf?: string } = {};
		if (typeof search.q === "string") next.q = search.q;
		if (typeof search.sortBy === "string") next.sortBy = search.sortBy;
		if (typeof search.sortDesc === "boolean") next.sortDesc = search.sortDesc;
		if (typeof search.cf === "string") next.cf = search.cf;
		return next;
	},
	component: SpeciesCategoriesPage,
});

function SpeciesCategoriesPage() {
	const navigate = useNavigate({ from: Route.fullPath });
	const {
		q: qFromSearch,
		sortBy: sortByFromSearch,
		sortDesc: sortDescFromSearch,
		cf: cfFromSearch,
	} = Route.useSearch();
	const { data, isPending, isError, error } = useQuery({ ...queryKeys.speciesCategory.all });
	const { data: speciesData } = useQuery({ ...queryKeys.species.all });
	const items = useMemo(() => data?.items ?? [], [data?.items]);
	const linkedSpeciesCountByCategoryId = useMemo(() => {
		const map = new Map<string, number>();
		for (const species of speciesData?.items ?? []) {
			const key = String(species.categoryId ?? "");
			map.set(key, (map.get(key) ?? 0) + 1);
		}
		return map;
	}, [speciesData?.items]);

	const [sorting, setSorting] = useState<SortingState>([
		{ id: sortByFromSearch ?? "title", desc: Boolean(sortDescFromSearch) },
	]);
	const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>(() =>
		parseUrlColumnFilters(cfFromSearch),
	);
	const [globalFilter, setGlobalFilter] = useState(qFromSearch ?? "");
	const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
	const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({ globalSearch: false });
	const [createOpen, setCreateOpen] = useState(false);
	const [bulkUpdateOpen, setBulkUpdateOpen] = useState(false);
	const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
	const bulkDeleteMany = useSpeciesCategoryDeleteManyMutation();
	const columnHelper = useMemo(() => createColumnHelper<SpeciesCategoryWithSystemCatalog>(), []);
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
							aria-label="Select all"
							checked={table.getIsAllRowsSelected()}
							onCheckedChange={(checked) => table.toggleAllRowsSelected(checked === true)}
						/>
					</div>
				),
				cell: ({ row }) => (
					<div className={tableListCompactHeaderInnerClass}>
						<Checkbox
							aria-label="Select row"
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
				(category) => {
					const title = translateCatalogField(category.title, category.systemCatalog) ?? "";
					const origin = category.systemCatalog ? m.common_default() : m.common_custom();
					return `${title} ${origin}`;
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
			columnHelper.accessor((category) => translateCatalogField(category.title, category.systemCatalog) ?? "", {
				id: "title",
				...tableListColumnSizes.primaryLink,
				header: ({ column }) => <DataTableColumnHeader column={column} title={m.fields_title()} />,
				filterFn: "includesString",
				enableGlobalFilter: false,
				meta: { displayRequired: true },
				cell: ({ row }) => {
					const label = translateCatalogField(row.original.title, row.original.systemCatalog);
					return (
						<Link
							to="/catalog/species-category/$speciesCategoryId"
							params={{ speciesCategoryId: String(row.original.id) }}
							className="flex min-w-0 items-center gap-2 rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
						>
							<ItemPresentationIcon presentation={row.original.presentation} />
							<span className="truncate font-medium">{label}</span>
						</Link>
					);
				},
			}),

			columnHelper.accessor((category) => (category.systemCatalog ? "default" : "custom"), {
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
			columnHelper.accessor((category) => category.updatedAt.getTime(), {
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
					<SpeciesCategoryRowActions
						category={row.original}
						linkedSpeciesCount={linkedSpeciesCountByCategoryId.get(String(row.original.id)) ?? 0}
					/>
				),
			}),
		],
		[columnHelper, linkedSpeciesCountByCategoryId],
	);
	const table = useMemo(
		() =>
			createTable<SpeciesCategoryWithSystemCatalog>({
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
		[columnFilters, columnVisibility, columns, globalFilter, items, rowSelection, sorting],
	);

	const selectedCategoryIds = useMemo(
		() => table.getFilteredSelectedRowModel().rows.map((row) => row.original.id),
		[table],
	);
	const selectedCategories = useMemo(
		() => table.getFilteredSelectedRowModel().rows.map((row) => row.original),
		[table],
	);
	const selectionIncludesSystemCatalog = useMemo(
		() => table.getFilteredSelectedRowModel().rows.some((row) => row.original.systemCatalog),
		[table],
	);
	const bulkDeleteDisabled = selectedCategoryIds.length === 0 || selectionIncludesSystemCatalog;
	const bulkUpdateDisabled = selectedCategoryIds.length === 0 || selectionIncludesSystemCatalog;
	const bulkDeleteTooltip = tableSelectionBulkTooltip({
		selectedCount: selectedCategoryIds.length,
		hasPlacedInSelection: false,
		selectionIncludesDefaultCatalog: selectionIncludesSystemCatalog,
		enabledTooltip: m.collections_speciesCategory_deleteManyTooltip(),
	});
	const bulkUpdateTooltip = tableSelectionBulkTooltip({
		selectedCount: selectedCategoryIds.length,
		hasPlacedInSelection: false,
		selectionIncludesDefaultCatalog: selectionIncludesSystemCatalog,
		defaultCatalogAction: "update",
		enabledTooltip: m.common_updateSelected(),
	});
	useTableUrlSync({
		searchQ: qFromSearch,
		searchSortBy: sortByFromSearch,
		searchSortDesc: sortDescFromSearch,
		searchCf: cfFromSearch,
		initialSorting: [{ id: "title", desc: false }],
		sorting,
		setSorting,
		globalFilter,
		setGlobalFilter,
		columnFilters,
		setColumnFilters,
		navigate,
		currentSearch: {
			q: qFromSearch,
			sortBy: sortByFromSearch,
			sortDesc: sortDescFromSearch,
			cf: cfFromSearch,
		},
	});

	return (
		<div id="species-categories-page" className="flex min-h-0 flex-1 flex-col overflow-hidden">
			<DashboardPageHeading collection="speciesCategory">
				<h1 className="font-heading font-medium text-lg" id="page-title">
					{m.collections_speciesCategory_titlePlural()}
				</h1>
				<ButtonTooltip label={m.collections_speciesCategory_create()}>
					<Button
						type="button"
						size="icon"
						variant="outline"
						onClick={() => setCreateOpen(true)}
					>
						<span className="sr-only">{m.collections_speciesCategory_create()}</span>
						<PlusIcon />
					</Button>
				</ButtonTooltip>
			</DashboardPageHeading>
			<DashboardPageContent className="flex min-h-0 min-w-0 flex-1 flex-col gap-3 overflow-hidden">
				<div className="flex min-h-0 min-w-0 flex-1 flex-col px-1 pt-1 pb-2">
					<DataTable
						table={table}
						isPending={isPending}
						isError={isError}
						errorMessage={renderError(error, m.common_loadError())}
						emptyMessage={m.items_noElements()}
						globalSearch={{
							value: globalFilter,
							onValueChange: setGlobalFilter,
							searchPlaceholder: m.filtering_searchPlaceholder(),
							clearSearchLabel: m.filtering_clearSearch(), 
							clearFiltersLabel: m.filtering_clearFilters(),
							onClearFilters: () => {
								setGlobalFilter("");
								setColumnFilters([]);
								setRowSelection({});
							},
						}}
						highlightPendingRows
						selectedActions={
							<div className="flex items-center gap-2">
								<ButtonTooltip label={bulkUpdateTooltip} disabled={bulkUpdateDisabled}>
									<Button type="button" variant="outline" disabled={bulkUpdateDisabled} onClick={() => setBulkUpdateOpen(true)}>
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
										{m.collections_speciesCategory_deleteMany()}
									</Button>
								</ButtonTooltip>
							</div>
						}
					/>
				</div>
			</DashboardPageContent>
			<SpeciesCategoryCreateDialog open={createOpen} onOpenChange={setCreateOpen} />
			<SpeciesCategoryUpdateManyDialog
				open={bulkUpdateOpen}
				onOpenChange={setBulkUpdateOpen}
				items={selectedCategories}
			/>
			<DeleteConfirmDialog
				open={bulkDeleteOpen}
				onOpenChange={setBulkDeleteOpen}
				title={m.collections_speciesCategory_deleteMany()}
				description={m.collections_speciesCategory_deleteManyConfirmDescription({
					count: selectedCategoryIds.length,
				})}
				isPending={bulkDeleteMany.isPending}
				onConfirm={async () => {
					setBulkDeleteOpen(false);
					setRowSelection({});
					await bulkDeleteMany.mutateAsync({ ids: selectedCategoryIds });
				}}
			/>
		</div>
	);
}

function SpeciesCategoryRowActions({
	category,
	linkedSpeciesCount,
}: {
	category: SpeciesCategoryWithSystemCatalog;
	linkedSpeciesCount: number;
}) {
	const [editOpen, setEditOpen] = useState(false);
	const [deleteOpen, setDeleteOpen] = useState(false);
	const del = useSpeciesCategoryDeleteMutation();
	const label = translateCatalogField(category.title, category.systemCatalog);
	const editTitle = category.systemCatalog ? m.common_editDisabledDefaultCatalog() : m.common_edit();
	const deleteTitle = category.systemCatalog ? m.common_editDisabledDefaultCatalog() : m.common_delete();
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
					{category.systemCatalog ? (
						<ButtonTooltip label={editTitle} disabled>
							<DropdownMenuItem disabled title={editTitle}>
								<PencilIcon />
								{m.common_edit()}
							</DropdownMenuItem>
						</ButtonTooltip>
					) : (
						<DropdownMenuItem onSelect={() => setEditOpen(true)} title={editTitle}>
							<PencilIcon />
							{m.common_edit()}
						</DropdownMenuItem>
					)}

					{category.systemCatalog ? (
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
										to="/catalog/species"
										search={{ cf: serializeUrlColumnFilters([{ id: "category", value: String(category.id) }]) }}
										aria-label={linkedTitle}
									>
										<ExternalLinkIcon />
										{m.collections_species_titlePlural()}
									</Link>
								</Button>
							</DropdownMenuItem>
							<DropdownMenuItem asChild>
								<Button asChild variant="outline" size="xs" title={linkedTitle}>
									<Link
										to="/catalog/cultivars"
										search={{ cf: serializeUrlColumnFilters([{ id: "category", value: String(category.id) }]) }}
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
										search={{ cf: serializeUrlColumnFilters([{ id: "category", value: String(category.id) }]) }}
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
			{!category.systemCatalog ? (
				<SpeciesCategoryUpdateDialog category={category} open={editOpen} onOpenChange={setEditOpen} />
			) : null}
			<DeleteConfirmDialog
				open={deleteOpen}
				onOpenChange={setDeleteOpen}
				title={m.collections_speciesCategory_delete()}
				description={label ?? ""}
				warningDescription={
					linkedSpeciesCount > 0
						? linkedSpeciesCount === 1
							? m.collections_speciesCategory_deleteLinkedSingle()
							: m.collections_speciesCategory_deleteLinkedMany({ count: String(linkedSpeciesCount) })
						: undefined
				}
				isPending={del.isPending}
				onConfirm={async () => {
					setDeleteOpen(false);
					await del.mutateAsync({ id: category.id });
				}}
			/>
		</div>
	);
}




