import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import type { GardeningEventEntity } from "@backend/core/domain/gardening/entities";
import { GardeningActionPresentationIcon } from "@/components/gardening/gardening-action-icon";
import { GardeningEventUpdateDialog } from "@/components/gardening/gardening-event/gardening-event-update-dialog";
import { Button } from "@/components/ui/button";
import { ButtonTooltip } from "@/components/ui/button-tooltip";
import { Link } from "@tanstack/react-router";
import { PencilIcon } from "lucide-react";
import * as m from "@/paraglide/messages.js";
import { getLocale } from "@/paraglide/runtime";

type Props = {
	event: GardeningEventEntity;
};
export function GardeningEventListCard({ event }: Props) {
	const [editOpen, setEditOpen] = useState(false);
	const actionLabel = m[`gardeningActions.${event.action.type}` as keyof typeof m]();
	const when = event.createdAt.toLocaleString(getLocale(), {
		dateStyle: "short",
		timeStyle: "short",
	});

	return (
		<Card type="item" className="relative h-full py-1 transition-colors hover:bg-card/80">
			<CardContent className="relative flex flex-row items-center justify-between gap-1">
				<Link
					to="/gardening-event/$gardeningEventId"
					params={{ gardeningEventId: String(event.id) }}
					className="absolute inset-0 z-0 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
					aria-label={`${actionLabel}, ${when} — ${m["common.open"]()} ${m["common.details"]().toLowerCase()}`}
				/>
				<div className="relative z-10 flex min-w-0 flex-1 flex-row items-center gap-2 pointer-events-none">
					<GardeningActionPresentationIcon action={event.action} />
					<div className="flex min-w-0 flex-col justify-center items-start">
						<span className="font-medium capitalize">{actionLabel}</span>
						<span className="text-muted-foreground text-xs">{when}</span>
					</div>
					{event.action.content ? (
						<span className="line-clamp-2 text-muted-foreground text-xs">{event.action.content}</span>
					) : null}
				</div>
				<div className="relative z-20 flex shrink-0 items-center">
					<ButtonTooltip label={m["common.edit"]()}>
						<Button
							type="button"
							variant="outline"
							size="icon-sm"
							aria-label={m["common.edit"]()}
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
