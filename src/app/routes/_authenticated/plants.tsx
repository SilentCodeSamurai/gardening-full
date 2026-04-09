import type { CultivarEntity, HydratedPlantEntity, PlantEntityId } from "@backend/core/domain/gardening/entities";
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
	type Table,
	type Updater,
} from "@tanstack/react-table";
import { EllipsisVerticalIcon, PencilIcon, PlusIcon, Trash2Icon, XIcon } from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import {
	GardeningEventCreateDialog,
	type GardeningEventCreateDialogInitialValues,
} from "@/components/gardening/gardening-event/gardening-event-create-dialog";
import { PlantCreateDialog } from "@/components/gardening/plant/plant-create-dialog";
import { PlantUpdateDialog } from "@/components/gardening/plant/plant-update-dialog";
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
	tableListPlacementHeaderInnerClass,
} from "@/components/table/table-list-column-sizes";
import {
	type PlacementFilterComboboxItem,
	TablePlacementFilterCombobox,
} from "@/components/table/table-placed-filter-combobox";
import { TablePlacementCell } from "@/components/table/table-placement-cell";
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
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { getPlantPlacementSummary, plantPlacementFilterToken } from "@/lib/spatial-placement-summary";
import { tableSelectionBulkTooltip } from "@/lib/table-selection-tooltips";
import { translateCatalogField } from "@/lib/translate-catalog-field";
import * as m from "@/paraglide/messages.js";
import { queryKeys } from "@/store/keys";
import { usePlantDeleteManyMutation, usePlantDeleteMutation } from "@/store/mutations";
import { collectPlacedEntityIds } from "@/store/spatial-placement";

export const Route = createFileRoute("/_authenticated/plants")({
	validateSearch: (search: Record<string, unknown>) => ({
		category: typeof search.category === "string" ? search.category : "",
		species: typeof search.species === "string" ? search.species : "",
		cultivar: typeof search.cultivar === "string" ? search.cultivar : "",
	}),
	component: PlantsPage,
});

function humanizeToken(value: string): string {
	return value
		.replace(/([a-z])([A-Z])/g, "$1 $2")
		.replace(/[_-]+/g, " ")
		.trim()
		.replace(/\b\w/g, (char) => char.toUpperCase());
}

function resolveSpeciesDisplayName(rawSpeciesName: string): string {
	const trimmed = rawSpeciesName.trim();
	if (trimmed === "") return trimmed;
	if (!trimmed.includes(".")) return trimmed;

	const fn = (m as Record<string, unknown>)[trimmed];
	if (typeof fn === "function") return (fn as () => string)();

	if (trimmed.endsWith(".name")) {
		const parts = trimmed.split(".");
		const token = parts[parts.length - 2] ?? "";
		if (token) return humanizeToken(token);
	}
	return trimmed;
}

function getPlantDisplayTitle(plant: HydratedPlantEntity): string {
	if (plant.title?.trim()) return plant.title.trim();
	return plant.cultivar.characteristics.name || m.items_untitled();
}

function applyUpdater<T>(updater: Updater<T>, prev: T): T {
	return typeof updater === "function" ? (updater as (p: T) => T)(prev) : updater;
}

