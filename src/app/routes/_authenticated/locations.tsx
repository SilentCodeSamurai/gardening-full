import type { LocationEntityId } from "@backend/core/domain/gardening/entities";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
	createColumnHelper,
	createTable,
	getCoreRowModel,
	getFilteredRowModel,
	getSortedRowModel,
	type SortingState,
} from "@tanstack/react-table";
import { EllipsisVerticalIcon, PencilIcon, PlusIcon, Trash2Icon } from "lucide-react";
import { useMemo, useState } from "react";
import { DashboardPageContent } from "#/app/components/layout/dashboard-page-content";
import { DashboardPageHeading } from "#/app/components/layout/dashboard-page-heading";
import {
	GardeningEventCreateDialog,
	type GardeningEventCreateDialogInitialValues,
} from "@/components/gardening/gardening-event/gardening-event-create-dialog";
import { LocationCreateDialog } from "@/components/gardening/location/location-create-dialog";
import { LocationListCard } from "@/components/gardening/location/location-list-card";
import { LocationUpdateDialog } from "@/components/gardening/location/location-update-dialog";
import { LocationUpdateManyDialog } from "@/components/gardening/location/location-update-many-dialog";
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
import { useCollectionPageState } from "@/hooks/use-collection-table-state";
import { renderError } from "@/lib/render-error";
import { getLocationPlacementSummary, locationPlacementFilterToken } from "@/lib/spatial-placement-summary";
import { tableSelectionBulkTooltip } from "@/lib/table-selection-tooltips";
import { parseUrlColumnFilters } from "@/lib/table-url-filters";
import * as m from "@/paraglide/messages.js";
import { queryKeys } from "@/store/keys";
import { useLocationDeleteManyMutation, useLocationDeleteMutation } from "@/store/mutations";
import type { CachedLocation } from "@/store/query-cache-types";
import { isQueryObjectPending } from "@/store/query-object-status";
import { collectPlacedEntityIds } from "@/store/spatial-placement";

export const Route = createFileRoute("/_authenticated/locations")({
	validateSearch: (search: Record<string, unknown>) => {
		const next: { q?: string; sortBy?: string; sortDesc?: boolean; cf?: string } = {};
		if (typeof search.q === "string") next.q = search.q;
		if (typeof search.sortBy === "string") next.sortBy = search.sortBy;
		if (typeof search.sortDesc === "boolean") next.sortDesc = search.sortDesc;
		if (typeof search.cf === "string") next.cf = search.cf;
		return next;
	},
	component: LocationsPage,
});

const LOCATIONS_LIST_DEFAULT_SORTING: SortingState = [{ id: "name", desc: false }];

