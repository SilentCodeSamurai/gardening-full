import type { LocationEntityId } from "@backend/core/domain/gardening/entities";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { LayoutGridIcon, PencilIcon, Trash2Icon } from "lucide-react";
import { useMemo, useState } from "react";
import { DashboardPageContent } from "#/app/components/layout/dashboard-page-content";
import { DashboardPageHeading } from "#/app/components/layout/dashboard-page-heading";
import { GardeningActionPresentationIcon } from "@/components/gardening/gardening-action-icon";
import { LocationUpdateDialog } from "@/components/gardening/location/location-update-dialog";
import { getPlantDisplayTitle } from "@/components/gardening/plant/plant-list-card";
import { DeleteConfirmDialog } from "@/components/gardening/shared/delete-confirm-dialog";
import { ItemPresentationIcon } from "@/components/icon/item-presentation-icon";
import { ItemNotFound } from "@/components/layout/item-not-found";
import { PageLoading } from "@/components/layout/page-loading";
import { Button } from "@/components/ui/button";
import { ButtonTooltip } from "@/components/ui/button-tooltip";
import { gardeningActionMessage } from "@/lib/gardening-action-messages";
import { getLocationPlacementSummary } from "@/lib/spatial-placement-summary";
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
	const { data: allLocations, isPending, isError } = useQuery({ ...queryKeys.location.all });
	const { data: plantsData } = useQuery({ ...queryKeys.plant.all });
	const { data: eventsData, isPending: eventsPending } = useQuery({
		...queryKeys.gardeningEvent.forLocation(id),
	});
	const { data: spatialData } = useQuery({
		...queryKeys.spatial.allNodes,
		placeholderData: (previous) => previous,
	});
	const data = useMemo(
		() => allLocations?.items.find((item) => String(item.id) === String(id)) ?? null,
		[allLocations?.items, id],
	);
	const parentLocation = useMemo(() => {
		if (!data) return null;
		const summary = getLocationPlacementSummary(spatialData?.items ?? [], data, allLocations?.items ?? []);
		if (summary.kind !== "underParent") return null;
		return allLocations?.items.find((loc) => String(loc.id) === String(summary.parentLocationId)) ?? null;
	}, [allLocations?.items, data, spatialData?.items]);
	const events = eventsData?.items ?? [];
	const locations = allLocations?.items ?? [];
	const plants = plantsData?.items ?? [];
	const { childLocations, childPlants } = useMemo(() => {
		if (!data) return { childLocations: [], childPlants: [] };
		const spatialItems = spatialData?.items ?? [];
		const currentNode =
			spatialItems.find(
				(node) => node.ref.entity === "location" && String(node.ref.entityId) === String(data.id),
			) ?? null;
		if (!currentNode) return { childLocations: [], childPlants: [] };

		const childNodes = spatialItems.filter(
			(node) => node.parentId != null && String(node.parentId) === String(currentNode.id),
		);

		const childLocationIds = new Set(
			childNodes.filter((node) => node.ref.entity === "location").map((node) => String(node.ref.entityId)),
		);
		const childPlantIds = new Set(
			childNodes.filter((node) => node.ref.entity === "plant").map((node) => String(node.ref.entityId)),
		);

		return {
			childLocations: locations.filter((location) => childLocationIds.has(String(location.id))),
			childPlants: plants.filter((plant) => childPlantIds.has(String(plant.id))),
		};
	}, [data, locations, plants, spatialData?.items]);

	if (isPending) {
		return <PageLoading />;
	}
	if (isError || !data) {
		return <ItemNotFound resourceLabel={m.collections_location_title()} />;
	}
	const isPlaced = getSpatialPlacementStatusByRef(spatialData?.items ?? [], {
		entity: "location",
		entityId: String(data.id),
	}).isPlaced;
	return (
		<div id="location-details-page" className="flex min-h-0 flex-1 flex-col overflow-hidden">
			<DashboardPageHeading className="min-w-0 flex-wrap" collection="location">
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
						disabled={isPlaced}
						label={isPlaced ? m.common_location_deleteDisabledWhilePlaced() : m.common_delete()}
					>
						<Button
							type="button"
							variant="destructive"
							size="icon"
							disabled={isPlaced}
							aria-label={isPlaced ? m.common_location_deleteDisabledWhilePlaced() : m.common_delete()}
							onClick={() => {
								if (isPlaced) return;
								setDeleteOpen(true);
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
							setDeleteOpen(false);
							await del.mutateAsync({ id: data.id });
							await navigate({ to: "/locations" });
						}}
					/>
				</div>
			</DashboardPageHeading>
			<DashboardPageContent className="flex flex-col gap-6 overflow-y-auto pb-6">
				<div>
					<Button asChild type="button" variant="outline" size="lg" id="location-open-layout-editor">
						<Link
							to="/location/$locationId/layout"
							params={{ locationId: String(data.id) }}
						>
							<LayoutGridIcon />
							{m.components_locationLayoutEditor_openLayoutEditor()}
						</Link>
					</Button>
				</div>

				<div className="space-y-3">
					<h2 className="font-medium text-lg">{m.components_detail_metaHeading()}</h2>
					<section className="rounded-xl border border-border/70 bg-muted/15 p-4 shadow-sm">
						<dl className="grid gap-x-4 gap-y-3 text-sm sm:grid-cols-[minmax(9rem,auto)_1fr]">
							<div className="contents">
								<dt className="text-muted-foreground">{m.fields_title()}</dt>
								<dd className="wrap-break-word min-w-0">{data.name}</dd>
							</div>
							<div className="contents">
								<dt className="text-muted-foreground">{m.components_detail_field_parentLocation()}</dt>
								<dd className="wrap-break-word min-w-0">
									{parentLocation ? (
										<Link
											to="/location/$locationId"
											params={{ locationId: String(parentLocation.id) }}
											className="inline-flex items-center gap-2 text-primary underline-offset-4 hover:underline"
										>
											<ItemPresentationIcon presentation={parentLocation.presentation} />
											<span className="min-w-0 truncate">{parentLocation.name}</span>
										</Link>
									) : (
										<span className="text-muted-foreground">
											{m.components_detail_field_rootLocation()}
										</span>
									)}
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
					<h2 className="font-medium text-lg">{m.common_related()}</h2>
					<div className="grid gap-4 lg:grid-cols-2">
						<section className="rounded-xl border border-border/70 bg-card/60 p-4 shadow-sm">
							<h3 className="mb-3 font-medium text-sm">{m.collections_location_titlePlural()}</h3>
							{childLocations.length === 0 ? (
								<p className="text-muted-foreground text-sm">{m.items_noElements()}</p>
							) : (
								<ul className="space-y-2">
									{childLocations.map((location) => (
										<li key={String(location.id)}>
											<Link
												to="/location/$locationId"
												params={{ locationId: String(location.id) }}
												className="inline-flex min-w-0 items-center gap-2 text-primary underline-offset-4 hover:underline"
											>
												<ItemPresentationIcon presentation={location.presentation} />
												<span className="truncate">{location.name}</span>
											</Link>
										</li>
									))}
								</ul>
							)}
						</section>

						<section className="rounded-xl border border-border/70 bg-card/60 p-4 shadow-sm">
							<h3 className="mb-3 font-medium text-sm">{m.collections_plant_titlePlural()}</h3>
							{childPlants.length === 0 ? (
								<p className="text-muted-foreground text-sm">{m.items_noElements()}</p>
							) : (
								<ul className="space-y-2">
									{childPlants.map((plant) => (
										<li key={String(plant.id)}>
											<Link
												to="/plant/$plantId"
												params={{ plantId: String(plant.id) }}
												className="inline-flex min-w-0 items-center gap-2 text-primary underline-offset-4 hover:underline"
											>
												<ItemPresentationIcon presentation={plant.presentation} />
												<span className="truncate">{getPlantDisplayTitle(plant)}</span>
											</Link>
										</li>
									))}
								</ul>
							)}
						</section>
					</div>
				</section>

				<section className="space-y-3">
					<h2 className="font-medium text-lg">{m.components_detail_eventsSection_title()}</h2>
					{eventsPending ? (
						<PageLoading variant="section" label={m.components_detail_eventsSection_loading()} />
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
												{event.occurredAt === null
													? m.common_unknown()
													: event.occurredAt.toLocaleString(getLocale(), {
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
			</DashboardPageContent>
		</div>
	);
}
