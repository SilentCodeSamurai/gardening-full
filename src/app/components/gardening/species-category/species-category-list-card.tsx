import { useState } from "react";
import { Link } from "@tanstack/react-router";
import type { SpeciesCategoryEntity } from "@backend/core/domain/gardening/entities";
import { translateCatalogField } from "@/lib/translate-catalog-field";
import { DeleteConfirmDialog } from "@/components/gardening/shared/delete-confirm-dialog";
import { ItemPresentationIcon } from "@/components/icon/item-presentation-icon";
import { SpeciesCategoryUpdateDialog } from "@/components/gardening/species-category/species-category-update-dialog";
import { Button } from "@/components/ui/button";
import { IconTooltip } from "@/components/ui/button-tooltip";
import { useSpeciesCategoryDeleteMutation } from "@/store/mutations";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Card, CardAction, CardContent } from "@/components/ui/card";
import { ExternalLinkIcon, PencilIcon, PencilOffIcon, Trash2Icon } from "lucide-react";
import * as m from "@/paraglide/messages.js";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type Props = {
	category: SpeciesCategoryEntity;
};

export function SpeciesCategoryListCard({ category }: Props) {
	const [editOpen, setEditOpen] = useState(false);
	const [deleteOpen, setDeleteOpen] = useState(false);
	const del = useSpeciesCategoryDeleteMutation();
	const label = translateCatalogField(category.title, category.isDefault);

	return (
		<Card type="item" className="relative transition-colors hover:bg-card/80">
			<CardContent className="relative flex flex-row items-center justify-between gap-3">
				<Link
					to="/catalog/species-category/$speciesCategoryId"
					params={{ speciesCategoryId: String(category.id) }}
					className="absolute inset-0 z-0 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
					aria-label={`${label} — ${m["common.open"]()} ${m["common.details"]().toLowerCase()}`}
				/>
				<div className="relative z-10 flex min-w-0 flex-1 items-center gap-2 pointer-events-none">
					<ItemPresentationIcon presentation={category.presentation} />
					<span className="truncate font-medium">{label}</span>
				</div>
				<CardAction className="relative z-20 flex h-full shrink-0 items-center gap-1">
					<IconTooltip
						disabled={category.isDefault}
						label={category.isDefault ? m["common.editDisabledDefaultCatalog"]() : m["common.edit"]()}
					>
						<Button
							type="button"
							variant="outline"
							size="icon-sm"
							disabled={category.isDefault}
							aria-label={
								category.isDefault ? m["common.editDisabledDefaultCatalog"]() : m["common.edit"]()
							}
							onClick={() => setEditOpen(true)}
						>
							{category.isDefault ? (
								<PencilOffIcon className="size-4" />
							) : (
								<PencilIcon className="size-4" />
							)}
						</Button>
					</IconTooltip>
					{!category.isDefault ? (
						<SpeciesCategoryUpdateDialog category={category} open={editOpen} onOpenChange={setEditOpen} />
					) : null}
					<IconTooltip
						disabled={category.isDefault}
						label={category.isDefault ? m["common.editDisabledDefaultCatalog"]() : m["common.delete"]()}
					>
						<Button
							type="button"
							variant="outline"
							size="icon-sm"
							disabled={category.isDefault}
							aria-label={
								category.isDefault ? m["common.editDisabledDefaultCatalog"]() : m["common.delete"]()
							}
							onClick={() => setDeleteOpen(true)}
						>
							<Trash2Icon className="size-4" />
						</Button>
					</IconTooltip>
					<DeleteConfirmDialog
						open={deleteOpen}
						onOpenChange={setDeleteOpen}
						title={m["collections.speciesCategory.delete"]()}
						description={label ?? ""}
						isPending={del.isPending}
						onConfirm={async () => {
							await del.mutateAsync({ id: category.id });
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
										to="/catalog/species"
										search={{ category: String(category.id) }}
										aria-label={m["common.openRelatedList"]()}
									>
										{m["collections.species.titlePlural"]()}
									</Link>
								</Button>
							</DropdownMenuItem>
							<DropdownMenuItem asChild>
								<Button asChild variant="outline" size="xs">
									<Link
										to="/catalog/cultivars"
										search={{ category: String(category.id), species: "" }}
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
										search={{ category: String(category.id), species: "", cultivar: "" }}
										aria-label={m["common.openRelatedList"]()}
									>
										{m["collections.plant.titlePlural"]()}
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
