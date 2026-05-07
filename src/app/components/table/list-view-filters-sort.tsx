import type { Column, ColumnFiltersState, RowData, SortingState, Table, Updater } from "@tanstack/react-table";
import {
	ArrowDownIcon,
	ArrowDownUpIcon,
	ArrowUpIcon,
	CheckIcon,
	ChevronsUpDownIcon,
	FilterIcon,
} from "lucide-react";
import type { Dispatch, ReactNode, SetStateAction } from "react";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { ButtonTooltip } from "@/components/ui/button-tooltip";
import {
	Dialog,
	DialogContent,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import * as m from "@/paraglide/messages.js";

const NON_SORT_IDS = new Set(["select", "actions", "globalSearch"]);

type ColumnMetaWithFilter<TData extends RowData> = {
	filter?: (ctx: { table: Table<TData>; column: Column<TData, unknown> }) => ReactNode;
} | undefined;

function isFilterValueEmpty(value: unknown): boolean {
	return (
		value === "" ||
		value === undefined ||
		value === null ||
		(Array.isArray(value) && value.length === 0)
	);
}

function patchColumnFilter(
	prev: ColumnFiltersState,
	columnId: string,
	value: unknown,
): ColumnFiltersState {
	const next = prev.filter((f) => f.id !== columnId);
	if (!isFilterValueEmpty(value)) {
		next.push({ id: columnId, value });
	}
	return next;
}

/** Table proxy so column filter UIs read/write draft filters only until Apply.
 * Only `getState().columnFilters` and `getColumn(id).{getFilterValue,setFilterValue}` are drafted;
 * other table APIs still reflect committed state.
 */
function createListFiltersDraftTableProxy<TData extends RowData>(
	table: Table<TData>,
	draftFilters: ColumnFiltersState,
	setDraftFilters: Dispatch<SetStateAction<ColumnFiltersState>>,
): Table<TData> {
	return new Proxy(table, {
		get(target, prop, receiver) {
			if (prop === "getState") {
				return () => ({
					...target.getState(),
					columnFilters: draftFilters,
				});
			}
			if (prop === "getColumn") {
				return (columnId: string) => {
					const col = target.getColumn(columnId);
					if (!col) return undefined;
					return new Proxy(col, {
						get(colTarget, colProp) {
							if (colProp === "getFilterValue") {
								return () => draftFilters.find((f) => f.id === columnId)?.value;
							}
							if (colProp === "setFilterValue") {
								return (value: unknown | Updater<unknown>) => {
									setDraftFilters((prev) => {
										const current = prev.find((f) => f.id === columnId)?.value;
										const resolved =
											typeof value === "function"
												? (value as (old: unknown) => unknown)(current)
												: value;
										return patchColumnFilter(prev, columnId, resolved);
									});
								};
							}
							const v = Reflect.get(colTarget, colProp, colTarget);
							if (typeof v === "function") return v.bind(colTarget);
							return v;
						},
					}) as Column<TData, unknown>;
				};
			}
			const v = Reflect.get(target, prop, receiver);
			if (typeof v === "function") return (v as (...a: unknown[]) => unknown).bind(target);
			return v;
		},
	}) as Table<TData>;
}

export function listViewColumnLabel(columnId: string): string {
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
		case "createdAt":
			return m.fields_createdAt();
		case "updatedAt":
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
}

function sortingStateEquals(a: SortingState, b: SortingState): boolean {
	if (a.length !== b.length) return false;
	for (let i = 0; i < a.length; i++) {
		const x = a[i];
		const y = b[i];
		if (x?.id !== y?.id || Boolean(x?.desc) !== Boolean(y?.desc)) return false;
	}
	return true;
}

function copySortingState(source: SortingState): SortingState {
	return source.map((s) => ({ id: s.id, desc: s.desc }));
}

function cycleSingleColumnSort(
	prev: SortingState,
	columnId: string,
	listDefaultSorting: SortingState,
): SortingState {
	const cur = prev[0];
	if (!cur || cur.id !== columnId) return [{ id: columnId, desc: false }];
	if (!cur.desc) return [{ id: columnId, desc: true }];
	return copySortingState(listDefaultSorting);
}

function sortStateIcon(sorting: SortingState, columnId: string) {
	const cur = sorting[0];
	if (!cur || cur.id !== columnId) {
		return <ChevronsUpDownIcon aria-hidden className="size-3.5 shrink-0 text-muted-foreground" />;
	}
	if (!cur.desc) {
		return <ArrowUpIcon aria-hidden className="size-3.5 shrink-0" />;
	}
	return <ArrowDownIcon aria-hidden className="size-3.5 shrink-0" />;
}

type ListViewFiltersModalProps<TData extends RowData> = {
	table: Table<TData>;
	open: boolean;
	onOpenChange: (open: boolean) => void;
};

export function ListViewFiltersModal<TData extends RowData>({
	table,
	open,
	onOpenChange,
}: ListViewFiltersModalProps<TData>) {
	const [draftFilters, setDraftFilters] = useState<ColumnFiltersState>([]);

	useEffect(() => {
		if (!open) return;
		setDraftFilters(table.getState().columnFilters);
	}, [open, table]);

	const draftTable = useMemo(
		() => createListFiltersDraftTableProxy(table, draftFilters, setDraftFilters),
		[table, draftFilters],
	);

	const variantFilterColumns = useMemo(
		() =>
			table
				.getAllLeafColumns()
				.filter((column) => {
					if (!column.getCanFilter()) return false;
					const meta = column.columnDef.meta as ColumnMetaWithFilter<TData>;
					return typeof meta?.filter === "function";
				}),
		[table],
	);

	const filtersLabel = m.filtering_listFiltersTitle();

	const handleApply = () => {
		table.setColumnFilters(draftFilters);
		onOpenChange(false);
	};

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="max-h-[min(90vh,36rem)] gap-4 sm:max-w-md" showCloseButton>
				<DialogHeader>
					<DialogTitle>{filtersLabel}</DialogTitle>
				</DialogHeader>
				<div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto pr-1">
					<div className="flex flex-col gap-4">
						{variantFilterColumns.map((column) => {
							const meta = column.columnDef.meta as ColumnMetaWithFilter<TData>;
							const filterRenderer = meta?.filter;
							if (!filterRenderer) return null;
							const wrapped = draftTable.getColumn(column.id);
							if (!wrapped) return null;
							return (
								<div key={column.id} className="flex flex-col gap-1.5">
									<span className="text-muted-foreground text-xs">
										{listViewColumnLabel(column.id)}
									</span>
									{filterRenderer({
										table: draftTable,
										column: wrapped as Column<TData, unknown>,
									})}
								</div>
							);
						})}
					</div>
				</div>
				<DialogFooter className="gap-2 sm:gap-2">
					<Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
						{m.common_cancel()}
					</Button>
					<Button type="button" onClick={handleApply}>
						{m.filtering_apply()}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}

function hasVariantFilterColumns<TData extends RowData>(table: Table<TData>): boolean {
	return table.getAllLeafColumns().some((column) => {
		if (!column.getCanFilter()) return false;
		const meta = column.columnDef.meta as ColumnMetaWithFilter<TData>;
		return typeof meta?.filter === "function";
	});
}

type ListViewFiltersModalControlProps<TData extends RowData> = {
	table: Table<TData>;
};

/** Icon button opens the list-view filters modal (variant filters only). */
export function ListViewFiltersModalControl<TData extends RowData>({
	table,
}: ListViewFiltersModalControlProps<TData>) {
	const [open, setOpen] = useState(false);
	const label = m.filtering_listFiltersTitle();

	if (!hasVariantFilterColumns(table)) return null;

	return (
		<>
			<ButtonTooltip label={label}>
				<Button
					type="button"
					variant="outline"
					size="icon"
					aria-label={label}
					onClick={() => setOpen(true)}
				>
					<FilterIcon />
				</Button>
			</ButtonTooltip>
			<ListViewFiltersModal table={table} open={open} onOpenChange={setOpen} />
		</>
	);
}

function hasSortableColumns<TData extends RowData>(table: Table<TData>): boolean {
	return table
		.getAllLeafColumns()
		.some((column) => column.getCanSort() && !NON_SORT_IDS.has(column.id));
}

type ListViewSortDropdownProps<TData extends RowData> = {
	table: Table<TData>;
	/** Matches this collection's `initialSorting` / URL default when no sort params are set. */
	listDefaultSorting: SortingState;
};

/** Sort dropdown: each choice updates the table immediately; "default" restores `listDefaultSorting` (✓ when active). */
export function ListViewSortDropdown<TData extends RowData>({
	table,
	listDefaultSorting,
}: ListViewSortDropdownProps<TData>) {
	const [open, setOpen] = useState(false);
	const sorting = table.getState().sorting;
	const defaultSelected = sortingStateEquals(sorting, listDefaultSorting);

	const sortableColumns = useMemo(
		() =>
			table
				.getAllLeafColumns()
				.filter((column) => column.getCanSort() && !NON_SORT_IDS.has(column.id)),
		[table],
	);

	const sortLabel = m.sorting_sortBy();

	if (!hasSortableColumns(table)) return null;

	return (
		<DropdownMenu open={open} onOpenChange={setOpen}>
			<ButtonTooltip label={sortLabel}>
				<DropdownMenuTrigger asChild>
					<Button type="button" variant="outline" size="icon" aria-label={sortLabel}>
						<ArrowDownUpIcon />
					</Button>
				</DropdownMenuTrigger>
			</ButtonTooltip>
			<DropdownMenuContent
				className="w-64 p-0"
				align="end"
				onCloseAutoFocus={(e) => e.preventDefault()}
			>
				<div className="max-h-[min(60vh,20rem)] overflow-y-auto p-1">
					<DropdownMenuItem
						className="flex cursor-pointer items-center justify-between gap-2"
						onSelect={(e) => e.preventDefault()}
						onClick={() => table.setSorting(copySortingState(listDefaultSorting))}
					>
						<span className="min-w-0 flex-1">{m.filtering_sortDefaultOrder()}</span>
						{defaultSelected ? (
							<CheckIcon aria-hidden className="size-3.5 shrink-0 text-muted-foreground" />
						) : (
							<span aria-hidden className="size-3.5 shrink-0" />
						)}
					</DropdownMenuItem>
					{sortableColumns.map((column) => (
						<DropdownMenuItem
							key={column.id}
							className="flex cursor-pointer items-center justify-between gap-2"
							onSelect={(e) => e.preventDefault()}
							onClick={() =>
								table.setSorting((prev) =>
									cycleSingleColumnSort(prev, column.id, listDefaultSorting),
								)
							}
						>
							<span className="min-w-0 flex-1 truncate">{listViewColumnLabel(column.id)}</span>
							{sortStateIcon(sorting, column.id)}
						</DropdownMenuItem>
					))}
				</div>
				<DropdownMenuSeparator className="m-0" />
				<div className="p-1">
					<Button
						type="button"
						variant="default"
						size="sm"
						className="w-full"
						onClick={(e) => {
							e.preventDefault();
							e.stopPropagation();
							setOpen(false);
						}}
					>
						{m.common_ok()}
					</Button>
				</div>
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
