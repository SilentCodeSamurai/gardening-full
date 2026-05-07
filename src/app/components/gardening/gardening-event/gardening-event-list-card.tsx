import { Link } from "@tanstack/react-router";
import { EllipsisVerticalIcon, PencilIcon, Trash2Icon } from "lucide-react";
import { useState } from "react";
import { GardeningActionPresentationIcon } from "@/components/gardening/gardening-action-icon";
import { GardeningEventUpdateDialog } from "@/components/gardening/gardening-event/gardening-event-update-dialog";
import { DeleteConfirmDialog } from "@/components/gardening/shared/delete-confirm-dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Item, ItemActions } from "@/components/ui/item";
import { pendingItemSurfaceClassName } from "@/components/ui/pending-item-surface";
import { gardeningActionMessage } from "@/lib/gardening-action-messages";
import { cn } from "@/lib/utils";
import * as m from "@/paraglide/messages.js";
import { getLocale } from "@/paraglide/runtime";
import { useGardeningEventDeleteMutation } from "@/store/mutations";
import type { CachedGardeningEvent } from "@/store/query-cache-types";
import { isQueryObjectPending } from "@/store/query-object-status";

type Props = {
	event: CachedGardeningEvent;
	selected?: boolean;
	onSelectedChange?: (next: boolean) => void;
};
export function GardeningEventListCard({ event, selected = false, onSelectedChange }: Props) {
	const [editOpen, setEditOpen] = useState(false);
	const [deleteOpen, setDeleteOpen] = useState(false);
	const del = useGardeningEventDeleteMutation();
	const actionLabel = gardeningActionMessage(event.action.type);
	const when =
		event.occurredAt === null
			? m.common_unknown()
			: event.occurredAt.toLocaleString(getLocale(), {
					dateStyle: "short",
					timeStyle: "short",
				});
	const syncPending = isQueryObjectPending(event);

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
					to="/gardening-event/$gardeningEventId"
					params={{ gardeningEventId: String(event.id) }}
					className="absolute inset-0 z-0 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
					aria-label={`${actionLabel}, ${when} — ${m.common_open()} ${m.common_details().toLowerCase()}`}
				/>
				<div className="relative z-20 flex shrink-0 items-center justify-center">
					<Checkbox
						aria-label={m.table_selectRow({ name: `${actionLabel}, ${when}` })}
						checked={selected}
						className="size-5"
						onCheckedChange={(checked) => onSelectedChange?.(checked === true)}
					/>
				</div>
				<div className="pointer-events-none relative z-10 flex min-w-0 flex-1 flex-row items-center gap-2">
					<GardeningActionPresentationIcon action={event.action} />
					<div className="flex min-w-0 flex-col items-start justify-center">
						<span className="font-medium capitalize">{actionLabel}</span>
						<span className="text-muted-foreground text-xs">{when}</span>
					</div>
					{event.action.content ? (
						<span className="line-clamp-2 text-muted-foreground text-xs">{event.action.content}</span>
					) : null}
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
								disabled={syncPending}
								title={syncPending ? m.common_editDisabledPendingSync() : m.common_edit()}
								onSelect={() => setEditOpen(true)}
							>
								<PencilIcon />
								{m.common_edit()}
							</DropdownMenuItem>
							<DropdownMenuItem
								disabled={syncPending}
								title={syncPending ? m.common_editDisabledPendingSync() : m.common_delete()}
								onSelect={() => setDeleteOpen(true)}
							>
								<Trash2Icon />
								{m.common_delete()}
							</DropdownMenuItem>
						</DropdownMenuContent>
					</DropdownMenu>
					<GardeningEventUpdateDialog event={event} open={editOpen} onOpenChange={setEditOpen} />
					<DeleteConfirmDialog
						open={deleteOpen}
						onOpenChange={setDeleteOpen}
						title={m.collections_gardeningEvent_delete()}
						description={gardeningActionMessage(event.action.type)}
						isPending={del.isPending}
						onConfirm={async () => {
							setDeleteOpen(false);
							await del.mutateAsync({ id: event.id });
						}}
					/>
				</ItemActions>
			</div>
		</Item>
	);
}
