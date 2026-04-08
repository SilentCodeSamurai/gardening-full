import type { CultivarEntity, SpeciesEntity } from "@backend/core/domain/gardening/entities";
import type { ItemPresentationValueObject } from "@backend/core/domain/gardening/value-objects";
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
	type Updater,
} from "@tanstack/react-table";
import { EllipsisVerticalIcon, ExternalLinkIcon, PencilIcon, PlusIcon, Trash2Icon, XIcon } from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import { CultivarCreateDialog } from "@/components/gardening/cultivar/cultivar-create-dialog";
import { CultivarUpdateDialog } from "@/components/gardening/cultivar/cultivar-update-dialog";
import { DeleteConfirmDialog } from "@/components/gardening/shared/delete-confirm-dialog";
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
import { useCultivarDeleteMutation } from "@/store/mutations";

type CultivarCategoryFilterOption = {
	value: string;
	label: string;
	presentation?: ItemPresentationValueObject;
};

type CultivarSpeciesFilterOption = {
	value: string;
	label: string;
	categoryId: string;
	presentation?: ItemPresentationValueObject;
};

export const Route = createFileRoute("/catalog/cultivars")({
	validateSearch: (search: Record<string, unknown>) => ({
		category: typeof search.category === "string" ? search.category : "",
		species: typeof search.species === "string" ? search.species : "",
	}),
	component: CultivarsPage,
});

function applyUpdater<T>(updater: Updater<T>, previous: T): T {
	return typeof updater === "function" ? (updater as (old: T) => T)(previous) : updater;
}

function getFilterString(filters: ColumnFiltersState, id: string): string {
	const entry = filters.find((f) => f.id === id);
	return entry == null ? "" : String(entry.value ?? "");
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

	if (species !== "") {
		const speciesEntity = speciesById.get(species);
		const speciesCategory = speciesEntity == null ? "" : String(speciesEntity.categoryId);
		if (speciesCategory !== "") category = speciesCategory;
	}

	if (category !== "" && species !== "") {
		const speciesEntity = speciesById.get(species);
		const speciesCategory = speciesEntity == null ? "" : String(speciesEntity.categoryId);
		if (speciesCategory !== category) species = "";
	}

	const categoryChanged = category !== prevCategory;
	if (categoryChanged && prevSpecies !== "" && species === prevSpecies) {
		const speciesEntity = speciesById.get(prevSpecies);
		const speciesCategory = speciesEntity == null ? "" : String(speciesEntity.categoryId);
		if (speciesCategory !== category) species = "";
	}

	next = setFilterValue(next, "category", category);
	next = setFilterValue(next, "species", species);
	return next;
}

