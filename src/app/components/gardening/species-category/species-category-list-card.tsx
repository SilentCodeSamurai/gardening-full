import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { EllipsisVerticalIcon, ExternalLinkIcon, PencilIcon, PencilOffIcon, Trash2Icon } from "lucide-react";
import { useState } from "react";
import { DeleteConfirmDialog } from "@/components/gardening/shared/delete-confirm-dialog";
import { SpeciesCategoryUpdateDialog } from "@/components/gardening/species-category/species-category-update-dialog";
import { ItemPresentationIcon } from "@/components/icon/item-presentation-icon";
import { Button } from "@/components/ui/button";
import { ButtonTooltip } from "@/components/ui/button-tooltip";
import { Checkbox } from "@/components/ui/checkbox";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSub,
	DropdownMenuSubContent,
	DropdownMenuSubTrigger,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Item, ItemActions } from "@/components/ui/item";
import { pendingItemSurfaceClassName } from "@/components/ui/pending-item-surface";
import { serializeUrlColumnFilters } from "@/lib/table-url-filters";
import { translateCatalogField } from "@/lib/translate-catalog-field";
import { cn } from "@/lib/utils";
import * as m from "@/paraglide/messages.js";
import { queryKeys } from "@/store/keys";
import { useSpeciesCategoryDeleteMutation } from "@/store/mutations";
import type { CachedSpeciesCategoryWithSystemCatalog } from "@/store/query-cache-types";
import { isQueryObjectPending } from "@/store/query-object-status";

type Props = {
	category: CachedSpeciesCategoryWithSystemCatalog;
	selected?: boolean;
	onSelectedChange?: (next: boolean) => void;
};

export function SpeciesCategoryListCard({ category, selected = false, onSelectedChange }: Props) {
	const [editOpen, setEditOpen] = useState(false);
	const [deleteOpen, setDeleteOpen] = useState(false);
	const del = useSpeciesCategoryDeleteMutation();
	const { data: speciesData } = useQuery({ ...queryKeys.species.all });
	const label = translateCatalogField(category.title, category.systemCatalog);
	const syncPending = isQueryObjectPending(category);
	const catalogLocked = category.systemCatalog || syncPending;
	const editDisabledReason = category.systemCatalog
		? m.common_editDisabledDefaultCatalog()
		: syncPending
			? m.common_editDisabledPendingSync()
			: m.common_edit();
	const linkedSpeciesCount =
		speciesData?.items.filter((species) => String(species.categoryId ?? "") === String(category.id)).length ?? 0;

	return (
		<Item
			variant="list"
			size="list"
			className={cn(
				"relative transition-colors",
				!syncPending && "hover:bg-card/45",
				syncPending && pendingItemSurfaceClassName,
			)}
			data-pending={syncPending ? "true" : undefined}
			aria-busy={syncPending || undefined}
		>
			<div className="relative flex w-full min-w-0 flex-row items-center justify-between gap-3">
				<Link
					to="/catalog/species-category/$speciesCategoryId"
					params={{ speciesCategoryId: String(category.id) }}
					className="absolute inset-0 z-0 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
					aria-label={`${label} — ${m.common_open()} ${m.common_details().toLowerCase()}`}
				/>
				<div className="relative z-20 flex shrink-0 items-center justify-center">
					<Checkbox
						aria-label={m.table_selectRow({ name: label ?? String(category.id) })}
						checked={selected}
						className="size-5"
						onCheckedChange={(checked) => onSelectedChange?.(checked === true)}
					/>
				</div>
				<div className="pointer-events-none relative z-10 flex min-w-0 flex-1 items-center gap-2">
					<ItemPresentationIcon presentation={category.presentation} />
					<span className="truncate font-medium">{label}</span>
				</div>
				<ItemActions className="relative z-20 shrink-0 gap-1">
					<DropdownMenu>
						<DropdownMenuTrigger asChild>
							<Button type="button" variant="outline" size="icon" aria-label={m.common_actions()}>
								<EllipsisVerticalIcon />
							</Button>
						</DropdownMenuTrigger>
						<DropdownMenuContent className="flex flex-col gap-1" align="end">
							{category.systemCatalog ? (
								<ButtonTooltip label={editDisabledReason} disabled>
									<DropdownMenuItem disabled title={editDisabledReason}>
										<PencilOffIcon />
										{m.common_edit()}
									</DropdownMenuItem>
								</ButtonTooltip>
							) : (
								<DropdownMenuItem onSelect={() => setEditOpen(true)} title={editDisabledReason}>
									<PencilIcon />
									{m.common_edit()}
								</DropdownMenuItem>
							)}
							{catalogLocked ? (
								<ButtonTooltip label={m.common_editDisabledDefaultCatalog()} disabled>
									<DropdownMenuItem disabled title={m.common_editDisabledDefaultCatalog()}>
										<Trash2Icon />
										{m.common_delete()}
									</DropdownMenuItem>
								</ButtonTooltip>
							) : (
								<DropdownMenuItem onSelect={() => setDeleteOpen(true)} title={m.common_delete()}>
									<Trash2Icon />
									{m.common_delete()}
								</DropdownMenuItem>
							)}
							<DropdownMenuSub>
								<DropdownMenuSubTrigger title={m.common_related()} aria-label={m.common_related()}>
									<ExternalLinkIcon />
									{m.common_related()}
								</DropdownMenuSubTrigger>
								<DropdownMenuSubContent className="flex flex-col gap-1">
									<DropdownMenuItem asChild>
										<Button asChild variant="outline" size="xs" title={m.common_related()}>
											<Link
												to="/catalog/species"
												search={{ cf: serializeUrlColumnFilters([{ id: "category", value: String(category.id) }]) }}
												aria-label={m.common_related()}
											>
												<ExternalLinkIcon />
												{m.collections_species_titlePlural()}
											</Link>
										</Button>
									</DropdownMenuItem>
									<DropdownMenuItem asChild>
										<Button asChild variant="outline" size="xs" title={m.common_related()}>
											<Link
												to="/catalog/cultivars"
												search={{ cf: serializeUrlColumnFilters([{ id: "category", value: String(category.id) }]) }}
												aria-label={m.common_related()}
											>
												<ExternalLinkIcon />
												{m.collections_cultivar_titlePlural()}
											</Link>
										</Button>
									</DropdownMenuItem>
									<DropdownMenuItem asChild>
										<Button asChild variant="outline" size="xs" title={m.common_related()}>
											<Link
												to="/plants"
												search={{ cf: serializeUrlColumnFilters([{ id: "category", value: String(category.id) }]) }}
												aria-label={m.common_related()}
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
					{!category.systemCatalog ? (
						<SpeciesCategoryUpdateDialog category={category} open={editOpen} onOpenChange={setEditOpen} />
					) : null}
					<DeleteConfirmDialog
						open={deleteOpen}
						onOpenChange={setDeleteOpen}
						title={m.collections_speciesCategory_delete()}
						description={label ?? ""}
						warningDescription={
							linkedSpeciesCount > 0
								? linkedSpeciesCount === 1
									? m.collections_speciesCategory_deleteLinkedSingle()
									: m.collections_speciesCategory_deleteLinkedMany({
											count: String(linkedSpeciesCount),
										})
								: undefined
						}
						isPending={del.isPending}
						onConfirm={async () => {
							setDeleteOpen(false);
							await del.mutateAsync({ id: category.id });
						}}
					/>
				</ItemActions>
			</div>
		</Item>
	);
}
