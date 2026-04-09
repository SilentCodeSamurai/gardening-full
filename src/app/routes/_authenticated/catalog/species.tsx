import type { SpeciesWithSystemCatalog } from "@backend/core/application/use-cases/gardening/species.crud-use-cases";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
	type Column,
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
	PencilOffIcon,
	PlusIcon,
	Trash2Icon,
	XIcon,
} from "lucide-react";
import { useMemo, useState } from "react";
import { DeleteConfirmDialog } from "@/components/gardening/shared/delete-confirm-dialog";
import { SpeciesCreateDialog } from "@/components/gardening/species/species-create-dialog";
import { SpeciesUpdateDialog } from "@/components/gardening/species/species-update-dialog";
import { ItemPresentationIcon } from "@/components/icon/item-presentation-icon";
import { PageContent } from "@/components/layout/page-content";
import { PageHeading } from "@/components/layout/page-heading";
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
import { Input } from "@/components/ui/input";
import { translateCatalogField } from "@/lib/translate-catalog-field";
import * as m from "@/paraglide/messages.js";
import { queryKeys } from "@/store/keys";
import { useSpeciesDeleteMutation } from "@/store/mutations";

export const Route = createFileRoute("/_authenticated/catalog/species")({
	validateSearch: (search: Record<string, unknown>) => ({
		category: typeof search.category === "string" ? search.category : "",
	}),
	component: SpeciesPage,
});

function SpeciesPage() {
	const { category: categoryFromSearch } = Route.useSearch();
	const {
		data: speciesData,
		isPending: spPending,
		isError: spError,
	} = useQuery({
		...queryKeys.species.all,
	});
	const { data: catData } = useQuery({ ...queryKeys.speciesCategory.all });

	const categoryTitle = useMemo(() => {
		const map = new Map<string, string>();
		for (const c of catData?.items ?? []) {
			map.set(String(c.id), translateCatalogField(c.title, c.systemCatalog) ?? String(c.id));
		}
		return map;
	}, [catData?.items]);

	const items = useMemo(() => speciesData?.items ?? [], [speciesData?.items]);

	const [sorting, setSorting] = useState<SortingState>([{ id: "name", desc: false }]);
	const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>(() =>
		categoryFromSearch ? [{ id: "category", value: categoryFromSearch }] : [],
	)
	const [globalFilter, setGlobalFilter] = useState("");
	const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
	const [createOpen, setCreateOpen] = useState(false);

	const categoryComboboxOptions = useMemo(() => {
		const cats = catData?.items ?? [];
		return cats.map((c) => ({
			value: String(c.id),
			label: translateCatalogField(c.title, c.systemCatalog) ?? String(c.id),
			presentation: c.presentation,
		}))
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
					)
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
						)
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
					)
					return (
						<span className="line-clamp-2 max-w-md whitespace-normal text-muted-foreground text-xs">
							{description || "-"}
						</span>
					)
				},
			}),

			columnHelper.accessor((s) => s.createdAt.getTime(), {
				id: "createdAt",
				header: ({ column }) => <DataTableColumnHeader column={column} title={m.sorting_newestFirst()} />,
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
					)
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
				cell: ({ row }) => (
					<SpeciesRowActions species={row.original} categoryId={String(row.original.categoryId)} />
				),
			}),
		],
		[categoryComboboxOptions, categoryTitle, columnHelper],
	)

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
	)

	const filteredRowCount = table.getFilteredRowModel().rows.length;
	const emptyMessage =
		items.length === 0
			? m.items_noElements()
			: filteredRowCount === 0
				? m.filtering_noFilteredElements()
				: m.items_noElements();

	return (
		<div className="flex min-h-0 flex-1 flex-col overflow-hidden">
			<PageHeading collection="species">
				<h1 className="font-heading font-medium text-lg">{m.collections_species_titlePlural()}</h1>
				<ButtonTooltip label={m.collections_species_create()}>
					<Button type="button" size="icon" variant="outline" onClick={() => setCreateOpen(true)}>
						<span className="sr-only">{m.collections_species_create()}</span>
						<PlusIcon />
					</Button>
				</ButtonTooltip>
			</PageHeading>
			<PageContent className="flex min-h-0 min-w-0 flex-1 flex-col gap-3 overflow-hidden">
				<div className="flex flex-wrap items-end gap-2">
					<Input
						className="w-full min-w-40 sm:w-56"
						placeholder={m.filtering_searchPlaceholder()}
						value={globalFilter}
						onChange={(event) => setGlobalFilter(event.target.value)}
						aria-label={m.filtering_searchPlaceholder()}
					/>
					<ButtonTooltip label={m.filtering_clearFilters()}>
						<Button
							type="button"
							variant="outline"
							size="icon"
							onClick={() => {
								table.resetGlobalFilter();
								table.resetColumnFilters();
								setRowSelection({})
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
						isPending={spPending}
						isError={spError}
						errorMessage={m.common_loadError()}
						emptyMessage={emptyMessage}
					/>
				</div>
			</PageContent>
			<SpeciesCreateDialog open={createOpen} onOpenChange={setCreateOpen} />
		</div>
	)
}

function SpeciesRowActions({ species, categoryId }: { species: SpeciesWithSystemCatalog; categoryId: string }) {
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
										search={{ category: String(categoryId), species: String(species.id) }}
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
											category: String(categoryId),
											species: String(species.id),
											cultivar: "",
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
				isPending={del.isPending}
				onConfirm={async () => {
					await del.mutateAsync({ id: species.id });
					setDeleteOpen(false);
				}}
			/>
		</div>
	)
}
