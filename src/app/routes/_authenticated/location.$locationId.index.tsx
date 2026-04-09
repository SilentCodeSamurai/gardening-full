import type { LocationEntityId } from "@backend/core/domain/gardening/entities";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { PencilIcon, Trash2Icon } from "lucide-react";
import { useState } from "react";
import { GardeningActionPresentationIcon } from "@/components/gardening/gardening-action-icon";
import { LocationUpdateDialog } from "@/components/gardening/location/location-update-dialog";
import { DeleteConfirmDialog } from "@/components/gardening/shared/delete-confirm-dialog";
import { ItemPresentationIcon } from "@/components/icon/item-presentation-icon";
import { PageContent } from "@/components/layout/page-content";
import { PageHeading } from "@/components/layout/page-heading";
import { Button } from "@/components/ui/button";
import { ButtonTooltip } from "@/components/ui/button-tooltip";
import { gardeningActionMessage } from "@/lib/gardening-action-messages";
import * as m from "@/paraglide/messages.js";
import { getLocale } from "@/paraglide/runtime";
import { queryKeys } from "@/store/keys";
import { useLocationDeleteMutation } from "@/store/mutations";
import { getSpatialPlacementStatusByRef } from "@/store/spatial-placement";

export const Route = createFileRoute("/_authenticated/location/$locationId/")({
	component: LocationDetailPage,
});

