import type { GardeningEventEntity, GardeningEventEntityId } from "@backend/core/domain/gardening/entities";
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
import { GardeningActionPresentationIcon } from "@/components/gardening/gardening-action-icon";
import { GardeningEventCreateDialog } from "@/components/gardening/gardening-event/gardening-event-create-dialog";
import { GardeningEventListCard } from "@/components/gardening/gardening-event/gardening-event-list-card";
import { GardeningEventUpdateDialog } from "@/components/gardening/gardening-event/gardening-event-update-dialog";
import { GardeningEventUpdateManyDialog } from "@/components/gardening/gardening-event/gardening-event-update-many-dialog";
import { DeleteConfirmDialog } from "@/components/gardening/shared/delete-confirm-dialog";
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
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useCollectionPageState } from "@/hooks/use-collection-table-state";
import { gardeningActionMessage } from "@/lib/gardening-action-messages";
import { renderError } from "@/lib/render-error";
import { tableSelectionBulkTooltip } from "@/lib/table-selection-tooltips";
import { parseUrlColumnFilters } from "@/lib/table-url-filters";
import * as m from "@/paraglide/messages.js";
import { getLocale } from "@/paraglide/runtime";
import { queryKeys } from "@/store/keys";
import { useGardeningEventDeleteManyMutation, useGardeningEventDeleteMutation } from "@/store/mutations";

export const Route = createFileRoute("/_authenticated/gardening-events")({
	validateSearch: (search: Record<string, unknown>) => {
		const next: { q?: string; sortBy?: string; sortDesc?: boolean; cf?: string } = {};
		if (typeof search.q === "string") next.q = search.q;
		if (typeof search.sortBy === "string") next.sortBy = search.sortBy;
		if (typeof search.sortDesc === "boolean") next.sortDesc = search.sortDesc;
		if (typeof search.cf === "string") next.cf = search.cf;
		return next;
	},
	component: GardeningEventsPage,
});

const GARDENING_EVENTS_LIST_DEFAULT_SORTING: SortingState = [{ id: "occurredAt", desc: true }];