function CultivarsPage() {
	const { category: categoryFromSearch, species: speciesFromSearch } = Route.useSearch();
	const { data, isPending, isError } = useQuery({ ...queryKeys.cultivar.all });
	const { data: speciesData } = useQuery({ ...queryKeys.species.all });
	const { data: categoriesData } = useQuery({ ...queryKeys.speciesCategory.all });

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
				translateCatalogField(category.title, category.isDefault) ?? String(category.id),
			);
		}
		return map;
	}, [categoriesData?.items]);

	const categoryFilterOptions = useMemo((): CultivarCategoryFilterOption[] => {
		const seen = new Set<string>();
		const options: CultivarCategoryFilterOption[] = [];
		for (const cultivar of items) {
			const species = speciesById.get(String(cultivar.speciesId));
			if (species == null) continue;
			const categoryId = String(species.categoryId);
			if (seen.has(categoryId)) continue;
			seen.add(categoryId);
			options.push({
				value: categoryId,
				label: categoryLabelById.get(categoryId) ?? categoryId,
				presentation: categoriesData?.items.find((c) => String(c.id) === categoryId)?.presentation ?? undefined,
			});
		}
		return options.sort((a, b) => a.label.localeCompare(b.label, undefined, { sensitivity: "base" }));
	}, [categoriesData?.items, categoryLabelById, items, speciesById]);

	const speciesFilterOptions = useMemo((): CultivarSpeciesFilterOption[] => {
		const seen = new Set<string>();
		const options: CultivarSpeciesFilterOption[] = [];
		for (const cultivar of items) {
			const species = speciesById.get(String(cultivar.speciesId));
			if (species == null) continue;
			const speciesId = String(species.id);
			if (seen.has(speciesId)) continue;
			seen.add(speciesId);
			options.push({
				value: speciesId,
				label: translateCatalogField(species.characteristics.name, species.isDefault) ?? String(species.id),
				categoryId: String(species.categoryId),
				presentation: species.presentation,
			});
		}
		return options.sort((a, b) => a.label.localeCompare(b.label, undefined, { sensitivity: "base" }));
	}, [items, speciesById]);

	const [sorting, setSorting] = useState<SortingState>([{ id: "title", desc: false }]);
	const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>(() => {
		const initial: ColumnFiltersState = [];
		if (categoryFromSearch) initial.push({ id: "category", value: categoryFromSearch });
		if (speciesFromSearch) initial.push({ id: "species", value: speciesFromSearch });
		return initial;
	});
	const [globalFilter, setGlobalFilter] = useState("");
	const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
	const [createOpen, setCreateOpen] = useState(false);

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
		[speciesById],
	);

	const columnHelper = useMemo(() => createColumnHelper<CultivarEntity>(), []);
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
				(cultivar) => {
					const species = speciesById.get(String(cultivar.speciesId));
					const speciesLabel =
						species == null
							? String(cultivar.speciesId)
							: (translateCatalogField(species.characteristics.name, species.isDefault) ??
								String(species.id));
					const categoryLabel =
						species == null ? "" : (categoryLabelById.get(String(species.categoryId)) ?? "");
					return `${cultivar.characteristics.name} ${cultivar.characteristics.description ?? ""} ${speciesLabel} ${categoryLabel}`;
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
				header: ({ column }) => <DataTableColumnHeader column={column} title={m["fields.title"]()} />,
				filterFn: "includesString",
				enableGlobalFilter: false,
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
			columnHelper.accessor(
				(cultivar) => {
					const species = speciesById.get(String(cultivar.speciesId));
					return species == null ? "" : String(species.categoryId);
				},
				{
					id: "category",
					header: ({ column }) => (
						<DataTableColumnHeader column={column} title={m["collections.speciesCategory.title"]()} />
					),
					filterFn: (row, _columnId, filterValue) => {
						if (filterValue == null || filterValue === "") return true;
						const species = speciesById.get(String(row.original.speciesId));
						if (species == null) return false;
						return String(species.categoryId) === String(filterValue);
					},
					enableGlobalFilter: false,
					cell: ({ row }) => {
						const species = speciesById.get(String(row.original.speciesId));
						if (species == null) return <span className="text-muted-foreground text-xs">-</span>;
						const categoryId = String(species.categoryId);
						return (
							<span className="text-muted-foreground text-xs">
								{categoryLabelById.get(categoryId) ?? "-"}
							</span>
						);
					},
					meta: {
						filter: ({ column }: { column: Column<CultivarEntity, unknown> }) => {
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
										placeholder={`${m["common.all"]()} ${m["collections.speciesCategory.titlePlural"]().toLowerCase()}`}
										aria-label={m["filtering.filterBy"]({
											label: m["collections.speciesCategory.title"]().toLowerCase(),
										})}
										showClear
										startAdornment={
											selected?.presentation ? (
												<ItemPresentationIcon presentation={selected.presentation} />
											) : null
										}
									/>
									<ComboboxContent className="z-100">
										<ComboboxEmpty>{m["filtering.comboboxEmpty"]()}</ComboboxEmpty>
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
				},
			),
			columnHelper.accessor((cultivar) => String(cultivar.speciesId), {
				id: "species",
				header: ({ column }) => (
					<DataTableColumnHeader column={column} title={m["collections.species.title"]()} />
				),
				filterFn: (row, _columnId, filterValue) => {
					if (filterValue == null || filterValue === "") return true;
					return String(row.original.speciesId) === String(filterValue);
				},
				enableGlobalFilter: false,
				cell: ({ row }) => {
					const species = speciesById.get(String(row.original.speciesId));
					if (species == null) return <span className="text-muted-foreground text-xs">-</span>;
					return (
						<span className="text-muted-foreground text-xs">
							{translateCatalogField(species.characteristics.name, species.isDefault) ??
								String(species.id)}
						</span>
					);
				},
				meta: {
					filter: ({
						column,
						table,
					}: {
						column: Column<CultivarEntity, unknown>;
						table: { getColumn: (id: string) => { getFilterValue: () => unknown } | undefined };
					}) => {
						const categoryFilter = String(table.getColumn("category")?.getFilterValue() ?? "");
						const visibleSpeciesOptions = categoryFilter
							? speciesFilterOptions.filter((opt) => opt.categoryId === categoryFilter)
							: speciesFilterOptions;
						const value = String(column.getFilterValue() ?? "");
						const selected = speciesFilterOptions.find((opt) => opt.value === value) ?? null;
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
									placeholder={`${m["common.all"]()} ${m["collections.species.titlePlural"]().toLowerCase()}`}
									aria-label={m["filtering.filterBy"]({
										label: m["collections.species.title"]().toLowerCase(),
									})}
									showClear
									startAdornment={
										selected?.presentation ? (
											<ItemPresentationIcon presentation={selected.presentation} />
										) : null
									}
								/>
								<ComboboxContent className="z-100">
									<ComboboxEmpty>{m["filtering.comboboxEmpty"]()}</ComboboxEmpty>
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
				header: ({ column }) => <DataTableColumnHeader column={column} title={m["fields.updatedAt"]()} />,
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
						<span className="text-center leading-tight">{m["common.actions"]()}</span>
					</div>
				),
				enableColumnFilter: false,
				enableGlobalFilter: false,
				enableSorting: false,
				meta: {
					headerClassName: tableListHeaderClasses.actions,
					cellClassName: tableListCellClasses.actions,
				},
				cell: ({ row }) => <CultivarRowActions cultivar={row.original} />,
			}),
		],
		[categoryFilterOptions, categoryLabelById, columnHelper, speciesById, speciesFilterOptions],
	);

	const table = useMemo(
		() =>
			createTable<CultivarEntity>({
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
				renderFallbackValue: null,
				state: {
					sorting,
					globalFilter,
					columnFilters: effectiveColumnFilters,
					rowSelection,
					columnVisibility: { globalSearch: false },
					columnPinning: { left: [], right: [] },
				},
			}),
		[columns, effectiveColumnFilters, globalFilter, items, onColumnFiltersChange, rowSelection, sorting],
	);

	const filteredRowCount = table.getFilteredRowModel().rows.length;
	const emptyMessage =
		items.length === 0
			? m["items.noElements"]()
			: filteredRowCount === 0
				? m["filtering.noFilteredElements"]()
				: m["items.noElements"]();

	return (
		<div className="flex min-h-0 flex-1 flex-col overflow-hidden">
			<PageHeading collection="cultivar">
				<h1 className="font-heading font-medium text-lg">{m["collections.cultivar.titlePlural"]()}</h1>
				<ButtonTooltip label={m["collections.cultivar.create"]()}>
					<Button type="button" size="icon" variant="outline" onClick={() => setCreateOpen(true)}>
						<span className="sr-only">{m["collections.cultivar.create"]()}</span>
						<PlusIcon />
					</Button>
				</ButtonTooltip>
			</PageHeading>
			<PageContent className="flex min-h-0 min-w-0 flex-1 flex-col gap-3 overflow-hidden">
				<div className="flex flex-wrap items-end gap-2">
					<Input
						className="w-full min-w-40 sm:w-56"
						placeholder={m["filtering.searchPlaceholder"]()}
						value={globalFilter}
						onChange={(event) => setGlobalFilter(event.target.value)}
						aria-label={m["filtering.searchPlaceholder"]()}
					/>
					<ButtonTooltip label={m["filtering.clearFilters"]()}>
						<Button
							type="button"
							variant="outline"
							size="icon"
							onClick={() => {
								table.resetGlobalFilter();
								table.resetColumnFilters();
								setRowSelection({});
							}}
							aria-label={m["filtering.clearFilters"]()}
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
						errorMessage={m["common.loadError"]()}
						emptyMessage={emptyMessage}
					/>
				</div>
			</PageContent>
			<CultivarCreateDialog open={createOpen} onOpenChange={setCreateOpen} />
		</div>
	);
}

function CultivarRowActions({ cultivar }: { cultivar: CultivarEntity }) {
	const [editOpen, setEditOpen] = useState(false);
	const [deleteOpen, setDeleteOpen] = useState(false);
	const del = useCultivarDeleteMutation();
	const linkedTitle = m["common.related"]();

	return (
		<div className="flex w-full items-center justify-center">
			<DropdownMenu>
				<DropdownMenuTrigger asChild>
					<Button type="button" variant="outline" size="icon" aria-label={m["common.actions"]()}>
						<EllipsisVerticalIcon />
					</Button>
				</DropdownMenuTrigger>
				<DropdownMenuContent className="flex flex-col gap-1" align="end">
					<DropdownMenuItem onSelect={() => setEditOpen(true)} title={m["common.edit"]()}>
						<PencilIcon />
						{m["common.edit"]()}
					</DropdownMenuItem>
					<DropdownMenuItem onSelect={() => setDeleteOpen(true)} title={m["common.delete"]()}>
						<Trash2Icon />
						{m["common.delete"]()}
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
										search={{ category: "", species: "", cultivar: String(cultivar.id) }}
										aria-label={linkedTitle}
									>
										<ExternalLinkIcon />
										{m["collections.plant.titlePlural"]()}
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
				title={m["collections.cultivar.delete"]()}
				description={cultivar.characteristics.name}
				isPending={del.isPending}
				onConfirm={async () => {
					await del.mutateAsync({ id: cultivar.id });
					setDeleteOpen(false);
				}}
			/>
		</div>
	);
}
