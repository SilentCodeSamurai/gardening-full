import type { LocationEntityId } from "@backend/core/domain/gardening/entities";
import { Link } from "@tanstack/react-router";
import { EllipsisVerticalIcon, PencilIcon, PlusIcon, Trash2Icon } from "lucide-react";
import { useState } from "react";
import {
	GardeningEventCreateDialog,
} from "@/components/gardening/gardening-event/gardening-event-create-dialog";
import { LocationUpdateDialog } from "@/components/gardening/location/location-update-dialog";
import { DeleteConfirmDialog } from "@/components/gardening/shared/delete-confirm-dialog";
import { ItemPresentationIcon } from "@/components/icon/item-presentation-icon";
import { Button } from "@/components/ui/button";
import { ButtonTooltip } from "@/components/ui/button-tooltip";
import { Checkbox } from "@/components/ui/checkbox";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Item, ItemActions } from "@/components/ui/item";
import { pendingItemSurfaceClassName } from "@/components/ui/pending-item-surface";
import type { LocationPlacementSummary } from "@/lib/spatial-placement-summary";
import { cn } from "@/lib/utils";
import * as m from "@/paraglide/messages.js";
import { useLocationDeleteMutation } from "@/store/mutations";
import type { CachedLocation } from "@/store/query-cache-types";
import { isQueryObjectPending } from "@/store/query-object-status";

function placementSubtitle(summary: LocationPlacementSummary, rootLabel: string): string {
	if (summary.kind === "unplaced") return m.filtering_placedFilterUnplaced();
	if (summary.kind === "rootCanvas") return rootLabel;
	return summary.parentName;
}

type Props = {
	location: CachedLocation;
	placementSummary: LocationPlacementSummary;
	isPlaced: boolean;
	selected?: boolean;
	onSelectedChange?: (next: boolean) => void;
};

export function LocationListCard({
	location,
	placementSummary,
	isPlaced,
	selected = false,
	onSelectedChange,
}: Props) {
	const [editOpen, setEditOpen] = useState(false);
	const [deleteOpen, setDeleteOpen] = useState(false);
	const [createEventOpen, setCreateEventOpen] = useState(false);
	const del = useLocationDeleteMutation();
	const syncPending = isQueryObjectPending(location);
	const placementLine = placementSubtitle(placementSummary, m.fields_placementRoot());

	const deleteTitle = isPlaced
		? m.common_deleteDisabledWhilePlaced()
		: syncPending
			? m.common_editDisabledPendingSync()
			: m.common_delete();
	const actionLocked = syncPending;

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
					to="/location/$locationId"
					params={{ locationId: String(location.id) }}
					className="absolute inset-0 z-0 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
					aria-label={`${location.name} — ${m.common_open()} ${m.common_details().toLowerCase()}`}
				/>
				<div className="relative z-20 flex shrink-0 items-center justify-center">
					<Checkbox
						aria-label={m.table_selectRow({ name: location.name })}
						checked={selected}
						className="size-5"
						onCheckedChange={(checked) => onSelectedChange?.(checked === true)}
					/>
				</div>
				<div className="pointer-events-none relative z-10 flex min-w-0 flex-1 flex-row items-center gap-2">
					<ItemPresentationIcon presentation={location.presentation} className="size-6 shrink-0" />
					<div className="flex min-w-0 flex-col items-start justify-center">
						<span className="truncate font-medium">{location.name}</span>
						<span className="text-muted-foreground text-xs">{placementLine}</span>
					</div>
				</div>
				<ItemActions className="relative z-20 shrink-0 gap-1">
					<DropdownMenu>
						<DropdownMenuTrigger asChild>
							<Button type="button" variant="outline" size="icon" aria-label={m.common_actions()}>
								<EllipsisVerticalIcon />
							</Button>
						</DropdownMenuTrigger>
						<DropdownMenuContent className="flex flex-col gap-1" align="end">
							<DropdownMenuItem
								disabled={actionLocked}
								title={
									actionLocked
										? m.common_editDisabledPendingSync()
										: m.collections_gardeningEvent_createForLocationRowHint()
								}
								onSelect={() => setCreateEventOpen(true)}
							>
								<PlusIcon />
								{m.collections_gardeningEvent_create()}
							</DropdownMenuItem>
							<DropdownMenuItem
								disabled={actionLocked}
								title={actionLocked ? m.common_editDisabledPendingSync() : m.common_edit()}
								onSelect={() => setEditOpen(true)}
							>
								<PencilIcon />
								{m.common_edit()}
							</DropdownMenuItem>

							{isPlaced || actionLocked ? (
								<ButtonTooltip label={deleteTitle} disabled>
									<DropdownMenuItem disabled title={deleteTitle}>
										<Trash2Icon />
										{m.common_delete()}
									</DropdownMenuItem>
								</ButtonTooltip>
							) : (
								<DropdownMenuItem onSelect={() => setDeleteOpen(true)} title={deleteTitle}>
									<Trash2Icon />
									{m.common_delete()}
								</DropdownMenuItem>
							)}
						</DropdownMenuContent>
					</DropdownMenu>
					<LocationUpdateDialog location={location} open={editOpen} onOpenChange={setEditOpen} />
					<GardeningEventCreateDialog
						open={createEventOpen}
						onOpenChange={setCreateEventOpen}
						initialValues={{
							target: "location",
							locationId: location.id as LocationEntityId,
						}}
					/>
					<DeleteConfirmDialog
						open={deleteOpen}
						onOpenChange={setDeleteOpen}
						title={m.collections_location_delete()}
						description={location.name}
						isPending={del.isPending}
						onConfirm={async () => {
							setDeleteOpen(false);
							await del.mutateAsync({ id: location.id });
						}}
					/>
				</ItemActions>
			</div>
		</Item>
	);
}