function LocationsPage() {
	const navigate = useNavigate({ from: Route.fullPath });
	const {
		q: qFromSearch,
		sortBy: sortByFromSearch,
		sortDesc: sortDescFromSearch,
		cf: cfFromSearch,
	} = Route.useSearch();
	const { data, isPending, isError, error } = useQuery({ ...queryKeys.location.all });
	const { data: spatialData } = useQuery({
		...queryKeys.spatial.allNodes,
		placeholderData: (previous) => previous,
	});

	const rootItems = useMemo(() => data?.items ?? [], [data?.items]);

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
		initialSorting: LOCATIONS_LIST_DEFAULT_SORTING,
	});

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
			{ id: "all", filter: "", label: m.filtering_placedFilterAll() },
			{ id: "unplaced", filter: "unplaced", label: m.filtering_placedFilterUnplaced() },
			{ id: "self", filter: "self", label: m.fields_placementRoot() },
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

	const [createOpen, setCreateOpen] = useState(false);
	const [createEventOpen, setCreateEventOpen] = useState(false);
	const [bulkUpdateOpen, setBulkUpdateOpen] = useState(false);
	const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
	const bulkDeleteMany = useLocationDeleteManyMutation();
	const columnHelper = useMemo(() => createColumnHelper<CachedLocation>(), []);
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
							aria-label={m.table_selectRow({ name: row.original.name })}
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
				header: ({ column }) => <DataTableColumnHeader column={column} title={m.fields_name()} />,
				filterFn: "includesString",
				enableGlobalFilter: false,
				meta: { displayRequired: true },
				cell: ({ row }) => (
					<Link
						to="/location/$locationId"
						params={{ locationId: String(row.original.id) }}
						data-action="location-row-open"
						data-id={String(row.original.id)}
						className="flex min-w-0 items-center gap-2 rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
					>
						<ItemPresentationIcon presentation={row.original.presentation} className="size-6 shrink-0" />
						<span className="truncate font-medium">{row.original.name}</span>
					</Link>
				),
			}),
			columnHelper.accessor(
				(loc) =>
					locationPlacementFilterToken(getLocationPlacementSummary(spatialData?.items ?? [], loc, rootItems)),
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
									items={locationPlacementFilterItems}
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
							mode="location"
							summary={getLocationPlacementSummary(spatialData?.items ?? [], row.original, rootItems)}
							rootLabel={m.fields_placementRoot()}
							unplacedAriaLabel={`${m.fields_placement()}: ${m.filtering_placedFilterUnplaced()}`}
						/>
					),
				},
			),
			columnHelper.accessor((location) => location.createdAt.getTime(), {
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
			createTable<CachedLocation>({
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
				onColumnVisibilityChange: setColumnVisibility,
				globalFilterFn: fuzzyFilter,
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
			rootItems,
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
	const selectedLocationIds = useMemo(
		() => table.getFilteredSelectedRowModel().rows.map((row) => row.original.id as LocationEntityId),
		[table],
	);
	const selectedLocations = useMemo(
		() => table.getFilteredSelectedRowModel().rows.map((row) => row.original),
		[table],
	);
	const selectionHasPlacedLocation = useMemo(
		() => selectedLocationIds.some((id) => placedLocationIds.has(String(id))),
		[placedLocationIds, selectedLocationIds],
	);
	const bulkLocationDeleteDisabled = selectedLocationIds.length === 0 || selectionHasPlacedLocation;
	const bulkLocationUpdateDisabled = selectedLocationIds.length === 0;
	const bulkLocationCreateEventDisabled =
		selectedLocationIds.length === 0 || selectionHasPlacedLocation || selectedLocationIds.length !== 1;
	const bulkCreateEventTooltip = tableSelectionBulkTooltip({
		selectedCount: selectedLocationIds.length,
		hasPlacedInSelection: selectionHasPlacedLocation,
		whenMoreThanOne: "pickSingleLocationForEvent",
		enabledTooltip: m.collections_gardeningEvent_createFromTableLocationSelection(),
	});
	const bulkDeleteManyTooltip = tableSelectionBulkTooltip({
		selectedCount: selectedLocationIds.length,
		hasPlacedInSelection: selectionHasPlacedLocation,
		enabledTooltip: m.collections_location_deleteManyTooltip(),
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
			? m.items_noElements()
			: filteredRowCount === 0
				? m.filtering_noFilteredElements()
				: m.items_noElements();
	return (
		<div id="locations-page" className="flex min-h-0 flex-1 flex-col overflow-hidden">
			<DashboardPageHeading
				collection="location"
				viewModeToggle={{ value: viewMode, onValueChange: setViewMode }}
			>
				<h1 className="font-heading font-medium text-lg" id="page-title">
					{m.collections_location_titlePlural()}
				</h1>
				<ButtonTooltip label={m.collections_location_create()}>
					<Button
						id="locations-create-trigger"
						type="button"
						size="icon"
						variant="outline"
						onClick={() => setCreateOpen(true)}
					>
						<span className="sr-only">{m.collections_location_create()}</span>
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
						listDefaultSorting={LOCATIONS_LIST_DEFAULT_SORTING}
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
										{m.collections_gardeningEvent_create()}
									</Button>
								</ButtonTooltip>
								<Button
									type="button"
									variant="outline"
									disabled={bulkLocationUpdateDisabled}
									onClick={() => setBulkUpdateOpen(true)}
								>
									{m.common_updateSelected()}
								</Button>
								<ButtonTooltip label={bulkDeleteManyTooltip} disabled={bulkLocationDeleteDisabled}>
									<Button
										type="button"
										variant="outline"
										disabled={bulkLocationDeleteDisabled}
										onClick={() => setBulkDeleteOpen(true)}
									>
										{m.collections_location_deleteMany()}
									</Button>
								</ButtonTooltip>
							</div>
						}
						renderListItem={(row) => (
							<LocationListCard
								location={row.original}
								placementSummary={getLocationPlacementSummary(
									spatialData?.items ?? [],
									row.original,
									rootItems,
								)}
								isPlaced={placedLocationIds.has(String(row.original.id))}
								selected={row.getIsSelected()}
								onSelectedChange={(checked) => row.toggleSelected(checked)}
							/>
						)}
					/>
				</div>
			</DashboardPageContent>
			<LocationCreateDialog open={createOpen} onOpenChange={setCreateOpen} />
			<LocationUpdateManyDialog
				open={bulkUpdateOpen}
				onOpenChange={setBulkUpdateOpen}
				items={selectedLocations}
			/>
			<GardeningEventCreateDialog
				open={createEventOpen}
				onOpenChange={setCreateEventOpen}
				initialValues={selectedSingleLocationEventInitialValues}
			/>
			<DeleteConfirmDialog
				open={bulkDeleteOpen}
				onOpenChange={setBulkDeleteOpen}
				title={m.collections_location_deleteMany()}
				description={m.collections_location_deleteManyConfirmDescription({
					count: selectedLocationIds.length,
				})}
				isPending={bulkDeleteMany.isPending}
				onConfirm={async () => {
					setBulkDeleteOpen(false);
					setRowSelection({});
					await bulkDeleteMany.mutateAsync({ ids: selectedLocationIds });
				}}
			/>
		</div>
	);
}

function LocationRowActions({ location, isPlaced }: { location: CachedLocation; isPlaced: boolean }) {
	const [editOpen, setEditOpen] = useState(false);
	const [deleteOpen, setDeleteOpen] = useState(false);
	const [createEventOpen, setCreateEventOpen] = useState(false);
	const del = useLocationDeleteMutation();
	const syncPending = isQueryObjectPending(location);

	const deleteTitle = isPlaced
		? m.common_deleteDisabledWhilePlaced()
		: syncPending
			? m.common_editDisabledPendingSync()
			: m.common_delete();
	const actionLocked = syncPending;

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
						disabled={actionLocked}
						title={
							actionLocked
								? m.common_editDisabledPendingSync()
								: m.collections_gardeningEvent_createForLocationRowHint()
						}
						onSelect={() => setCreateEventOpen(true)}
					>
						<PlusIcon />
						{m.collections_gardeningEvent_create()}
					</DropdownMenuItem>
					<DropdownMenuItem
						disabled={actionLocked}
						title={actionLocked ? m.common_editDisabledPendingSync() : m.common_edit()}
						onSelect={() => setEditOpen(true)}
					>
						<PencilIcon />
						{m.common_edit()}
					</DropdownMenuItem>

					{isPlaced || actionLocked ? (
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
				title={m.collections_location_delete()}
				description={location.name}
				isPending={del.isPending}
				onConfirm={async () => {
					setDeleteOpen(false);
					await del.mutateAsync({ id: location.id });
				}}
			/>
		</div>
	);
}
