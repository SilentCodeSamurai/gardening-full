import type { LocationEntity, LocationEntityId } from "@backend/core/domain/gardening/entities";
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
import { EllipsisVerticalIcon, PencilIcon, PlusIcon, Trash2Icon, XIcon } from "lucide-react";
import { useMemo, useState } from "react";
import {
	GardeningEventCreateDialog,
	type GardeningEventCreateDialogInitialValues,
} from "@/components/gardening/gardening-event/gardening-event-create-dialog";
import { LocationCreateDialog } from "@/components/gardening/location/location-create-dialog";
import { LocationUpdateDialog } from "@/components/gardening/location/location-update-dialog";
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
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { getLocationPlacementSummary, locationPlacementFilterToken } from "@/lib/spatial-placement-summary";
import { tableSelectionBulkTooltip } from "@/lib/table-selection-tooltips";
import * as m from "@/paraglide/messages.js";
import { queryKeys } from "@/store/keys";
import { useLocationDeleteManyMutation, useLocationDeleteMutation } from "@/store/mutations";
import { collectPlacedEntityIds } from "@/store/spatial-placement";

export const Route = createFileRoute("/locations")({
	component: LocationsPage,
});

function LocationsPage() {
	const { data, isPending, isError } = useQuery({ ...queryKeys.location.all });
	const { data: spatialData } = useQuery({
		...queryKeys.spatial.allNodes,
		placeholderData: (previous) => previous,
	});

	const rootItems = useMemo(() => data?.items ?? [], [data?.items]);

	const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);

	const locationParentIdsFromTable = useMemo(() => {
		const spatial = spatialData?.items ?? [];
		const ids = new Set<string>();
		for (const loc of rootItems) {
			const s = getLocationPlacementSummary(spatial, loc, rootItems);
			if (s.kind === "underParent") ids.add(s.parentLocationId);
		}
		return ids;
	}, [rootItems, spatialData?.items]);

	const placementColumnFilterRaw = useMemo(
		() => String(columnFilters.find((f) => f.id === "placement")?.value ?? ""),
		[columnFilters],
	);

	const locationPlacementFilterItems = useMemo((): PlacementFilterComboboxItem[] => {
		const parentIds = new Set(locationParentIdsFromTable);
		if (placementColumnFilterRaw.startsWith("under:")) {
			parentIds.add(placementColumnFilterRaw.slice("under:".length));
		}
		const underLocs = rootItems
			.filter((l) => parentIds.has(String(l.id)))
			.sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" }));
		return [
			{ id: "all", filter: "", label: m["filtering.placedFilterAll"]() },
			{ id: "unplaced", filter: "unplaced", label: m["filtering.placedFilterUnplaced"]() },
			{ id: "self", filter: "self", label: m["fields.placementRoot"]() },
			...underLocs.map((loc) => ({
				id: `under-${String(loc.id)}`,
				filter: `under:${String(loc.id)}`,
				label: loc.name,
				presentation: loc.presentation,
			})),
		];
	}, [locationParentIdsFromTable, placementColumnFilterRaw, rootItems]);

	const placedLocationIds = useMemo(
		() => collectPlacedEntityIds(spatialData?.items ?? [], "location"),
		[spatialData?.items],
	);

	const [sorting, setSorting] = useState<SortingState>([{ id: "name", desc: false }]);
	const [globalFilter, setGlobalFilter] = useState("");
	const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
	const [createOpen, setCreateOpen] = useState(false);
	const [createEventOpen, setCreateEventOpen] = useState(false);
	const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
	const bulkDeleteMany = useLocationDeleteManyMutation();
	const columnHelper = useMemo(() => createColumnHelper<LocationEntity>(), []);
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
			columnHelper.accessor((location) => `${location.name} ${location.createdAt.toISOString()}`, {
				id: "globalSearch",
				enableColumnFilter: false,
				enableSorting: false,
				enableGlobalFilter: true,
				header: () => null,
				cell: () => null,
			}),
			columnHelper.accessor("name", {
				id: "name",
				...tableListColumnSizes.primaryLink,
				header: ({ column }) => <DataTableColumnHeader column={column} title={m["fields.name"]()} />,
				filterFn: "includesString",
				enableGlobalFilter: false,
				cell: ({ row }) => (
					<Link
						to="/location/$locationId"
						params={{ locationId: String(row.original.id) }}
						className="flex min-w-0 items-center gap-2 rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
					>
						<ItemPresentationIcon presentation={row.original.presentation} className="size-6 shrink-0" />
						<span className="truncate font-medium">{row.original.name}</span>
					</Link>
				),
			}),
			columnHelper.accessor((location) => location.createdAt.getTime(), {
				id: "createdAt",
				header: ({ column }) => <DataTableColumnHeader column={column} title={m["sorting.newestFirst"]()} />,
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
				(loc) =>
					locationPlacementFilterToken(getLocationPlacementSummary(spatialData?.items ?? [], loc, rootItems)),
				{
					id: "placement",
					...tableListColumnSizes.placement,
					header: () => <span className={tableListPlacementHeaderInnerClass}>{m["fields.placement"]()}</span>,
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
									items={locationPlacementFilterItems}
									allPlaceholder={m["filtering.placedFilterAll"]()}
									emptyMessage={m["filtering.comboboxEmpty"]()}
									ariaLabel={m["filtering.filterBy"]({
										label: m["fields.placement"]().toLowerCase(),
									})}
								/>
							</div>
						),
					},
					cell: ({ row }) => (
						<TablePlacementCell
							mode="location"
							summary={getLocationPlacementSummary(spatialData?.items ?? [], row.original, rootItems)}
							rootLabel={m["fields.placementRoot"]()}
							unplacedAriaLabel={`${m["fields.placement"]()}: ${m["filtering.placedFilterUnplaced"]()}`}
						/>
					),
				},
			),
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
				cell: ({ row }) => (
					<LocationRowActions
						location={row.original}
						isPlaced={placedLocationIds.has(String(row.original.id))}
					/>
				),
			}),
		],
		[columnHelper, locationPlacementFilterItems, placedLocationIds, rootItems, spatialData?.items],
	);
	const table = useMemo(
		() =>
			createTable<LocationEntity>({
				data: rootItems,
				columns,
				getCoreRowModel: getCoreRowModel(),
				getFilteredRowModel: getFilteredRowModel(),
				getSortedRowModel: getSortedRowModel(),
				getRowId: (row) => String(row.id),
				onStateChange: () => undefined,
				onSortingChange: setSorting,
				onColumnFiltersChange: setColumnFilters,
				onGlobalFilterChange: setGlobalFilter,
				onRowSelectionChange: setRowSelection,
				globalFilterFn: fuzzyFilter,
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
		[columnFilters, columns, globalFilter, rootItems, rowSelection, sorting],
	);

	const filteredRowCount = table.getFilteredRowModel().rows.length;
	const selectedLocationIds = useMemo(
		() => table.getFilteredSelectedRowModel().rows.map((row) => row.original.id as LocationEntityId),
		[table],
	);
	const selectionHasPlacedLocation = useMemo(
		() => selectedLocationIds.some((id) => placedLocationIds.has(String(id))),
		[placedLocationIds, selectedLocationIds],
	);
	const bulkLocationDeleteDisabled = selectedLocationIds.length === 0 || selectionHasPlacedLocation;
	const bulkLocationCreateEventDisabled =
		selectedLocationIds.length === 0 || selectionHasPlacedLocation || selectedLocationIds.length !== 1;
	const bulkCreateEventTooltip = tableSelectionBulkTooltip({
		selectedCount: selectedLocationIds.length,
		hasPlacedInSelection: selectionHasPlacedLocation,
		whenMoreThanOne: "pickSingleLocationForEvent",
		enabledTooltip: m["collections.gardeningEvent.createFromTableLocationSelection"](),
	});
	const bulkDeleteManyTooltip = tableSelectionBulkTooltip({
		selectedCount: selectedLocationIds.length,
		hasPlacedInSelection: selectionHasPlacedLocation,
		enabledTooltip: m["collections.location.deleteManyTooltip"](),
	});
	const selectedSingleLocationEventInitialValues = useMemo<
		GardeningEventCreateDialogInitialValues | undefined
	>(() => {
		if (selectedLocationIds.length !== 1) return undefined;
		const only = selectedLocationIds[0];
		return only ? { target: "location" as const, locationId: only } : undefined;
	}, [selectedLocationIds]);

	const emptyMessage =
		rootItems.length === 0
			? m["items.noElements"]()
			: filteredRowCount === 0
				? m["filtering.noFilteredElements"]()
				: m["items.noElements"]();

	return (
		<div className="flex min-h-0 flex-1 flex-col overflow-hidden">
			<PageHeading collection="location">
				<h1 className="font-heading font-medium text-lg">{m["collections.location.titlePlural"]()}</h1>
				<ButtonTooltip label={m["collections.location.create"]()}>
					<Button type="button" size="icon" variant="outline" onClick={() => setCreateOpen(true)}>
						<span className="sr-only">{m["collections.location.create"]()}</span>
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
						selectedActions={
							<div className="flex flex-wrap items-center gap-2">
								<ButtonTooltip
									label={bulkCreateEventTooltip}
									disabled={bulkLocationCreateEventDisabled}
								>
									<Button
										type="button"
										variant="outline"
										disabled={bulkLocationCreateEventDisabled}
										onClick={() => setCreateEventOpen(true)}
									>
										{m["collections.gardeningEvent.create"]()}
									</Button>
								</ButtonTooltip>
								<ButtonTooltip label={bulkDeleteManyTooltip} disabled={bulkLocationDeleteDisabled}>
									<Button
										type="button"
										variant="outline"
										disabled={bulkLocationDeleteDisabled}
										onClick={() => setBulkDeleteOpen(true)}
									>
										{m["collections.location.deleteMany"]()}
									</Button>
								</ButtonTooltip>
							</div>
						}
					/>
				</div>
			</PageContent>
			<LocationCreateDialog open={createOpen} onOpenChange={setCreateOpen} />
			<GardeningEventCreateDialog
				open={createEventOpen}
				onOpenChange={setCreateEventOpen}
				initialValues={selectedSingleLocationEventInitialValues}
			/>
			<DeleteConfirmDialog
				open={bulkDeleteOpen}
				onOpenChange={setBulkDeleteOpen}
				title={m["collections.location.deleteMany"]()}
				description={m["collections.location.deleteManyConfirmDescription"]({
					count: selectedLocationIds.length,
				})}
				isPending={bulkDeleteMany.isPending}
				onConfirm={async () => {
					await bulkDeleteMany.mutateAsync({ ids: selectedLocationIds });
					setBulkDeleteOpen(false);
					setRowSelection({});
				}}
			/>
		</div>
	);
}

function LocationRowActions({ location, isPlaced }: { location: LocationEntity; isPlaced: boolean }) {
	const [editOpen, setEditOpen] = useState(false);
	const [deleteOpen, setDeleteOpen] = useState(false);
	const [createEventOpen, setCreateEventOpen] = useState(false);
	const del = useLocationDeleteMutation();

	const deleteTitle = isPlaced ? m["common.deleteDisabledWhilePlaced"]() : m["common.delete"]();

	return (
		<div className="flex w-full items-center justify-center">
			<DropdownMenu>
				<DropdownMenuTrigger asChild>
					<Button type="button" variant="outline" size="icon" aria-label={m["common.actions"]()}>
						<EllipsisVerticalIcon />
					</Button>
				</DropdownMenuTrigger>
				<DropdownMenuContent className="flex flex-col gap-1" align="end">
					<DropdownMenuItem
						onSelect={() => setCreateEventOpen(true)}
						title={m["collections.gardeningEvent.createForLocationRowHint"]()}
					>
						<PlusIcon />
						{m["collections.gardeningEvent.create"]()}
					</DropdownMenuItem>
					<DropdownMenuItem onSelect={() => setEditOpen(true)} title={m["common.edit"]()}>
						<PencilIcon />
						{m["common.edit"]()}
					</DropdownMenuItem>

					{isPlaced ? (
						<ButtonTooltip label={deleteTitle} disabled>
							<DropdownMenuItem disabled title={deleteTitle}>
								<Trash2Icon />
								{m["common.delete"]()}
							</DropdownMenuItem>
						</ButtonTooltip>
					) : (
						<DropdownMenuItem onSelect={() => setDeleteOpen(true)} title={deleteTitle}>
							<Trash2Icon />
							{m["common.delete"]()}
						</DropdownMenuItem>
					)}
				</DropdownMenuContent>
			</DropdownMenu>

			<LocationUpdateDialog location={location} open={editOpen} onOpenChange={setEditOpen} />
			<GardeningEventCreateDialog
				open={createEventOpen}
				onOpenChange={setCreateEventOpen}
				initialValues={{
					target: "location",
					locationId: location.id as LocationEntityId,
				}}
			/>
			<DeleteConfirmDialog
				open={deleteOpen}
				onOpenChange={setDeleteOpen}
				title={m["collections.location.delete"]()}
				description={location.name}
				isPending={del.isPending}
				onConfirm={async () => {
					await del.mutateAsync({ id: location.id });
					setDeleteOpen(false);
				}}
			/>
		</div>
	);
}
