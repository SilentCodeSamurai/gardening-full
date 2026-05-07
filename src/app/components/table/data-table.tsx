import { type Column, flexRender, type RowData, type Table as TanstackTable } from "@tanstack/react-table";
import { useVirtualizer } from "@tanstack/react-virtual";
import { SlidersHorizontalIcon } from "lucide-react";
import type { ReactNode } from "react";
import { useCallback, useRef } from "react";
import { PageLoading } from "@/components/layout/page-loading";
import { TableGlobalSearch } from "@/components/table/table-global-search";
import { TABLE_LIST_SELECT_COLUMN_WIDTH_PX } from "@/components/table/table-list-column-sizes";
import { Button } from "@/components/ui/button";
import { ButtonTooltip } from "@/components/ui/button-tooltip";
import { DebouncedInput } from "@/components/ui/debounced-input";
import {
	DropdownMenu,
	DropdownMenuCheckboxItem,
	DropdownMenuContent,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { pendingItemSurfaceClassName } from "@/components/ui/pending-item-surface";
import { TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import * as m from "@/paraglide/messages.js";
import { isQueryObjectPending } from "@/store/query-object-status";

type DataTableProps<TData extends RowData> = {
	table: TanstackTable<TData>;
	isPending: boolean;
	isError: boolean;
	errorMessage: string;
	emptyMessage: string;
	selectedLabel?: string;
	selectedActions?: ReactNode;
	globalSearch?: {
		value: string;
		onValueChange: (value: string) => void;
		onClearFilters: () => void;
		searchPlaceholder: string;
		clearSearchLabel: string;
		clearFiltersLabel: string;
		trailingActions?: ReactNode;
	};
	/** When true, rows with {@link isQueryObjectPending} originals get a left accent and tinted background. */
	highlightPendingRows?: boolean;
};

type ColumnFilterRenderer<TData extends RowData> = (ctx: {
	table: TanstackTable<TData>;
	column: Column<TData, unknown>;
}) => ReactNode;

type ColumnMeta<TData extends RowData> =
	| {
			filter?: ColumnFilterRenderer<TData>;
			headerClassName?: string;
			cellClassName?: string;
			displayRequired?: boolean;
	  }
	| undefined;

const virtualTableClass = "w-full caption-bottom text-xs";

/** Extra rows rendered above/below the viewport (TanStack Virtual `overscan`). Higher = smoother fast scroll, more DOM work. */
const TABLE_ROW_OVERSCAN = 20;

const defaultLeafColumnWidth = { min: 20, size: 150, max: Number.MAX_SAFE_INTEGER };

function getRowTourEntityId(value: unknown): string | null {
	if (typeof value !== "object" || value == null) return null;
	if (!("id" in value)) return null;
	const maybeId = (value as { id?: unknown }).id;
	if (typeof maybeId === "string" || typeof maybeId === "number" || typeof maybeId === "bigint") {
		return String(maybeId);
	}
	return null;
}

/** Headless tables often pass partial `state` without `columnSizing`; `column.getSize()` then throws. */
function safeLeafColumnWidth<TData extends RowData>(
	table: TanstackTable<TData>,
	column: Column<TData, unknown>,
): number {
	const sizing = table.getState().columnSizing;
	const columnSize = sizing?.[column.id];
	const def = column.columnDef;
	return Math.min(
		Math.max(def.minSize ?? defaultLeafColumnWidth.min, columnSize ?? def.size ?? defaultLeafColumnWidth.size),
		def.maxSize ?? defaultLeafColumnWidth.max,
	);
}

function DataTableToolbar({
	selectedCount,
	rowCount,
	selectedLabel,
	selectedActions,
}: {
	selectedCount: number;
	rowCount: number;
	selectedLabel: string;
	selectedActions?: ReactNode;
}) {
	return (
		<div className="flex h-8 shrink-0 flex-wrap items-center gap-2">
			<p className="text-muted-foreground text-xs">{`${selectedCount} / ${rowCount} ${selectedLabel}`}</p>
			{selectedActions}
		</div>
	);
}

function DataTableColumnVisibility<TData extends RowData>({ table }: { table: TanstackTable<TData> }) {
	const manageColumnsLabel = m.common_manageColumns();
	const toggleableColumns = table
		.getAllLeafColumns()
		.filter((column) => column.getCanHide() && !["select", "actions", "globalSearch"].includes(column.id));

	if (toggleableColumns.length === 0) return null;
	const allVisible = toggleableColumns.every((column) => column.getIsVisible());
	const requiredColumns = toggleableColumns.filter(
		(column) => ((column.columnDef.meta as ColumnMeta<TData>)?.displayRequired ?? false) === true,
	);
	const effectiveRequiredColumns = requiredColumns.length > 0 ? requiredColumns : toggleableColumns.slice(0, 1);
	const requiredColumnIds = new Set(effectiveRequiredColumns.map((column) => column.id));

	const getColumnLabel = (columnId: string): string => {
		switch (columnId) {
			case "title":
				return m.fields_title();
			case "name":
				return m.fields_name();
			case "description":
			case "content":
				return m.fields_description();
			case "category":
				return m.collections_speciesCategory_title();
			case "species":
				return m.collections_species_title();
			case "cultivar":
				return m.collections_cultivar_title();
			case "isCustom":
				return m.fields_isCustom();
			case "updatedAt":
			case "createdAt":
				return m.fields_updatedAt();
			case "placement":
				return m.fields_placement();
			case "occurredAt":
				return m.fields_occurredAt();
			case "actionType":
				return m.fields_title();
			default:
				return columnId;
		}
	};

	return (
		<DropdownMenu>
			<ButtonTooltip label={manageColumnsLabel}>
				<DropdownMenuTrigger asChild>
					<Button type="button" variant="outline" size="icon" aria-label={manageColumnsLabel}>
						<SlidersHorizontalIcon />
					</Button>
				</DropdownMenuTrigger>
			</ButtonTooltip>
			<DropdownMenuContent align="end" className="w-44">
				<DropdownMenuCheckboxItem
					checked={allVisible}
					onSelect={(event) => event.preventDefault()}
					onCheckedChange={(checked) => {
						const nextVisible = Boolean(checked);
						for (const column of toggleableColumns) {
							if (nextVisible) {
								column.toggleVisibility(true);
								continue;
							}
							column.toggleVisibility(requiredColumnIds.has(column.id));
						}
					}}
				>
					{m.common_all()}
				</DropdownMenuCheckboxItem>
				{toggleableColumns.map((column) => (
					<DropdownMenuCheckboxItem
						key={column.id}
						className="capitalize"
						checked={column.getIsVisible()}
						disabled={requiredColumnIds.has(column.id)}
						onSelect={(event) => event.preventDefault()}
						onCheckedChange={(checked) => column.toggleVisibility(Boolean(checked))}
					>
						{getColumnLabel(column.id)}
					</DropdownMenuCheckboxItem>
				))}
			</DropdownMenuContent>
		</DropdownMenu>
	);
}

export function DataTable<TData extends RowData>({
	table,
	isPending,
	isError,
	errorMessage,
	emptyMessage,
	selectedLabel = m.common_selected(),
	selectedActions,
	globalSearch,
	highlightPendingRows = false,
}: DataTableProps<TData>) {
	const rows = table.getRowModel().rows;
	const rowCount = rows.length;
	const headerScrollRef = useRef<HTMLDivElement>(null);
	const bodyScrollRef = useRef<HTMLDivElement>(null);
	const scrollParentRef = bodyScrollRef;
	const rowsRef = useRef(rows);
	rowsRef.current = rows;

	const getItemKey = useCallback((index: number) => rowsRef.current[index]?.id ?? index, []);

	const syncHorizontalScroll = useCallback((source: HTMLDivElement) => {
		const headerEl = headerScrollRef.current;
		const bodyEl = bodyScrollRef.current;
		if (!headerEl || !bodyEl) return;
		if (source === headerEl && bodyEl.scrollLeft !== headerEl.scrollLeft) {
			bodyEl.scrollLeft = headerEl.scrollLeft;
		} else if (source === bodyEl && headerEl.scrollLeft !== bodyEl.scrollLeft) {
			headerEl.scrollLeft = bodyEl.scrollLeft;
		}
	}, []);

	// eslint-disable-next-line react-hooks/incompatible-library -- TanStack Virtual scroll sync; compiler skips memoization for this subtree.
	const rowVirtualizer = useVirtualizer({
		count: rowCount,
		enabled: rowCount > 0 && !isError,
		getScrollElement: () => scrollParentRef.current,
		estimateSize: () => 49,
		overscan: TABLE_ROW_OVERSCAN,
		useFlushSync: false,
		getItemKey,
	});

	const virtualRows = rowVirtualizer.getVirtualItems();

	if (isError) {
		return (
			<p className="text-destructive text-sm" role="alert">
				{errorMessage}
			</p>
		);
	}

	const selectedCount = table.getFilteredSelectedRowModel().rows.length;
	const leafHeaders = table.getHeaderGroups().at(-1)?.headers ?? [];
	const leafColumns = table.getVisibleLeafColumns();
	const colgroup = (
		<colgroup>
			{leafColumns.map((column) => (
				<col
					key={column.id}
					style={{
						width: `${
							column.id === "select"
								? TABLE_LIST_SELECT_COLUMN_WIDTH_PX
								: safeLeafColumnWidth(table, column)
						}px`,
					}}
				/>
			))}
		</colgroup>
	);

	const fixedTableClass = cn(virtualTableClass, "table-fixed");

	const theadContent = (
			<TableHeader className="bg-background shadow-[inset_0_-1px_0_0_hsl(var(--border))] [&_th]:bg-background [&_tr]:border-b-0">
			{table.getHeaderGroups().map((headerGroup) => (
				<TableRow key={headerGroup.id}>
					{headerGroup.headers.map((header) => {
						const meta = header.column.columnDef.meta as ColumnMeta<TData>;
						return (
							<TableHead key={header.id} className={meta?.headerClassName}>
								{header.isPlaceholder
									? null
									: flexRender(header.column.columnDef.header, header.getContext())}
							</TableHead>
						);
					})}
				</TableRow>
			))}
			<TableRow className="border-border border-b hover:bg-transparent">
				{leafHeaders.map((header) => {
					const filterMeta = header.column.columnDef.meta as ColumnMeta<TData>;
					if (header.isPlaceholder) {
						return <TableHead key={`${header.id}-filter`} className={filterMeta?.headerClassName} />;
					}
					const meta = filterMeta;
					const filterRenderer = meta?.filter;
					return (
						<TableHead key={`${header.id}-filter`} className={meta?.headerClassName}>
							{header.column.getCanFilter() ? (
								filterRenderer ? (
									filterRenderer({ table, column: header.column as Column<TData, unknown> })
								) : (
									<DebouncedInput
										value={(header.column.getFilterValue() as string) ?? ""}
										onChange={(value) => header.column.setFilterValue(value)}
										placeholder={m.filtering_searchPlaceholder()}
										showClear
										clearAriaLabel={m.filtering_clearFilters()}
									/>
								)
							) : null}
						</TableHead>
					);
				})}
			</TableRow>
		</TableHeader>
	);

	if (rowCount === 0) {
		return (
			<div className="flex min-h-0 min-w-0 flex-1 flex-col gap-2">
				{globalSearch ? (
					<TableGlobalSearch
						value={globalSearch.value}
						onValueChange={globalSearch.onValueChange}
						onClearFilters={globalSearch.onClearFilters}
						searchPlaceholder={globalSearch.searchPlaceholder}
						clearSearchLabel={globalSearch.clearSearchLabel}
						clearFiltersLabel={globalSearch.clearFiltersLabel}
						trailingActions={
							<>
								{globalSearch.trailingActions}
								<DataTableColumnVisibility table={table} />
							</>
						}
					/>
				) : (
					<DataTableColumnVisibility table={table} />
				)}
				<DataTableToolbar
					selectedCount={selectedCount}
					rowCount={rowCount}
					selectedLabel={selectedLabel}
					selectedActions={selectedActions}
				/>
				<div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
					<div
						ref={headerScrollRef}
						className={cn(
							"shrink-0 overflow-x-auto overflow-y-hidden bg-background",
							"[scrollbar-gutter:stable]",
						)}
						onScroll={(event) => syncHorizontalScroll(event.currentTarget)}
					>
						<table className={fixedTableClass}>
							{colgroup}
							{theadContent}
						</table>
					</div>
					<div
						ref={bodyScrollRef}
						className={cn(
							"flex min-h-0 min-w-0 flex-1 flex-col overflow-x-auto overflow-y-auto [overflow-anchor:none]",
							"[scrollbar-gutter:stable]",
						)}
						onScroll={(event) => syncHorizontalScroll(event.currentTarget)}
					>
						{isPending ? (
							<PageLoading showLabel={false} variant="page" className="w-full" />
						) : (
							<table className={fixedTableClass}>
								{colgroup}
								<TableBody>
									<TableRow>
										<TableCell colSpan={leafColumns.length} className="h-24 text-center">
											{emptyMessage}
										</TableCell>
									</TableRow>
								</TableBody>
							</table>
						)}
					</div>
				</div>
			</div>
		);
	}

	return (
		<div className="flex min-h-0 min-w-0 flex-1 flex-col gap-2">
			{globalSearch ? (
				<TableGlobalSearch
					value={globalSearch.value}
					onValueChange={globalSearch.onValueChange}
					onClearFilters={globalSearch.onClearFilters}
					searchPlaceholder={globalSearch.searchPlaceholder}
					clearSearchLabel={globalSearch.clearSearchLabel}
					clearFiltersLabel={globalSearch.clearFiltersLabel}
					trailingActions={
						<>
							{globalSearch.trailingActions}
							<DataTableColumnVisibility table={table} />
						</>
					}
				/>
			) : (
				<DataTableColumnVisibility table={table} />
			)}
			<DataTableToolbar
				selectedCount={selectedCount}
				rowCount={rowCount}
				selectedLabel={selectedLabel}
				selectedActions={selectedActions}
			/>
			<div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
				<div
					ref={headerScrollRef}
					className={cn(
						"shrink-0 overflow-x-auto overflow-y-hidden bg-background",
						// MDN: align non-scrolling + scrolling siblings — reserve the same vertical scrollbar gutter as the body
						// (see https://developer.mozilla.org/en-US/docs/Web/CSS/scrollbar-gutter — Example 3).
						"[scrollbar-gutter:stable]",
					)}
					onScroll={(event) => syncHorizontalScroll(event.currentTarget)}
				>
					<table className={fixedTableClass}>
						{colgroup}
						{theadContent}
					</table>
				</div>
				<div
					ref={bodyScrollRef}
					className={cn(
						"flex min-h-0 min-w-0 flex-1 flex-col overflow-x-auto overflow-y-auto [overflow-anchor:none]",
						"[scrollbar-gutter:stable]",
					)}
					onScroll={(event) => syncHorizontalScroll(event.currentTarget)}
				>
					<div className="relative w-full" style={{ height: `${rowVirtualizer.getTotalSize()}px` }}>
						<table className={fixedTableClass}>
							{colgroup}
							<tbody data-slot="table-body" className="[&_tr:last-child]:border-0">
								{(() => {
									// `<tr>` siblings stack in normal flow; `translateY` is relative to that position.
									// Subtract cumulative height of prior *rendered* siblings so each row lands at `virtualRow.start`
									// (TanStack table virtual example — not `start - index * size`, which overlaps when sizes differ).
									let layoutTopBeforeRow = 0;
									return virtualRows.map((virtualRow) => {
										const row = rows[virtualRow.index];
										const rowTourEntityId = getRowTourEntityId(row.original);
										const translateY = virtualRow.start - layoutTopBeforeRow;
										layoutTopBeforeRow += virtualRow.size;
										const rowPending =
											highlightPendingRows && isQueryObjectPending(row.original as object);
										return (
											<TableRow
												key={row.id}
												data-index={virtualRow.index}
												data-state={row.getIsSelected() ? "selected" : undefined}
												data-id={rowTourEntityId ?? undefined}
												data-pending={rowPending ? "true" : undefined}
												aria-busy={rowPending ? true : undefined}
												className={cn(rowPending && pendingItemSurfaceClassName)}
												style={{
													height: `${virtualRow.size}px`,
													transform: `translateY(${translateY}px)`,
												}}
											>
												{row.getVisibleCells().map((cell) => {
													const cellMeta = cell.column.columnDef.meta as ColumnMeta<TData>;
													return (
														<TableCell key={cell.id} className={cellMeta?.cellClassName}>
															{flexRender(cell.column.columnDef.cell, cell.getContext())}
														</TableCell>
													);
												})}
											</TableRow>
										);
									});
								})()}
							</tbody>
						</table>
					</div>
				</div>
			</div>
		</div>
	);
}
