import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ExternalLinkIcon, PencilIcon, PencilOffIcon, Trash2Icon } from "lucide-react";
import { useState } from "react";
import { DeleteConfirmDialog } from "@/components/gardening/shared/delete-confirm-dialog";
import { SpeciesCategoryUpdateDialog } from "@/components/gardening/species-category/species-category-update-dialog";
import { ItemPresentationIcon } from "@/components/icon/item-presentation-icon";
import { Button } from "@/components/ui/button";
import { ButtonTooltip } from "@/components/ui/button-tooltip";
import { Card, CardAction, CardContent } from "@/components/ui/card";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { pendingItemSurfaceClassName } from "@/components/ui/pending-item-surface";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { translateCatalogField } from "@/lib/translate-catalog-field";
import { cn } from "@/lib/utils";
import * as m from "@/paraglide/messages.js";
import { queryKeys } from "@/store/keys";
import { useSpeciesCategoryDeleteMutation } from "@/store/mutations";
import type { CachedSpeciesCategoryWithSystemCatalog } from "@/store/query-cache-types";
import { isQueryObjectPending } from "@/store/query-object-status";

type Props = {
	category: CachedSpeciesCategoryWithSystemCatalog;
};

export function SpeciesCategoryListCard({ category }: Props) {
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
		<Card
			type="item"
			className={cn(
				"relative transition-colors",
				!syncPending && "hover:bg-card/80",
				syncPending && pendingItemSurfaceClassName,
			)}
			data-pending={syncPending ? "true" : undefined}
			aria-busy={syncPending || undefined}
		>
			<CardContent className="relative flex flex-row items-center justify-between gap-3">
				<Link
					to="/catalog/species-category/$speciesCategoryId"
					params={{ speciesCategoryId: String(category.id) }}
					className="absolute inset-0 z-0 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
					aria-label={`${label} — ${m.common_open()} ${m.common_details().toLowerCase()}`}
				/>
				<div className="pointer-events-none relative z-10 flex min-w-0 flex-1 items-center gap-2">
					<ItemPresentationIcon presentation={category.presentation} />
					<span className="truncate font-medium">{label}</span>
				</div>
				<CardAction className="relative z-20 flex h-full shrink-0 items-center gap-1">
					<ButtonTooltip disabled={catalogLocked} label={editDisabledReason}>
						<Button
							type="button"
							variant="outline"
							size="icon-sm"
							disabled={catalogLocked}
							aria-label={editDisabledReason}
							onClick={() => setEditOpen(true)}
						>
							{catalogLocked ? <PencilOffIcon className="size-4" /> : <PencilIcon className="size-4" />}
						</Button>
					</ButtonTooltip>
					{!category.systemCatalog ? (
						<SpeciesCategoryUpdateDialog category={category} open={editOpen} onOpenChange={setEditOpen} />
					) : null}
					<ButtonTooltip
						disabled={catalogLocked}
						label={
							category.systemCatalog
								? m.common_editDisabledDefaultCatalog()
								: syncPending
									? m.common_editDisabledPendingSync()
									: m.common_delete()
						}
					>
						<Button
							type="button"
							variant="outline"
							size="icon-sm"
							disabled={catalogLocked}
							aria-label={
								category.systemCatalog
									? m.common_editDisabledDefaultCatalog()
									: syncPending
										? m.common_editDisabledPendingSync()
										: m.common_delete()
							}
							onClick={() => setDeleteOpen(true)}
						>
							<Trash2Icon className="size-4" />
						</Button>
					</ButtonTooltip>
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
					<DropdownMenu>
						<Tooltip>
							<TooltipTrigger asChild>
								<DropdownMenuTrigger asChild>
									<Button
										type="button"
										variant="outline"
										size="icon-sm"
										aria-label={m.common_openRelatedList()}
									>
										<ExternalLinkIcon />
									</Button>
								</DropdownMenuTrigger>
							</TooltipTrigger>
							<TooltipContent>{m.common_openRelatedList()}</TooltipContent>
						</Tooltip>
						<DropdownMenuContent className="flex flex-col gap-1" align="end">
							<DropdownMenuItem asChild>
								<Button asChild variant="outline" size="xs">
									<Link
										to="/catalog/species"
										search={{ category: String(category.id) }}
										aria-label={m.common_openRelatedList()}
									>
										{m.collections_species_titlePlural()}
									</Link>
								</Button>
							</DropdownMenuItem>
							<DropdownMenuItem asChild>
								<Button asChild variant="outline" size="xs">
									<Link
										to="/catalog/cultivars"
										search={{ category: String(category.id), species: "" }}
										aria-label={m.common_openRelatedList()}
									>
										{m.collections_cultivar_titlePlural()}
									</Link>
								</Button>
							</DropdownMenuItem>
							<DropdownMenuItem asChild>
								<Button asChild variant="outline" size="xs">
									<Link
										to="/plants"
										search={{ category: String(category.id), species: "", cultivar: "" }}
										aria-label={m.common_openRelatedList()}
									>
										{m.collections_plant_titlePlural()}
									</Link>
								</Button>
							</DropdownMenuItem>
						</DropdownMenuContent>
					</DropdownMenu>
				</CardAction>
			</CardContent>
		</Card>
	);
}