function reconcilePlantsColumnFilters(
	prev: ColumnFiltersState,
	next: ColumnFiltersState,
	speciesCategoryById: Map<string, string>,
	cultivarById: Map<string, CultivarEntity>,
): ColumnFiltersState {
	const get = (id: string, state: ColumnFiltersState) => String(state.find((f) => f.id === id)?.value ?? "");

	const prevCat = get("category", prev);
	const prevSpec = get("species", prev);
	const nextCat = get("category", next);
	const nextSpec = get("species", next);

	let working = [...next];

	if (nextCat !== prevCat) {
		working = working.filter((f) => f.id !== "species" && f.id !== "cultivar");
	} else if (nextSpec !== prevSpec) {
		working = working.filter((f) => f.id !== "cultivar");
	}

	const cultivarId = get("cultivar", working);
	if (cultivarId) {
		const cultivarEntity = cultivarById.get(cultivarId);
		const cultivarSpeciesId = cultivarEntity ? String(cultivarEntity.speciesId) : "";
		const cultivarCategoryId = cultivarSpeciesId ? String(speciesCategoryById.get(cultivarSpeciesId) ?? "") : "";
		if (cultivarCategoryId && !get("category", working)) {
			working = [...working.filter((f) => f.id !== "category"), { id: "category", value: cultivarCategoryId }];
		}
		if (cultivarSpeciesId && !get("species", working)) {
			working = [...working.filter((f) => f.id !== "species"), { id: "species", value: cultivarSpeciesId }];
		}
		if (get("category", working) && cultivarCategoryId && get("category", working) !== cultivarCategoryId) {
			working = working.filter((f) => f.id !== "cultivar" && f.id !== "species");
		}
		if (get("species", working) && cultivarSpeciesId && get("species", working) !== cultivarSpeciesId) {
			working = working.filter((f) => f.id !== "cultivar");
		}
	}

	const speciesId = get("species", working);
	if (speciesId) {
		const speciesCategoryId = String(speciesCategoryById.get(speciesId) ?? "");
		if (speciesCategoryId && !get("category", working)) {
			working = [...working.filter((f) => f.id !== "category"), { id: "category", value: speciesCategoryId }];
		}
		if (get("category", working) && speciesCategoryId && get("category", working) !== speciesCategoryId) {
			working = working.filter((f) => f.id !== "species" && f.id !== "cultivar");
		}
	}

	return working;
}

type SpeciesOption = {
	value: string;
	label: string;
	presentation?: ItemPresentationValueObject;
	categoryId: string;
};

type CultivarOption = {
	value: string;
	label: string;
	presentation?: ItemPresentationValueObject;
	speciesId: string;
	categoryId: string;
};

