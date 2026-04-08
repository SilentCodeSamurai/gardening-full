import * as m from "@/paraglide/messages.js";
import { flexRender, type Column, type RowData, type Table as TanstackTable } from "@tanstack/react-table";
import { useVirtualizer } from "@tanstack/react-virtual";
import type { ReactNode } from "react";
import { useCallback, useRef } from "react";

import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { TABLE_LIST_SELECT_COLUMN_WIDTH_PX } from "@/components/table/table-list-column-sizes";
import { cn } from "@/lib/utils";

type DataTableProps<TData extends RowData> = {
	table: TanstackTable<TData>;
	isPending: boolean;
	isError: boolean;
	errorMessage: string;
	emptyMessage: string;
	selectedLabel?: string;
	selectedActions?: ReactNode;
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
	  }
	| undefined;

const virtualTableClass = "w-full caption-bottom text-xs";

const defaultLeafColumnWidth = { min: 20, size: 150, max: Number.MAX_SAFE_INTEGER };

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
		<div className="flex shrink-0 flex-wrap items-center justify-between gap-2 h-8">
			<p className="text-muted-foreground text-xs">
				{selectedCount} / {rowCount} {selectedLabel}
			</p>
			{selectedActions}
		</div>
	);
}

export function DataTable<TData extends RowData>({
	table,
	isPending,
	isError,
	errorMessage,
	emptyMessage,
	selectedLabel = "selected",
	selectedActions,
}: DataTableProps<TData>) {
	const selectedCount = table.getFilteredSelectedRowModel().rows.length;
	const rows = table.getRowModel().rows;
	const rowCount = rows.length;
	const leafHeaders = table.getHeaderGroups().at(-1)?.headers ?? [];
	const headerScrollRef = useRef<HTMLDivElement>(null);
	const bodyScrollRef = useRef<HTMLDivElement>(null);
	const scrollParentRef = bodyScrollRef;

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
		getScrollElement: () => scrollParentRef.current,
		estimateSize: () => 49,
		overscan: 12,
		useFlushSync: false,
		getItemKey: (index) => rows[index]?.id ?? index,
	});

	const virtualRows = rowVirtualizer.getVirtualItems();

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
		<TableHeader className="[&_th]:bg-background bg-background [&_tr]:border-b-0 shadow-[inset_0_-1px_0_0_hsl(var(--border))]">
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
			<TableRow className="border-b border-border hover:bg-transparent">
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
									<Input
										value={(header.column.getFilterValue() as string) ?? ""}
										onChange={(event) => header.column.setFilterValue(event.target.value)}
										placeholder={m["filtering.searchPlaceholder"]()}
									/>
								)
							) : null}
						</TableHead>
					);
				})}
			</TableRow>
		</TableHeader>
	);

	if (isError) {
		return (
			<p className="text-destructive text-sm" role="alert">
				{errorMessage}
			</p>
		);
	}

	if (isPending) {
		return (
			<div className="flex justify-center py-12">
				<Spinner className="size-8" />
			</div>
		);
	}

	if (rowCount === 0) {
		return (
			<div className="flex min-h-0 min-w-0 flex-1 flex-col gap-2">
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
							"min-h-0 min-w-0 flex-1 overflow-y-auto overflow-x-auto [overflow-anchor:none]",
							"[scrollbar-gutter:stable]",
						)}
						onScroll={(event) => syncHorizontalScroll(event.currentTarget)}
					>
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
					</div>
				</div>
			</div>
		);
	}

	return (
		<div className="flex min-h-0 min-w-0 flex-1 flex-col gap-2">
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
						"min-h-0 min-w-0 flex-1 overflow-y-auto overflow-x-auto [overflow-anchor:none]",
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
										const translateY = virtualRow.start - layoutTopBeforeRow;
										layoutTopBeforeRow += virtualRow.size;
										return (
											<TableRow
												key={row.id}
												ref={rowVirtualizer.measureElement}
												data-index={virtualRow.index}
												data-state={row.getIsSelected() ? "selected" : undefined}
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
