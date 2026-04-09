import type { SpeciesWithSystemCatalog } from "@backend/core/application/use-cases/gardening/species.crud-use-cases";
import { Link } from "@tanstack/react-router";
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
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { translateCatalogField } from "@/lib/translate-catalog-field";
import * as m from "@/paraglide/messages.js";
import { useSpeciesDeleteMutation } from "@/store/mutations";

type Props = {
	species: SpeciesWithSystemCatalog;
	categoryId: string;
	categoryLabel: string;
};

export function SpeciesListCard({ species, categoryId, categoryLabel }: Props) {
	const [editOpen, setEditOpen] = useState(false);
	const [deleteOpen, setDeleteOpen] = useState(false);
	const del = useSpeciesDeleteMutation();

	const name = translateCatalogField(species.characteristics.name, species.systemCatalog);
	const desc = translateCatalogField(species.characteristics.description, species.systemCatalog);

	return (
		<Card type="item" className="relative transition-colors hover:bg-card/80">
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
					<ButtonTooltip
						disabled={species.systemCatalog}
						label={species.systemCatalog ? m.common_editDisabledDefaultCatalog() : m.common_edit()}
					>
						<Button
							type="button"
							variant="outline"
							size="icon-sm"
							disabled={species.systemCatalog}
							aria-label={species.systemCatalog ? m.common_editDisabledDefaultCatalog() : m.common_edit()}
							onClick={() => setEditOpen(true)}
						>
							{species.systemCatalog ? (
								<PencilOffIcon className="size-4" />
							) : (
								<PencilIcon className="size-4" />
							)}
						</Button>
					</ButtonTooltip>
					{!species.systemCatalog ? (
						<SpeciesUpdateDialog species={species} open={editOpen} onOpenChange={setEditOpen} />
					) : null}
					<ButtonTooltip
						disabled={species.systemCatalog}
						label={species.systemCatalog ? m.common_editDisabledDefaultCatalog() : m.common_delete()}
					>
						<Button
							type="button"
							variant="outline"
							size="icon-sm"
							disabled={species.systemCatalog}
							aria-label={species.systemCatalog ? m.common_editDisabledDefaultCatalog() : m.common_delete()}
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
						isPending={del.isPending}
						onConfirm={async () => {
							await del.mutateAsync({ id: species.id });
							setDeleteOpen(false);
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