function GardeningEventsPage() {
	const navigate = useNavigate({ from: Route.fullPath });
	const search = Route.useSearch();
	const { data, isPending, isError, error } = useQuery({ ...queryKeys.gardeningEvent.all });
	const items = useMemo(() => data?.items ?? [], [data?.items]);
	const [createOpen, setCreateOpen] = useState(false);

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
		initialSortId: "occurredAt",
		searchQ: search.q,
		searchSortBy: search.sortBy,
		searchSortDesc: search.sortDesc,
		initialColumnFilters: () => parseUrlColumnFilters(search.cf),
		navigate,
		urlSearch: {
			q: search.q,
			sortBy: search.sortBy,
			sortDesc: search.sortDesc,
			cf: search.cf,
		},
		initialSorting: GARDENING_EVENTS_LIST_DEFAULT_SORTING,
	});
	const [bulkUpdateOpen, setBulkUpdateOpen] = useState(false);
	const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
	const bulkDeleteMany = useGardeningEventDeleteManyMutation();
	const columnHelper = useMemo(() => createColumnHelper<GardeningEventEntity>(), []);
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
					const event = row.original;
					const actionLabel = gardeningActionMessage(event.action.type);
					const when =
						event.occurredAt === null
							? m.common_unknown()
							: event.occurredAt.toLocaleString(getLocale(), {
									dateStyle: "short",
									timeStyle: "short",
								});
					return (
						<div className={tableListCompactHeaderInnerClass}>
							<Checkbox
								aria-label={m.table_selectRow({ name: `${actionLabel}, ${when}` })}
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
				(event) =>
					`${event.action.type} ${gardeningActionMessage(event.action.type)} ${event.action.content ?? ``}`,
				{
					id: "globalSearch",
					enableColumnFilter: false,
					enableSorting: false,
					enableGlobalFilter: true,
					header: () => null,
					cell: () => null,
				},
			),
			columnHelper.accessor((event) => event.action.type, {
				id: "actionType",
				...tableListColumnSizes.primaryLink,
				header: ({ column }) => <DataTableColumnHeader column={column} title={m.fields_title()} />,
				filterFn: "includesString",
				enableGlobalFilter: false,
				meta: { displayRequired: true },
				cell: ({ row }) => {
					const actionLabel = gardeningActionMessage(row.original.action.type);
					return (
						<Link
							to="/gardening-event/$gardeningEventId"
							params={{ gardeningEventId: String(row.original.id) }}
							className="flex min-w-0 items-center gap-2 rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
						>
							<GardeningActionPresentationIcon action={row.original.action} />
							<p className="truncate font-medium capitalize">{actionLabel}</p>
						</Link>
					);
				},
			}),
			columnHelper.accessor((event) => event.action.content ?? "", {
				id: "content",
				header: ({ column }) => <DataTableColumnHeader column={column} title={m.fields_description()} />,
				filterFn: "includesString",
				enableGlobalFilter: false,
				cell: ({ row }) => (
					<span className="line-clamp-2 text-muted-foreground text-xs">
						{row.original.action.content || "-"}
					</span>
				),
			}),
			columnHelper.accessor((event) => event.occurredAt?.getTime() ?? 0, {
				id: "occurredAt",
				header: ({ column }) => <DataTableColumnHeader column={column} title={m.fields_occurredAt()} />,
				sortingFn: "basic",
				enableColumnFilter: false,
				enableGlobalFilter: false,
				cell: ({ row }) => (
					<span className="text-muted-foreground text-xs">
						{row.original.occurredAt === null
							? m.common_unknown()
							: row.original.occurredAt.toLocaleString(undefined, {
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
				cell: ({ row }) => <GardeningEventRowActions event={row.original} />,
			}),
		],
		[columnHelper],
	);
	const table = useMemo(
		() =>
			createTable<GardeningEventEntity>({
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
	const selectedEventIds = useMemo(
		() => table.getFilteredSelectedRowModel().rows.map((row) => row.original.id as GardeningEventEntityId),
		[table],
	);
	const selectedEvents = useMemo(() => table.getFilteredSelectedRowModel().rows.map((row) => row.original), [table]);
	const bulkUpdateEventsDisabled = selectedEventIds.length === 0;
	const bulkDeleteEventsDisabled = selectedEventIds.length === 0;
	const bulkDeleteManyTooltip = tableSelectionBulkTooltip({
		selectedCount: selectedEventIds.length,
		hasPlacedInSelection: false,
		enabledTooltip: m.collections_gardeningEvent_deleteManyTooltip(),
	});
	return (
		<div id="events-page" className="flex min-h-0 flex-1 flex-col overflow-hidden">
			<DashboardPageHeading
				collection="gardeningEvent"
				viewModeToggle={{ value: viewMode, onValueChange: setViewMode }}
			>
				<h1 className="font-heading font-medium text-lg" id="page-title">
					{m.collections_gardeningEvent_titlePlural()}
				</h1>
				<ButtonTooltip label={m.collections_gardeningEvent_create()}>
					<Button type="button" size="icon" variant="outline" onClick={() => setCreateOpen(true)}>
						<span className="sr-only">{m.collections_gardeningEvent_create()}</span>
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
						emptyMessage={m.items_noElements()}
						globalSearch={buildCollectionGlobalSearch({
							globalFilter,
							setGlobalFilter,
							setColumnFilters,
							setRowSelection,
						})}
						highlightPendingRows
						listDefaultSorting={GARDENING_EVENTS_LIST_DEFAULT_SORTING}
						selectedActions={
							<div className="flex flex-wrap items-center gap-2">
								<Button
									type="button"
									variant="outline"
									disabled={bulkUpdateEventsDisabled}
									onClick={() => setBulkUpdateOpen(true)}
								>
									{m.common_updateSelected()}
								</Button>
								<ButtonTooltip label={bulkDeleteManyTooltip} disabled={bulkDeleteEventsDisabled}>
									<Button
										type="button"
										variant="outline"
										disabled={bulkDeleteEventsDisabled}
										onClick={() => setBulkDeleteOpen(true)}
									>
										{m.collections_gardeningEvent_deleteMany()}
									</Button>
								</ButtonTooltip>
							</div>
						}
						renderListItem={(row) => (
							<GardeningEventListCard
								event={row.original}
								selected={row.getIsSelected()}
								onSelectedChange={(checked) => row.toggleSelected(checked)}
							/>
						)}
					/>
				</div>
			</DashboardPageContent>
			<GardeningEventCreateDialog open={createOpen} onOpenChange={setCreateOpen} />
			<GardeningEventUpdateManyDialog
				open={bulkUpdateOpen}
				onOpenChange={setBulkUpdateOpen}
				items={selectedEvents}
			/>
			<DeleteConfirmDialog
				open={bulkDeleteOpen}
				onOpenChange={setBulkDeleteOpen}
				title={m.collections_gardeningEvent_deleteMany()}
				description={m.collections_gardeningEvent_deleteManyConfirmDescription({
					count: selectedEventIds.length,
				})}
				isPending={bulkDeleteMany.isPending}
				onConfirm={async () => {
					setBulkDeleteOpen(false);
					setRowSelection({});
					await bulkDeleteMany.mutateAsync({ ids: selectedEventIds });
				}}
			/>
		</div>
	);
}

function GardeningEventRowActions({ event }: { event: GardeningEventEntity }) {
	const [editOpen, setEditOpen] = useState(false);
	const [deleteOpen, setDeleteOpen] = useState(false);
	const del = useGardeningEventDeleteMutation();

	return (
		<div className="flex w-full items-center justify-center">
			<DropdownMenu>
				<DropdownMenuTrigger asChild>
					<Button type="button" variant="outline" size="icon" aria-label={m.common_actions()}>
						<EllipsisVerticalIcon />
					</Button>
				</DropdownMenuTrigger>
				<DropdownMenuContent className="flex flex-col gap-1" align="end">
					<DropdownMenuItem onSelect={() => setEditOpen(true)} title={m.common_edit()}>
						<PencilIcon />
						{m.common_edit()}
					</DropdownMenuItem>
					<DropdownMenuItem onSelect={() => setDeleteOpen(true)} title={m.common_delete()}>
						<Trash2Icon />
						{m.common_delete()}
					</DropdownMenuItem>
				</DropdownMenuContent>
			</DropdownMenu>
			<GardeningEventUpdateDialog event={event} open={editOpen} onOpenChange={setEditOpen} />
			<DeleteConfirmDialog
				open={deleteOpen}
				onOpenChange={setDeleteOpen}
				title={m.collections_gardeningEvent_delete()}
				description={gardeningActionMessage(event.action.type)}
				isPending={del.isPending}
				onConfirm={async () => {
					setDeleteOpen(false);
					await del.mutateAsync({ id: event.id });
				}}
			/>
		</div>
	);
}
