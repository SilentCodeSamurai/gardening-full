import { useState } from "react";
import { Link } from "@tanstack/react-router";
import type { SpeciesEntity } from "@backend/core/domain/gardening/entities";
import { translateCatalogField } from "@/lib/translate-catalog-field";
import { ItemPresentationIcon } from "@/components/icon/item-presentation-icon";
import { DeleteConfirmDialog } from "@/components/gardening/shared/delete-confirm-dialog";
import { SpeciesUpdateDialog } from "@/components/gardening/species/species-update-dialog";
import { Button } from "@/components/ui/button";
import { IconTooltip } from "@/components/ui/button-tooltip";
import { useSpeciesDeleteMutation } from "@/store/mutations";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Card, CardContent } from "@/components/ui/card";
import { ExternalLinkIcon, PencilIcon, PencilOffIcon, Trash2Icon } from "lucide-react";
import * as m from "@/paraglide/messages.js";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type Props = {
	species: SpeciesEntity;
	categoryId: string;
	categoryLabel: string;
};

export function SpeciesListCard({ species, categoryId, categoryLabel }: Props) {
	const [editOpen, setEditOpen] = useState(false);
	const [deleteOpen, setDeleteOpen] = useState(false);
	const del = useSpeciesDeleteMutation();

	const name = translateCatalogField(species.characteristics.name, species.isDefault);
	const desc = translateCatalogField(species.characteristics.description, species.isDefault);

	return (
		<Card type="item" className="relative transition-colors hover:bg-card/80">
			<CardContent className="relative flex flex-row items-center justify-between gap-3">
				<Link
					to="/catalog/species-detail/$speciesId"
					params={{ speciesId: String(species.id) }}
					search={{ category: String(categoryId) }}
					className="absolute inset-0 z-0 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
					aria-label={`${name} — ${m["common.open"]()} ${m["common.details"]().toLowerCase()}`}
				/>
				<div className="relative z-10 flex min-w-0 flex-1 flex-row items-center gap-2 pointer-events-none">
					<ItemPresentationIcon presentation={species.presentation} />
					<div className="flex min-w-0 flex-col justify-center items-start">
						<span className="font-medium">{name}</span>
						<span className="text-muted-foreground text-xs">
							{categoryLabel ||
								`${m["common.unknown"]()} ${m["collections.speciesCategory.title"]().toLowerCase()}`}
						</span>
					</div>
					{desc ? <span className="line-clamp-2 text-muted-foreground text-xs">{desc}</span> : null}
				</div>
				<div className="relative z-20 flex shrink-0 items-center gap-1">
					<IconTooltip
						disabled={species.isDefault}
						label={species.isDefault ? m["common.editDisabledDefaultCatalog"]() : m["common.edit"]()}
					>
						<Button
							type="button"
							variant="outline"
							size="icon-sm"
							disabled={species.isDefault}
							aria-label={
								species.isDefault ? m["common.editDisabledDefaultCatalog"]() : m["common.edit"]()
							}
							onClick={() => setEditOpen(true)}
						>
							{species.isDefault ? (
								<PencilOffIcon className="size-4" />
							) : (
								<PencilIcon className="size-4" />
							)}
						</Button>
					</IconTooltip>
					{!species.isDefault ? (
						<SpeciesUpdateDialog species={species} open={editOpen} onOpenChange={setEditOpen} />
					) : null}
					<IconTooltip
						disabled={species.isDefault}
						label={species.isDefault ? m["common.editDisabledDefaultCatalog"]() : m["common.delete"]()}
					>
						<Button
							type="button"
							variant="outline"
							size="icon-sm"
							disabled={species.isDefault}
							aria-label={
								species.isDefault ? m["common.editDisabledDefaultCatalog"]() : m["common.delete"]()
							}
							onClick={() => setDeleteOpen(true)}
						>
							<Trash2Icon className="size-4" />
						</Button>
					</IconTooltip>
					<DeleteConfirmDialog
						open={deleteOpen}
						onOpenChange={setDeleteOpen}
						title={m["collections.species.delete"]()}
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
										aria-label={m["common.openRelatedList"]()}
									>
										<ExternalLinkIcon />
									</Button>
								</DropdownMenuTrigger>
							</TooltipTrigger>
							<TooltipContent>{m["common.openRelatedList"]()}</TooltipContent>
						</Tooltip>
						<DropdownMenuContent className="flex flex-col gap-1" align="end">
							<DropdownMenuItem asChild>
								<Button asChild variant="outline" size="xs">
									<Link
										to="/catalog/cultivars"
										search={{ category: String(categoryId), species: String(species.id) }}
										aria-label={m["common.openRelatedList"]()}
									>
										{m["collections.cultivar.titlePlural"]()}
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
										aria-label={m["common.openRelatedList"]()}
									>
										{m["collections.plant.titlePlural"]()}
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
