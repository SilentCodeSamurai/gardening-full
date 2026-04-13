import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ExternalLinkIcon, PencilIcon, PencilOffIcon, Trash2Icon } from "lucide-react";
import { useState } from "react";
import { DeleteConfirmDialog } from "@/components/gardening/shared/delete-confirm-dialog";
import { SpeciesUpdateDialog } from "@/components/gardening/species/species-update-dialog";
import { ItemPresentationIcon } from "@/components/icon/item-presentation-icon";
import { Button } from "@/components/ui/button";
import { ButtonTooltip } from "@/components/ui/button-tooltip";
import { Card, CardContent } from "@/components/ui/card";
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
import { useSpeciesDeleteMutation } from "@/store/mutations";
import type { CachedSpeciesWithSystemCatalog } from "@/store/query-cache-types";
import { isQueryObjectPending } from "@/store/query-object-status";

type Props = {
	species: CachedSpeciesWithSystemCatalog;
	categoryId: string;
	categoryLabel: string;
};

export function SpeciesListCard({ species, categoryId, categoryLabel }: Props) {
	const [editOpen, setEditOpen] = useState(false);
	const [deleteOpen, setDeleteOpen] = useState(false);
	const del = useSpeciesDeleteMutation();
	const { data: cultivarsData } = useQuery({ ...queryKeys.cultivar.all });

	const name = translateCatalogField(species.characteristics.name, species.systemCatalog);
	const desc = translateCatalogField(species.characteristics.description, species.systemCatalog);
	const syncPending = isQueryObjectPending(species);
	const catalogLocked = species.systemCatalog || syncPending;
	const editDisabledReason = species.systemCatalog
		? m.common_editDisabledDefaultCatalog()
		: syncPending
			? m.common_editDisabledPendingSync()
			: m.common_edit();
	const linkedCultivarsCount =
		cultivarsData?.items.filter((cultivar) => String(cultivar.speciesId ?? "") === String(species.id)).length ?? 0;

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
					to="/catalog/species-detail/$speciesId"
					params={{ speciesId: String(species.id) }}
					search={{ category: String(categoryId) }}
					className="absolute inset-0 z-0 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
					aria-label={`${name} — ${m.common_open()} ${m.common_details().toLowerCase()}`}
				/>
				<div className="pointer-events-none relative z-10 flex min-w-0 flex-1 flex-row items-center gap-2">
					<ItemPresentationIcon presentation={species.presentation} />
					<div className="flex min-w-0 flex-col items-start justify-center">
						<span className="font-medium">{name}</span>
						<span className="text-muted-foreground text-xs">
							{categoryLabel ||
								`${m.common_unknown()} ${m.collections_speciesCategory_title().toLowerCase()}`}
						</span>
					</div>
					{desc ? <span className="line-clamp-2 text-muted-foreground text-xs">{desc}</span> : null}
				</div>
				<div className="relative z-20 flex shrink-0 items-center gap-1">
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
					{!species.systemCatalog ? (
						<SpeciesUpdateDialog species={species} open={editOpen} onOpenChange={setEditOpen} />
					) : null}
					<ButtonTooltip
						disabled={catalogLocked}
						label={
							species.systemCatalog
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
								species.systemCatalog
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
						title={m.collections_species_delete()}
						description={name ?? ""}
						warningDescription={
							linkedCultivarsCount > 0
								? linkedCultivarsCount === 1
									? m.collections_species_deleteLinkedSingle()
									: m.collections_species_deleteLinkedMany({ count: String(linkedCultivarsCount) })
								: undefined
						}
						isPending={del.isPending}
						onConfirm={async () => {
							setDeleteOpen(false);
							await del.mutateAsync({ id: species.id });
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
										to="/catalog/cultivars"
										search={{ category: String(categoryId), species: String(species.id) }}
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
										search={{
											category: String(categoryId),
											species: String(species.id),
											cultivar: "",
										}}
										aria-label={m.common_openRelatedList()}
									>
										{m.collections_plant_titlePlural()}
									</Link>
								</Button>
							</DropdownMenuItem>
						</DropdownMenuContent>
					</DropdownMenu>
				</div>
			</CardContent>
		</Card>
	);
}
