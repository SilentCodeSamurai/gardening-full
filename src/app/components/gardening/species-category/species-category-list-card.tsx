import type { SpeciesCategoryWithSystemCatalog } from "@backend/core/application/use-cases/gardening/species-category.crud-use-cases";
import { Link } from "@tanstack/react-router";
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
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { translateCatalogField } from "@/lib/translate-catalog-field";
import * as m from "@/paraglide/messages.js";
import { useSpeciesCategoryDeleteMutation } from "@/store/mutations";

type Props = {
	category: SpeciesCategoryWithSystemCatalog;
};

export function SpeciesCategoryListCard({ category }: Props) {
	const [editOpen, setEditOpen] = useState(false);
	const [deleteOpen, setDeleteOpen] = useState(false);
	const del = useSpeciesCategoryDeleteMutation();
	const label = translateCatalogField(category.title, category.systemCatalog);

	return (
		<Card type="item" className="relative transition-colors hover:bg-card/80">
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
					<ButtonTooltip
						disabled={category.systemCatalog}
						label={category.systemCatalog ? m.common_editDisabledDefaultCatalog() : m.common_edit()}
					>
						<Button
							type="button"
							variant="outline"
							size="icon-sm"
							disabled={category.systemCatalog}
							aria-label={category.systemCatalog ? m.common_editDisabledDefaultCatalog() : m.common_edit()}
							onClick={() => setEditOpen(true)}
						>
							{category.systemCatalog ? (
								<PencilOffIcon className="size-4" />
							) : (
								<PencilIcon className="size-4" />
							)}
						</Button>
					</ButtonTooltip>
					{!category.systemCatalog ? (
						<SpeciesCategoryUpdateDialog category={category} open={editOpen} onOpenChange={setEditOpen} />
					) : null}
					<ButtonTooltip
						disabled={category.systemCatalog}
						label={category.systemCatalog ? m.common_editDisabledDefaultCatalog() : m.common_delete()}
					>
						<Button
							type="button"
							variant="outline"
							size="icon-sm"
							disabled={category.systemCatalog}
							aria-label={category.systemCatalog ? m.common_editDisabledDefaultCatalog() : m.common_delete()}
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