function PlantsPage() {
	const {
		category: categoryFromSearch,
		species: speciesFromSearch,
		cultivar: cultivarFromSearch,
	} = Route.useSearch();
	const { data, isPending, isError } = useQuery({ ...queryKeys.plant.all });
	const { data: spatialData } = useQuery({
		...queryKeys.spatial.allNodes,
		placeholderData: (previous) => previous,
	});
	const { data: speciesData } = useQuery({ ...queryKeys.species.all });
	const { data: cultivarData } = useQuery({ ...queryKeys.cultivar.all });
	const { data: categoryData } = useQuery({ ...queryKeys.speciesCategory.all });
	const { data: locationData } = useQuery({ ...queryKeys.location.all });
	const items = useMemo(() => data?.items ?? [], [data?.items]);
	const allLocations = useMemo(() => locationData?.items ?? [], [locationData?.items]);
	const speciesCategoryById = useMemo(() => {
		const map = new Map<string, string>();
		for (const s of speciesData?.items ?? []) {
			map.set(String(s.id), String(s.categoryId));
		}
		return map;
	}, [speciesData?.items]);
	const speciesById = useMemo(
		() => new Map((speciesData?.items ?? []).map((s) => [String(s.id), s] as const)),
		[speciesData?.items],
	)
	const cultivarById = useMemo(
		() => new Map((cultivarData?.items ?? []).map((c) => [String(c.id), c] as const)),
		[cultivarData?.items],
	)
	const placedPlantIds = useMemo(
		() => collectPlacedEntityIds(spatialData?.items ?? [], "plant"),
		[spatialData?.items],
	)
	const plantPlacementParentIdsFromTable = useMemo(() => {
		const spatial = spatialData?.items ?? [];
		const ids = new Set<string>();
		for (const plant of items) {
			const s = getPlantPlacementSummary(spatial, String(plant.id), allLocations);
			if (s.kind === "underLocation") ids.add(s.locationId);
		}
		return ids;
	}, [allLocations, items, spatialData?.items]);

	const categoryLabelById = useMemo(() => {
		const map = new Map<string, string>();
		for (const c of categoryData?.items ?? []) {
			map.set(String(c.id), translateCatalogField(c.title, c.systemCatalog) ?? String(c.id));
		}
		return map;
	}, [categoryData?.items]);

	const cultivarComboboxOptions = useMemo(() => {
		const categoryIdsInPlants = new Set<string>();
		for (const plant of items) {
			const speciesId = String(plant.cultivar.species.id);
			const categoryId = speciesCategoryById.get(speciesId);
			if (categoryId) {
				categoryIdsInPlants.add(categoryId);
			}
		}

		const speciesMap = new Map<string, SpeciesOption>();
		const cultivarMap = new Map<string, CultivarOption>();
		for (const plant of items) {
			const speciesId = String(plant.cultivar.species.id);
			if (!speciesMap.has(speciesId)) {
				const speciesEntity = speciesById.get(speciesId);
				speciesMap.set(speciesId, {
					value: speciesId,
					label:
						speciesEntity?.characteristics?.name != null
							? (translateCatalogField(speciesEntity.characteristics.name, speciesEntity.systemCatalog) ??
								plant.cultivar.species.characteristics.name)
							: plant.cultivar.species.characteristics.name,
					presentation: speciesEntity?.presentation,
					categoryId: speciesEntity ? String(speciesEntity.categoryId) : "",
				})
			}
			const cultivarId = String(plant.cultivar.id);
			if (!cultivarMap.has(cultivarId)) {
				const cultivarEntity = cultivarById.get(cultivarId);
				cultivarMap.set(cultivarId, {
					value: cultivarId,
					label: cultivarEntity?.characteristics?.name ?? plant.cultivar.characteristics.name,
					presentation: cultivarEntity?.presentation,
					speciesId: cultivarEntity ? String(cultivarEntity.speciesId) : "",
					categoryId: cultivarEntity
						? String(speciesCategoryById.get(String(cultivarEntity.speciesId)) ?? "")
						: "",
				})
			}
		}

		return [...cultivarMap.values()];
	}, [cultivarById, items, speciesById, speciesCategoryById]);

	const plantCategoryFilterOptions = useMemo(() => {
		const ids = new Set<string>();
		for (const plant of items) {
			const cat = speciesCategoryById.get(String(plant.cultivar.species.id));
			if (cat) ids.add(cat);
		}
		return [...ids]
			.map((id) => ({
				value: id,
				label: categoryLabelById.get(id) ?? id,
				presentation: categoryData?.items.find((c) => String(c.id) === id)?.presentation,
			}))
			.sort((a, b) => a.label.localeCompare(b.label, undefined, { sensitivity: "base" }));
	}, [items, speciesCategoryById, categoryLabelById, categoryData?.items]);

	const plantSpeciesFilterOptions = useMemo(() => {
		const seen = new Map<
			string,
			{
				value: string;
				label: string;
				presentation?: ItemPresentationValueObject;
				categoryId: string;
			}
		>()
		for (const plant of items) {
			const sid = String(plant.cultivar.species.id);
			if (seen.has(sid)) continue;
			const speciesEntity = speciesById.get(sid);
			const label =
				speciesEntity?.characteristics?.name != null
					? (translateCatalogField(speciesEntity.characteristics.name, speciesEntity.systemCatalog) ??
						plant.cultivar.species.characteristics.name)
					: resolveSpeciesDisplayName(plant.cultivar.species.characteristics.name);
			seen.set(sid, {
				value: sid,
				label,
				presentation: speciesEntity?.presentation ?? plant.cultivar.species.presentation,
				categoryId: speciesCategoryById.get(sid) ?? "",
			})
		}
		return [...seen.values()].sort((a, b) => a.label.localeCompare(b.label, undefined, { sensitivity: "base" }));
	}, [items, speciesById, speciesCategoryById]);

	const [sorting, setSorting] = useState<SortingState>([{ id: "title", desc: false }]);
	const [globalFilter, setGlobalFilter] = useState("");
	const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>(() => {
		const initial: ColumnFiltersState = [];
		if (categoryFromSearch) initial.push({ id: "category", value: categoryFromSearch });
		if (speciesFromSearch) initial.push({ id: "species", value: speciesFromSearch });
		if (cultivarFromSearch) initial.push({ id: "cultivar", value: cultivarFromSearch });
		return initial;
	});
	const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
	const [createOpen, setCreateOpen] = useState(false);
	const [createEventOpen, setCreateEventOpen] = useState(false);
	const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
	const bulkDeleteMany = usePlantDeleteManyMutation();

	const effectiveColumnFilters = useMemo(
		() => reconcilePlantsColumnFilters(columnFilters, columnFilters, speciesCategoryById, cultivarById),
		[columnFilters, cultivarById, speciesCategoryById],
	)

	const placementColumnFilterRaw = useMemo(
		() => String(effectiveColumnFilters.find((f) => f.id === "placement")?.value ?? ""),
		[effectiveColumnFilters],
	)

	const plantPlacementFilterItems = useMemo((): PlacementFilterComboboxItem[] => {
		const parentIds = new Set(plantPlacementParentIdsFromTable);
		if (placementColumnFilterRaw.startsWith("under:")) {
			parentIds.add(placementColumnFilterRaw.slice("under:".length));
		}
		const underLocs = allLocations
			.filter((l) => parentIds.has(String(l.id)))
			.sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" }));
		return [
			{ id: "all", filter: "", label: m.filtering_placedFilterAll() },
			{ id: "unplaced", filter: "unplaced", label: m.filtering_placedFilterUnplaced() },
			...underLocs.map((loc) => ({
				id: `under-${String(loc.id)}`,
				filter: `under:${String(loc.id)}`,
				label: loc.name,
				presentation: loc.presentation,
			})),
		]
	}, [allLocations, placementColumnFilterRaw, plantPlacementParentIdsFromTable]);

	const onColumnFiltersChange = useCallback(
		(updater: Updater<ColumnFiltersState>) => {
			setColumnFilters((prev) => {
				const prevEffective = reconcilePlantsColumnFilters(prev, prev, speciesCategoryById, cultivarById);
				const next = applyUpdater(updater, prevEffective);
				return reconcilePlantsColumnFilters(prevEffective, next, speciesCategoryById, cultivarById);
			})
		},
		[cultivarById, speciesCategoryById],
	)

	const columnHelper = useMemo(() => createColumnHelper<HydratedPlantEntity>(), []);
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
				(p) => {
					const title = getPlantDisplayTitle(p);
					const desc = p.description ?? "";
					const cv = p.cultivar.characteristics.name;
					const sp = resolveSpeciesDisplayName(p.cultivar.species.characteristics.name);
					const catId = speciesCategoryById.get(String(p.cultivar.species.id)) ?? "";
					const cat = categoryLabelById.get(catId) ?? "";
					return `${title} ${desc} ${cv} ${sp} ${cat}`;
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
			columnHelper.accessor((p) => getPlantDisplayTitle(p), {
				id: "title",
				...tableListColumnSizes.primaryLink,
				header: ({ column }) => <DataTableColumnHeader column={column} title={m.fields_title()} />,
				filterFn: "includesString",
				enableGlobalFilter: false,
				cell: ({ row }) => {
					const plant = row.original;
					const title = getPlantDisplayTitle(plant);
					return (
						<Link
							to="/plant/$plantId"
							params={{ plantId: String(plant.id) }}
							className="flex min-w-0 items-center gap-2 rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
						>
							<ItemPresentationIcon presentation={plant.cultivar.presentation} />
							<p className="truncate font-medium">{title}</p>
						</Link>
					)
				},
			}),
			columnHelper.accessor((p) => speciesCategoryById.get(String(p.cultivar.species.id)) ?? "", {
				id: "category",
				header: ({ column }) => (
					<DataTableColumnHeader column={column} title={m.collections_speciesCategory_title()} />
				),
				sortingFn: (rowA, rowB) => {
					const a =
						categoryLabelById.get(
							speciesCategoryById.get(String(rowA.original.cultivar.species.id)) ?? "",
						) ?? ""
					const b =
						categoryLabelById.get(
							speciesCategoryById.get(String(rowB.original.cultivar.species.id)) ?? "",
						) ?? ""
					return a.localeCompare(b, undefined, { sensitivity: "base" });
				},
				filterFn: (row, _columnId, filterValue) => {
					if (filterValue == null || filterValue === "") return true;
					const cat = speciesCategoryById.get(String(row.original.cultivar.species.id)) ?? "";
					return cat === String(filterValue);
				},
				enableGlobalFilter: false,
				meta: {
					filter: ({ column }: { column: Column<HydratedPlantEntity, unknown> }) => {
						const value = String(column.getFilterValue() ?? "");
						const selected = plantCategoryFilterOptions.find((opt) => opt.value === value) ?? null;
						return (
							<Combobox
								items={plantCategoryFilterOptions}
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
						)
					},
				},
				cell: ({ row }) => {
					const catId = speciesCategoryById.get(String(row.original.cultivar.species.id)) ?? "";
					return <span className="text-muted-foreground text-xs">{categoryLabelById.get(catId) ?? "-"}</span>;
				},
			}),
			columnHelper.accessor((p) => String(p.cultivar.species.id), {
				id: "species",
				header: ({ column }) => (
					<DataTableColumnHeader column={column} title={m.collections_species_title()} />
				),
				sortingFn: (rowA, rowB) =>
					resolveSpeciesDisplayName(rowA.original.cultivar.species.characteristics.name).localeCompare(
						resolveSpeciesDisplayName(rowB.original.cultivar.species.characteristics.name),
						undefined,
						{ sensitivity: "base" },
					),
				filterFn: (row, _columnId, filterValue) => {
					if (filterValue == null || filterValue === "") return true;
					return String(row.original.cultivar.species.id) === String(filterValue);
				},
				enableGlobalFilter: false,
				meta: {
					filter: ({
						column,
						table,
					}: {
						column: Column<HydratedPlantEntity, unknown>;
						table: Table<HydratedPlantEntity>;
					}) => {
						const categoryFilter = String(table.getColumn("category")?.getFilterValue() ?? "");
						const filteredSpeciesOptions = categoryFilter
							? plantSpeciesFilterOptions.filter((opt) => opt.categoryId === categoryFilter)
							: plantSpeciesFilterOptions;
						const value = String(column.getFilterValue() ?? "");
						const selected = plantSpeciesFilterOptions.find((opt) => opt.value === value) ?? null;
						return (
							<Combobox
								items={filteredSpeciesOptions}
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
						)
					},
				},
				cell: ({ row }) => (
					<span className="text-muted-foreground text-xs">
						{resolveSpeciesDisplayName(row.original.cultivar.species.characteristics.name)}
					</span>
				),
			}),
			columnHelper.accessor((p) => String(p.cultivar.id), {
				id: "cultivar",
				header: ({ column }) => (
					<DataTableColumnHeader column={column} title={m.collections_cultivar_title()} />
				),
				sortingFn: (rowA, rowB) =>
					rowA.original.cultivar.characteristics.name.localeCompare(
						rowB.original.cultivar.characteristics.name,
						undefined,
						{ sensitivity: "base" },
					),
				filterFn: (row, _columnId, filterValue) => {
					if (filterValue == null || filterValue === "") return true;
					return String(row.original.cultivar.id) === String(filterValue);
				},
				enableGlobalFilter: false,
				meta: {
					filter: ({
						column,
						table,
					}: {
						column: Column<HydratedPlantEntity, unknown>;
						table: Table<HydratedPlantEntity>;
					}) => {
						const categoryFilter = String(table.getColumn("category")?.getFilterValue() ?? "");
						const speciesFilter = String(table.getColumn("species")?.getFilterValue() ?? "");
						const filteredCultivarOptions = speciesFilter
							? cultivarComboboxOptions.filter((opt) => opt.speciesId === speciesFilter)
							: categoryFilter
								? cultivarComboboxOptions.filter((opt) => opt.categoryId === categoryFilter)
								: cultivarComboboxOptions;
						const value = String(column.getFilterValue() ?? "");
						const selected = cultivarComboboxOptions.find((opt) => opt.value === value) ?? null;
						return (
							<Combobox
								items={filteredCultivarOptions}
								value={selected}
								onValueChange={(item) => column.setFilterValue(item?.value ?? "")}
								itemToStringLabel={(o) => o.label}
								itemToStringValue={(o) => o.value}
								isItemEqualToValue={(a, b) => a.value === b.value}
							>
								<ComboboxInput
									className="w-full min-w-0"
									placeholder={`${m.common_all()} ${m.collections_cultivar_titlePlural().toLowerCase()}`}
									aria-label={m.filtering_filterBy({
										label: m.collections_cultivar_title().toLowerCase(),
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
						)
					},
				},
				cell: ({ row }) => (
					<span className="text-muted-foreground text-xs">{row.original.cultivar.characteristics.name}</span>
				),
			}),
			columnHelper.accessor((p) => p.description ?? "", {
				id: "description",
				header: ({ column }) => <DataTableColumnHeader column={column} title={m.fields_description()} />,
				filterFn: "includesString",
				enableGlobalFilter: false,
				cell: ({ row }) => (
					<span className="line-clamp-2 max-w-md whitespace-normal text-muted-foreground text-xs">
						{row.original.description || "-"}
					</span>
				),
			}),
			columnHelper.accessor((p) => p.createdAt.getTime(), {
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
			columnHelper.accessor(
				(p) =>
					plantPlacementFilterToken(
						getPlantPlacementSummary(spatialData?.items ?? [], String(p.id), allLocations),
					),
				{
					id: "placement",
					...tableListColumnSizes.placement,
					header: () => <span className={tableListPlacementHeaderInnerClass}>{m.fields_placement()}</span>,
					enableSorting: false,
					filterFn: (row, columnId, filterValue) => {
						const v = String(filterValue ?? "");
						if (v === "") return true;
						const cell = String(row.getValue(columnId));
						return cell === v;
					},
					enableGlobalFilter: false,
					meta: {
						headerClassName: tableListHeaderClasses.placement,
						cellClassName: tableListCellClasses.placement,
						filter: ({
							column,
						}: {
							column: { getFilterValue: () => unknown; setFilterValue: (v: string) => void };
						}) => (
							<div className="flex w-full min-w-0 items-center justify-start py-0.5">
								<TablePlacementFilterCombobox
									column={column}
									items={plantPlacementFilterItems}
									allPlaceholder={m.filtering_placedFilterAll()}
									emptyMessage={m.filtering_comboboxEmpty()}
									ariaLabel={m.filtering_filterBy({
										label: m.fields_placement().toLowerCase(),
									})}
								/>
							</div>
						),
					},
					cell: ({ row }) => (
						<TablePlacementCell
							mode="plant"
							summary={getPlantPlacementSummary(
								spatialData?.items ?? [],
								String(row.original.id),
								allLocations,
							)}
							unplacedAriaLabel={`${m.fields_placement()}: ${m.filtering_placedFilterUnplaced()}`}
						/>
					),
				},
			),
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
					<PlantRowActions plant={row.original} isPlaced={placedPlantIds.has(String(row.original.id))} />
				),
			}),
		],
		[
			allLocations,
			categoryLabelById,
			columnHelper,
			cultivarComboboxOptions,
			placedPlantIds,
			plantCategoryFilterOptions,
			plantPlacementFilterItems,
			plantSpeciesFilterOptions,
			spatialData?.items,
			speciesCategoryById,
		],
	)

	const table = useMemo(
		() =>
			createTable<HydratedPlantEntity>({
				data: items,
				columns,
				globalFilterFn: fuzzyFilter,
				getCoreRowModel: getCoreRowModel(),
				getFilteredRowModel: getFilteredRowModel(),
				getSortedRowModel: getSortedRowModel(),
				getRowId: (row) => String(row.id),
				onStateChange: () => undefined,
				onColumnFiltersChange,
				onGlobalFilterChange: setGlobalFilter,
				onRowSelectionChange: setRowSelection,
				onSortingChange: setSorting,
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
	)

	const filteredRowCount = table.getFilteredRowModel().rows.length;
	const selectedPlantIds = useMemo(
		() => table.getFilteredSelectedRowModel().rows.map((row) => row.original.id as PlantEntityId),
		[table],
	)
	const selectedPlantsEventInitialValues = useMemo<GardeningEventCreateDialogInitialValues>(
		() => ({
			target: "plants",
			plantIds: selectedPlantIds,
		}),
		[selectedPlantIds],
	)
	const selectionHasPlacedPlant = useMemo(
		() => selectedPlantIds.some((id) => placedPlantIds.has(String(id))),
		[placedPlantIds, selectedPlantIds],
	)
	const bulkCreateEventDisabled = selectedPlantIds.length === 0;
	const bulkDeleteManyDisabled = selectedPlantIds.length === 0 || selectionHasPlacedPlant;
	const bulkCreateEventTooltip = useMemo(
		() =>
			selectedPlantIds.length === 0
				? m.common_actionRequiresSelection()
				: m.collections_gardeningEvent_createFromTableSelection(),
		[selectedPlantIds.length],
	)
	const bulkDeleteManyTooltip = tableSelectionBulkTooltip({
		selectedCount: selectedPlantIds.length,
		hasPlacedInSelection: selectionHasPlacedPlant,
		enabledTooltip: m.collections_plant_deleteManyTooltip(),
	});
	const emptyMessage =
		items.length === 0
			? m.items_noElements()
			: filteredRowCount === 0
				? m.filtering_noFilteredElements()
				: m.items_noElements();

	return (
		<div className="flex min-h-0 flex-1 flex-col overflow-hidden">
			<PageHeading collection="plant">
				<h1 className="font-heading font-medium text-lg">{m.collections_plant_titlePlural()}</h1>
				<ButtonTooltip label={m.collections_plant_create()}>
					<Button type="button" size="icon" variant="outline" onClick={() => setCreateOpen(true)}>
						<span className="sr-only">{m.collections_plant_create()}</span>
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
						isPending={isPending}
						isError={isError}
						errorMessage={m.common_loadError()}
						emptyMessage={emptyMessage}
						selectedActions={
							<div className="flex flex-wrap items-center gap-2">
								<ButtonTooltip label={bulkCreateEventTooltip} disabled={bulkCreateEventDisabled}>
									<Button
										type="button"
										variant="outline"
										disabled={bulkCreateEventDisabled}
										onClick={() => setCreateEventOpen(true)}
									>
										{m.collections_gardeningEvent_create()}
									</Button>
								</ButtonTooltip>
								<ButtonTooltip label={bulkDeleteManyTooltip} disabled={bulkDeleteManyDisabled}>
									<Button
										type="button"
										variant="outline"
										disabled={bulkDeleteManyDisabled}
										onClick={() => setBulkDeleteOpen(true)}
									>
										{m.collections_plant_deleteMany()}
									</Button>
								</ButtonTooltip>
							</div>
						}
					/>
				</div>
			</PageContent>
			<PlantCreateDialog open={createOpen} onOpenChange={setCreateOpen} />
			<GardeningEventCreateDialog
				open={createEventOpen}
				onOpenChange={setCreateEventOpen}
				initialValues={selectedPlantsEventInitialValues}
			/>
			<DeleteConfirmDialog
				open={bulkDeleteOpen}
				onOpenChange={setBulkDeleteOpen}
				title={m.collections_plant_deleteMany()}
				description={m.collections_plant_deleteManyConfirmDescription({
					count: selectedPlantIds.length,
				})}
				isPending={bulkDeleteMany.isPending}
				onConfirm={async () => {
					await bulkDeleteMany.mutateAsync({ ids: selectedPlantIds });
					setBulkDeleteOpen(false);
					setRowSelection({});
				}}
			/>
		</div>
	)
}

function PlantRowActions({ plant, isPlaced }: { plant: HydratedPlantEntity; isPlaced: boolean }) {
	const [editOpen, setEditOpen] = useState(false);
	const [deleteOpen, setDeleteOpen] = useState(false);
	const [createEventOpen, setCreateEventOpen] = useState(false);
	const del = usePlantDeleteMutation();
	const title = getPlantDisplayTitle(plant);

	const deleteTitle = isPlaced ? m.common_deleteDisabledWhilePlaced() : m.common_delete();

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
						onSelect={() => setCreateEventOpen(true)}
						title={m.collections_gardeningEvent_createForPlantRowHint()}
					>
						<PlusIcon />
						{m.collections_gardeningEvent_create()}
					</DropdownMenuItem>
					<DropdownMenuItem onSelect={() => setEditOpen(true)} title={m.common_edit()}>
						<PencilIcon />
						{m.common_edit()}
					</DropdownMenuItem>

					{isPlaced ? (
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
				</DropdownMenuContent>
			</DropdownMenu>

			<PlantUpdateDialog plant={plant} open={editOpen} onOpenChange={setEditOpen} />
			<GardeningEventCreateDialog
				open={createEventOpen}
				onOpenChange={setCreateEventOpen}
				initialValues={{
					target: "plants",
					plantIds: [plant.id as PlantEntityId],
				}}
			/>
			<DeleteConfirmDialog
				open={deleteOpen}
				onOpenChange={setDeleteOpen}
				title={m.collections_plant_delete()}
				description={title}
				isPending={del.isPending}
				onConfirm={async () => {
					await del.mutateAsync({ id: plant.id });
					setDeleteOpen(false);
				}}
			/>
		</div>
	)
}
