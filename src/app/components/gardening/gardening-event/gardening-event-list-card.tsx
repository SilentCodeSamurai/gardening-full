import { Link } from "@tanstack/react-router";
import { PencilIcon } from "lucide-react";
import { useState } from "react";
import { GardeningActionPresentationIcon } from "@/components/gardening/gardening-action-icon";
import { GardeningEventUpdateDialog } from "@/components/gardening/gardening-event/gardening-event-update-dialog";
import { Button } from "@/components/ui/button";
import { ButtonTooltip } from "@/components/ui/button-tooltip";
import { Card, CardContent } from "@/components/ui/card";
import { pendingItemSurfaceClassName } from "@/components/ui/pending-item-surface";
import { gardeningActionMessage } from "@/lib/gardening-action-messages";
import { cn } from "@/lib/utils";
import * as m from "@/paraglide/messages.js";
import { getLocale } from "@/paraglide/runtime";
import type { CachedGardeningEvent } from "@/store/query-cache-types";
import { isQueryObjectPending } from "@/store/query-object-status";

type Props = {
	event: CachedGardeningEvent;
};
export function GardeningEventListCard({ event }: Props) {
	const [editOpen, setEditOpen] = useState(false);
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
		<Card
			type="item"
			className={cn(
				"relative h-full py-1 transition-colors",
				!syncPending && "hover:bg-card/80",
				syncPending && pendingItemSurfaceClassName,
			)}
			data-pending={syncPending ? "true" : undefined}
			aria-busy={syncPending || undefined}
		>
			<CardContent className="relative flex flex-row items-center justify-between gap-1">
				<Link
					to="/gardening-event/$gardeningEventId"
					params={{ gardeningEventId: String(event.id) }}
					className="absolute inset-0 z-0 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
					aria-label={`${actionLabel}, ${when} — ${m.common_open()} ${m.common_details().toLowerCase()}`}
				/>
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
				<div className="relative z-20 flex shrink-0 items-center">
					<ButtonTooltip
						disabled={syncPending}
						label={syncPending ? m.common_editDisabledPendingSync() : m.common_edit()}
					>
						<Button
							type="button"
							variant="outline"
							size="icon-sm"
							disabled={syncPending}
							aria-label={syncPending ? m.common_editDisabledPendingSync() : m.common_edit()}
							onClick={() => setEditOpen(true)}
						>
							<PencilIcon />
						</Button>
					</ButtonTooltip>
					<GardeningEventUpdateDialog event={event} open={editOpen} onOpenChange={setEditOpen} />
				</div>
			</CardContent>
		</Card>
	);
}
