import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
	type ColumnFiltersState,
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
import { Input } from "@/components/ui/input";
import { translateCatalogField } from "@/lib/translate-catalog-field";
import { renderError } from "@/lib/render-error";
import * as m from "@/paraglide/messages.js";
import { queryKeys } from "@/store/keys";
import { useSpeciesCategoryDeleteMutation } from "@/store/mutations";

export const Route = createFileRoute("/_authenticated/catalog/species-categories")({
	component: SpeciesCategoriesPage,
});

function SpeciesCategoriesPage() {
	const { data, isPending, isError, error } = useQuery({ ...queryKeys.speciesCategory.all });
	const items = useMemo(() => data?.items ?? [], [data?.items]);

	const [sorting, setSorting] = useState<SortingState>([{ id: "title", desc: false }]);
	const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
	const [globalFilter, setGlobalFilter] = useState("");
	const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
	const [createOpen, setCreateOpen] = useState(false);
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
				cell: ({ row }) => <SpeciesCategoryRowActions category={row.original} />,
			}),
		],
		[columnHelper],
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
				renderFallbackValue: null,
				state: {
					sorting,
					globalFilter,
					columnFilters,
					rowSelection,
					columnVisibility: { globalSearch: false },
					columnPinning: { left: [], right: [] },
				},
			}),
		[columnFilters, columns, globalFilter, items, rowSelection, sorting],
	);

	return (
		<div className="flex min-h-0 flex-1 flex-col overflow-hidden">
			<DashboardPageHeading collection="speciesCategory">
				<h1 className="font-heading font-medium text-lg">{m.collections_speciesCategory_titlePlural()}</h1>
				<ButtonTooltip label={m.collections_speciesCategory_create()}>
					<Button type="button" size="icon" variant="outline" onClick={() => setCreateOpen(true)}>
						<span className="sr-only">{m.collections_speciesCategory_create()}</span>
						<PlusIcon />
					</Button>
				</ButtonTooltip>
			</DashboardPageHeading>
			<DashboardPageContent className="flex min-h-0 min-w-0 flex-1 flex-col gap-3 overflow-hidden">
				<div className="flex flex-wrap items-end gap-2">
					<Input
						className="w-full min-w-40 sm:w-56"
						placeholder={m.filtering_searchPlaceholder()}
						value={globalFilter}
						onChange={(event) => setGlobalFilter(event.target.value)}
					/>
					<ButtonTooltip label={m.filtering_clearFilters()}>
						<Button
							type="button"
							variant="outline"
							size="icon"
							onClick={() => {
								table.resetGlobalFilter();
								table.resetColumnFilters();
								setRowSelection({});
							}}
							aria-label={m.filtering_clearFilters()}
						>
							<XIcon />
						</Button>
					</ButtonTooltip>
				</div>
				<div className="flex min-h-0 min-w-0 flex-1 flex-col px-1 pt-1 pb-2">
					<DataTable
						table={table}
						isPending={isPending}
						isError={isError}
						errorMessage={renderError(error, m.common_loadError())}
						emptyMessage={m.items_noElements()}
						highlightPendingRows
					/>
				</div>
			</DashboardPageContent>
			<SpeciesCategoryCreateDialog open={createOpen} onOpenChange={setCreateOpen} />
		</div>
	);
}

function SpeciesCategoryRowActions({ category }: { category: SpeciesCategoryWithSystemCatalog }) {
	const [editOpen, setEditOpen] = useState(false);
	const [deleteOpen, setDeleteOpen] = useState(false);
	const del = useSpeciesCategoryDeleteMutation();
	const { data: speciesData } = useQuery({ ...queryKeys.species.all });
	const label = translateCatalogField(category.title, category.systemCatalog);
	const linkedSpeciesCount =
		speciesData?.items.filter((species) => String(species.categoryId ?? "") === String(category.id)).length ?? 0;
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
										search={{ category: String(category.id) }}
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
										search={{ category: String(category.id), species: "" }}
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
										search={{ category: String(category.id), species: "", cultivar: "" }}
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
