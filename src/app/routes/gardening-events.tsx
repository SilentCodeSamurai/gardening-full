import type { GardeningEventEntity, GardeningEventEntityId } from "@backend/core/domain/gardening/entities";
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
import { GardeningActionPresentationIcon } from "@/components/gardening/gardening-action-icon";
import { GardeningEventCreateDialog } from "@/components/gardening/gardening-event/gardening-event-create-dialog";
import { GardeningEventUpdateDialog } from "@/components/gardening/gardening-event/gardening-event-update-dialog";
import { DeleteConfirmDialog } from "@/components/gardening/shared/delete-confirm-dialog";
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
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { tableSelectionBulkTooltip } from "@/lib/table-selection-tooltips";
import * as m from "@/paraglide/messages.js";
import { queryKeys } from "@/store/keys";
import { useGardeningEventDeleteManyMutation, useGardeningEventDeleteMutation } from "@/store/mutations";

export const Route = createFileRoute("/gardening-events")({
	component: GardeningEventsPage,
});

function GardeningEventsPage() {
	const { data, isPending, isError } = useQuery({ ...queryKeys.gardeningEvent.all });
	const items = useMemo(() => data?.items ?? [], [data?.items]);
	const [createOpen, setCreateOpen] = useState(false);

	const [sorting, setSorting] = useState<SortingState>([{ id: "createdAt", desc: true }]);
	const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
	const [globalFilter, setGlobalFilter] = useState("");
	const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
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
				(event) =>
					`${event.action.type} ${m[`gardeningActions.${event.action.type}` as keyof typeof m]()} ${event.action.content ?? ""}`,
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
				header: ({ column }) => <DataTableColumnHeader column={column} title={m["fields.title"]()} />,
				filterFn: "includesString",
				enableGlobalFilter: false,
				cell: ({ row }) => {
					const actionLabel = m[`gardeningActions.${row.original.action.type}` as keyof typeof m]();
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
				header: ({ column }) => <DataTableColumnHeader column={column} title={m["fields.description"]()} />,
				filterFn: "includesString",
				enableGlobalFilter: false,
				cell: ({ row }) => (
					<span className="line-clamp-2 text-muted-foreground text-xs">
						{row.original.action.content || "-"}
					</span>
				),
			}),
			columnHelper.accessor((event) => event.createdAt.getTime(), {
				id: "createdAt",
				header: ({ column }) => <DataTableColumnHeader column={column} title={m["sorting.newestFirst"]()} />,
				sortingFn: "basic",
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
				cell: ({ row }) => <GardeningEventRowActions event={row.original} />,
			}),
		],
		[columnHelper, t],
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
	const selectedEventIds = useMemo(
		() => table.getFilteredSelectedRowModel().rows.map((row) => row.original.id as GardeningEventEntityId),
		[table],
	);
	const bulkDeleteEventsDisabled = selectedEventIds.length === 0;
	const bulkDeleteManyTooltip = tableSelectionBulkTooltip({
		selectedCount: selectedEventIds.length,
		hasPlacedInSelection: false,
		enabledTooltip: m["collections.gardeningEvent.deleteManyTooltip"](),
	});

	return (
		<div className="flex min-h-0 flex-1 flex-col overflow-hidden">
			<PageHeading collection="gardeningEvent">
				<h1 className="font-heading font-medium text-lg">{m["collections.gardeningEvent.titlePlural"]()}</h1>
				<ButtonTooltip label={m["collections.gardeningEvent.create"]()}>
					<Button type="button" size="icon" variant="outline" onClick={() => setCreateOpen(true)}>
						<span className="sr-only">{m["collections.gardeningEvent.create"]()}</span>
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
						emptyMessage={m["items.noElements"]()}
						selectedActions={
							<div className="flex flex-wrap items-center gap-2">
								<ButtonTooltip label={bulkDeleteManyTooltip} disabled={bulkDeleteEventsDisabled}>
									<Button
										type="button"
										variant="outline"
										disabled={bulkDeleteEventsDisabled}
										onClick={() => setBulkDeleteOpen(true)}
									>
										{m["collections.gardeningEvent.deleteMany"]()}
									</Button>
								</ButtonTooltip>
							</div>
						}
					/>
				</div>
			</PageContent>
			<GardeningEventCreateDialog open={createOpen} onOpenChange={setCreateOpen} />
			<DeleteConfirmDialog
				open={bulkDeleteOpen}
				onOpenChange={setBulkDeleteOpen}
				title={m["collections.gardeningEvent.deleteMany"]()}
				description={m["collections.gardeningEvent.deleteManyConfirmDescription"]({
					count: selectedEventIds.length,
				})}
				isPending={bulkDeleteMany.isPending}
				onConfirm={async () => {
					await bulkDeleteMany.mutateAsync({ ids: selectedEventIds });
					setBulkDeleteOpen(false);
					setRowSelection({});
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
				</DropdownMenuContent>
			</DropdownMenu>
			<GardeningEventUpdateDialog event={event} open={editOpen} onOpenChange={setEditOpen} />
			<DeleteConfirmDialog
				open={deleteOpen}
				onOpenChange={setDeleteOpen}
				title={m["collections.gardeningEvent.delete"]()}
				description={m[`gardeningActions.${event.action.type}` as keyof typeof m]()}
				isPending={del.isPending}
				onConfirm={async () => {
					await del.mutateAsync({ id: event.id });
					setDeleteOpen(false);
				}}
			/>
		</div>
	);
}