function LocationDetailPage() {
	const [editOpen, setEditOpen] = useState(false);
	const [deleteOpen, setDeleteOpen] = useState(false);
	const navigate = useNavigate();
	const del = useLocationDeleteMutation();
	const { locationId } = Route.useParams();
	const id = locationId as LocationEntityId;
	const { data, isPending, isError } = useQuery({
		...queryKeys.location.detail(id),
	});
	const { data: allLocations } = useQuery({ ...queryKeys.location.all });
	const { data: eventsData, isPending: eventsPending } = useQuery({
		...queryKeys.gardeningEvent.forLocation(id),
	});
	const { data: spatialData } = useQuery({
		...queryKeys.spatial.allNodes,
		placeholderData: (previous) => previous,
	});

	if (isPending) {
		return <div className="text-muted-foreground text-sm">{m.common_loading()}</div>;
	}
	if (isError || !data) {
		return (
			<div className="text-destructive text-sm">
				{`${m.collections_location_title()} ${m.common_notFound()}`}
			</div>
		)
	}

	const events = eventsData?.items ?? [];
	const isPlaced = getSpatialPlacementStatusByRef(spatialData?.items ?? [], {
		entity: "location",
		entityId: String(data.id),
	}).isPlaced;
	return (
		<div className="flex min-h-0 flex-1 flex-col overflow-hidden">
			<PageHeading className="min-w-0 flex-wrap" collection="location">
				<div className="flex min-w-0 flex-wrap items-center gap-3">
					<ItemPresentationIcon presentation={data.presentation} />
					<h1 className="font-heading font-medium text-lg">{data.name}</h1>
				</div>
				<div className="flex shrink-0 items-center gap-1">
					<ButtonTooltip label={m.common_edit()}>
						<Button
							type="button"
							variant="outline"
							size="icon"
							aria-label={m.common_edit()}
							onClick={() => setEditOpen(true)}
						>
							<PencilIcon />
						</Button>
					</ButtonTooltip>
					<ButtonTooltip
						disabled={!isPlaced}
						label={isPlaced ? m.common_deleteDisabledWhilePlaced() : m.common_delete()}
					>
						<Button
							type="button"
							variant="destructive"
							size="icon"
							disabled={isPlaced}
							aria-label={isPlaced ? m.common_deleteDisabledWhilePlaced() : m.common_delete()}
							onClick={() => {
								if (isPlaced) return
								setDeleteOpen(true)
							}}
						>
							<Trash2Icon />
						</Button>
					</ButtonTooltip>
					<LocationUpdateDialog location={data} open={editOpen} onOpenChange={setEditOpen} />
					<DeleteConfirmDialog
						open={deleteOpen}
						onOpenChange={setDeleteOpen}
						title={m.collections_location_delete()}
						description={data.name}
						isPending={del.isPending}
						onConfirm={async () => {
							await del.mutateAsync({ id: data.id });
							setDeleteOpen(false);
							await navigate({ to: "/locations" });
						}}
					/>
				</div>
			</PageHeading>
			<PageContent className="flex flex-col gap-8 overflow-y-auto pb-6">
				<div className="space-y-4">
					<div className="flex flex-wrap gap-2">
						<Link
							to="/location/$locationId/layout"
							params={{ locationId: String(data.id) }}
							className="inline-flex items-center rounded-md bg-primary px-3 py-1.5 font-medium text-primary-foreground text-sm shadow-sm ring-1 ring-primary/20 transition-colors hover:bg-primary/90"
						>
							{m.components_locationLayoutEditor_openLayoutEditor()}
						</Link>
					</div>

					<section className="rounded-xl border border-border/70 bg-muted/15 p-4 shadow-sm">
						<h2 className="mb-3 font-semibold text-muted-foreground text-xs uppercase tracking-wide">
							{m.components_detail_metaHeading()}
						</h2>
						<dl className="grid gap-x-4 gap-y-3 text-sm sm:grid-cols-[minmax(9rem,auto)_1fr]">
							<div className="contents">
								<dt className="text-muted-foreground">
									{m.components_detail_field_parentLocation()}
								</dt>
								<dd className="wrap-break-word min-w-0">
									<span className="text-muted-foreground">
										{m.components_detail_field_rootLocation()}
									</span>
								</dd>
							</div>
							<div className="contents">
								<dt className="text-muted-foreground">{m.components_detail_field_layoutFrame()}</dt>
								<dd className="wrap-break-word min-w-0">
									<span className="text-muted-foreground">
										{m.components_detail_field_layoutFrame()}
									</span>
								</dd>
							</div>
							<div className="contents">
								<dt className="text-muted-foreground">
									{m.collections_location_titlePlural()}
								</dt>
								<dd className="wrap-break-word min-w-0">{allLocations?.items.length ?? 0}</dd>
							</div>
							<div className="contents">
								<dt className="text-muted-foreground">{m.components_detail_field_recordId()}</dt>
								<dd className="wrap-break-word min-w-0">
									<span className="font-mono text-xs">{String(data.id)}</span>
								</dd>
							</div>
							<div className="contents">
								<dt className="text-muted-foreground">{m.fields_createdAt()}</dt>
								<dd className="wrap-break-word min-w-0">
									{data.createdAt.toLocaleString(getLocale(), {
										dateStyle: "medium",
										timeStyle: "short",
									})}
								</dd>
							</div>
							<div className="contents">
								<dt className="text-muted-foreground">{m.fields_updatedAt()}</dt>
								<dd className="wrap-break-word min-w-0">
									{data.updatedAt.toLocaleString(getLocale(), {
										dateStyle: "medium",
										timeStyle: "short",
									})}
								</dd>
							</div>
						</dl>
					</section>
				</div>

				<section className="space-y-3">
					<h2 className="font-medium text-lg">{m.components_detail_eventsSection_title()}</h2>
					{eventsPending ? (
						<p className="text-muted-foreground text-sm">
							{m.components_detail_eventsSection_loading()}
						</p>
					) : events.length === 0 ? (
						<p className="rounded-lg border border-border/80 border-dashed bg-muted/10 px-4 py-6 text-center text-muted-foreground text-sm">
							{m.components_detail_eventsSection_empty()}
						</p>
					) : (
						<ul className="space-y-2">
							{events.map((event) => (
								<li key={String(event.id)}>
									<Link
										to="/gardening-event/$gardeningEventId"
										params={{ gardeningEventId: String(event.id) }}
										className="flex gap-3 rounded-lg border border-border/60 bg-card/40 p-3 shadow-sm transition-colors hover:border-border hover:bg-card/70"
									>
										<GardeningActionPresentationIcon
											action={event.action}
											className="size-9 shrink-0"
										/>
										<div className="min-w-0 flex-1">
											<div className="font-medium capitalize">
												{gardeningActionMessage(event.action.type)}
											</div>
											<div className="text-muted-foreground text-xs">
												{event.createdAt.toLocaleString(getLocale(), {
													dateStyle: "short",
													timeStyle: "short",
												})}
											</div>
											{event.action.content ? (
												<p className="mt-1 line-clamp-2 text-muted-foreground text-xs">
													{event.action.content}
												</p>
											) : null}
										</div>
									</Link>
								</li>
							))}
						</ul>
					)}
				</section>
			</PageContent>
		</div>
	)
}
