import type { HydratedPlantEntity } from "@backend/core/domain/gardening/entities";
import { Link } from "@tanstack/react-router";
import { PencilIcon, Trash2Icon } from "lucide-react";
import { useState } from "react";
import { PlantUpdateDialog } from "@/components/gardening/plant/plant-update-dialog";
import { DeleteConfirmDialog } from "@/components/gardening/shared/delete-confirm-dialog";
import { ItemPresentationIcon } from "@/components/icon/item-presentation-icon";
import { Button } from "@/components/ui/button";
import { ButtonTooltip } from "@/components/ui/button-tooltip";
import { Card, CardContent } from "@/components/ui/card";
import * as m from "@/paraglide/messages.js";
import { usePlantDeleteMutation } from "@/store/mutations";

function humanizeToken(value: string): string {
	return value
		.replace(/([a-z])([A-Z])/g, "$1 $2")
		.replace(/[_-]+/g, " ")
		.trim()
		.replace(/\b\w/g, (char) => char.toUpperCase());
}

function resolveSpeciesDisplayName(rawSpeciesName: string): string {
	const trimmed = rawSpeciesName.trim();
	if (trimmed === "") return trimmed;
	if (!trimmed.includes(".")) return trimmed;

	const fn = (m as Record<string, unknown>)[trimmed];
	if (typeof fn === "function") return (fn as () => string)();

	if (trimmed.endsWith(".name")) {
		const parts = trimmed.split(".");
		const token = parts[parts.length - 2] ?? "";
		if (token) return humanizeToken(token);
	}
	return trimmed;
}

export function getPlantDisplayTitle(plant: HydratedPlantEntity): string {
	if (plant.title?.trim()) return plant.title.trim();

	return plant.cultivar.characteristics.name || m["items.untitled"]();
}

type Props = {
	plant: HydratedPlantEntity;
	isPlaced?: boolean;
};

export function PlantListCard({ plant, isPlaced = false }: Props) {
	const [editOpen, setEditOpen] = useState(false);
	const [deleteOpen, setDeleteOpen] = useState(false);
	const del = usePlantDeleteMutation();
	const speciesLabel = resolveSpeciesDisplayName(plant.cultivar.species.characteristics.name);
	const title = getPlantDisplayTitle(plant);

	return (
		<Card type="item" className="relative h-full transition-colors hover:bg-card/80">
			<CardContent className="relative flex flex-row items-center justify-between gap-3">
				<Link
					to="/plant/$plantId"
					params={{ plantId: String(plant.id) }}
					className="absolute inset-0 z-0 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
					aria-label={`${title} — ${m["common.open"]()} ${m["common.details"]().toLowerCase()}`}
				/>
				<div className="pointer-events-none relative z-10 flex min-w-0 flex-1 flex-row items-center gap-2">
					<ItemPresentationIcon presentation={plant.cultivar.presentation} />
					<div className="flex min-w-0 flex-col items-start justify-center">
						<span className="truncate font-medium">{title}</span>
						<span className="text-muted-foreground text-xs">
							{speciesLabel} · {plant.cultivar.characteristics.name}
						</span>
					</div>
					{plant.description ? (
						<span className="line-clamp-2 text-muted-foreground text-xs">{plant.description}</span>
					) : null}
				</div>
				<div className="relative z-20 flex shrink-0 items-center gap-1">
					<ButtonTooltip label={m["common.edit"]()}>
						<Button
							type="button"
							variant="outline"
							size="icon-sm"
							aria-label={m["common.edit"]()}
							onClick={() => setEditOpen(true)}
						>
							<PencilIcon className="size-4" />
						</Button>
					</ButtonTooltip>
					<PlantUpdateDialog plant={plant} open={editOpen} onOpenChange={setEditOpen} />
					<ButtonTooltip
						disabled={!isPlaced}
						label={isPlaced ? m["common.deleteDisabledWhilePlaced"]() : m["common.delete"]()}
					>
						<Button
							type="button"
							variant="outline"
							size="icon-sm"
							disabled={isPlaced}
							aria-label={isPlaced ? m["common.deleteDisabledWhilePlaced"]() : m["common.delete"]()}
							onClick={() => {
								if (isPlaced) return;
								setDeleteOpen(true);
							}}
						>
							<Trash2Icon className="size-4" />
						</Button>
					</ButtonTooltip>
					<DeleteConfirmDialog
						open={deleteOpen}
						onOpenChange={setDeleteOpen}
						title={m["collections.plant.delete"]()}
						description={title}
						isPending={del.isPending}
						onConfirm={async () => {
							await del.mutateAsync({ id: plant.id });
							setDeleteOpen(false);
						}}
					/>
				</div>
			</CardContent>
		</Card>
	);
}
