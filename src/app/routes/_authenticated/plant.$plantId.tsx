import type { PlantEntityId } from "@backend/core/domain/gardening/entities";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { PencilIcon, Trash2Icon } from "lucide-react";
import { useMemo, useState } from "react";
import { DashboardPageContent } from "#/app/components/layout/dashboard-page-content";
import { DashboardPageHeading } from "#/app/components/layout/dashboard-page-heading";
import { GardeningActionPresentationIcon } from "@/components/gardening/gardening-action-icon";
import { getPlantDisplayTitle } from "@/components/gardening/plant/plant-list-card";
import { PlantUpdateDialog } from "@/components/gardening/plant/plant-update-dialog";
import { DeleteConfirmDialog } from "@/components/gardening/shared/delete-confirm-dialog";
import { ItemPresentationIcon } from "@/components/icon/item-presentation-icon";
import { ItemNotFound } from "@/components/layout/item-not-found";
import { PageLoading } from "@/components/layout/page-loading";
import { Button } from "@/components/ui/button";
import { ButtonTooltip } from "@/components/ui/button-tooltip";
import { gardeningActionMessage } from "@/lib/gardening-action-messages";
import { getPlantPlacementSummary } from "@/lib/spatial-placement-summary";
import { translateCatalogField } from "@/lib/translate-catalog-field";
import * as m from "@/paraglide/messages.js";
import { getLocale } from "@/paraglide/runtime";
import { queryKeys } from "@/store/keys";
import { usePlantDeleteMutation } from "@/store/mutations";
import { getSpatialPlacementStatusByRef } from "@/store/spatial-placement";

export const Route = createFileRoute("/_authenticated/plant/$plantId")({
	component: PlantDetailPage,
});

function PlantDetailPage() {
	const [editOpen, setEditOpen] = useState(false);
	const [deleteOpen, setDeleteOpen] = useState(false);
	const navigate = useNavigate();
	const del = usePlantDeleteMutation();
	const { plantId } = Route.useParams();
	const { data: plantsData, isPending, isError } = useQuery({ ...queryKeys.plant.all });
	const { data: eventsData, isPending: eventsPending } = useQuery({
		...queryKeys.gardeningEvent.forPlant(plantId as PlantEntityId),
	});
	const { data: spatialData } = useQuery({
		...queryKeys.spatial.allNodes,
		placeholderData: (previous) => previous,
	});
	const { data: locationsData } = useQuery({ ...queryKeys.location.all });
	const data = useMemo(
		() => plantsData?.items.find((item) => String(item.id) === String(plantId)) ?? null,
		[plantId, plantsData?.items],
	);

	if (isPending) {
		return <PageLoading />;
	}
	if (isError || !data) {
		return <ItemNotFound resourceLabel={m.collections_plant_title()} />;
	}

	const title = getPlantDisplayTitle(data);
	const cultivar = data.cultivar;
	const species = cultivar?.species ?? null;
	const events = eventsData?.items ?? [];
	const plantPlacement = getPlantPlacementSummary(
		spatialData?.items ?? [],
		String(data.id),
		locationsData?.items ?? [],
	);
	const isPlaced = getSpatialPlacementStatusByRef(spatialData?.items ?? [], {
		entity: "plant",
		entityId: String(data.id),
	}).isPlaced;

	return (
		<div className="flex min-h-0 flex-1 flex-col overflow-hidden">
			<DashboardPageHeading className="min-w-0 flex-wrap" collection="plant">
				<div className="flex min-w-0 flex-wrap items-center gap-3">
					<ItemPresentationIcon presentation={data.presentation} />
					<h1 className="font-heading font-medium text-lg">{title}</h1>
				</div>
				<div className="auto flex shrink-0 items-center gap-1">
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
						label={isPlaced ? m.common_plant_deleteDisabledWhilePlaced() : m.common_delete()}
					>
						<Button
							type="button"
							variant="destructive"
							size="icon"
							disabled={isPlaced}
							aria-label={isPlaced ? m.common_plant_deleteDisabledWhilePlaced() : m.common_delete()}
							onClick={() => {
								if (isPlaced) return;
								setDeleteOpen(true);
							}}
						>
							<Trash2Icon />
						</Button>
					</ButtonTooltip>
					<PlantUpdateDialog plant={data} open={editOpen} onOpenChange={setEditOpen} />
					<DeleteConfirmDialog
						open={deleteOpen}
						onOpenChange={setDeleteOpen}
						title={m.collections_plant_delete()}
						description={title}
						isPending={del.isPending}
						onConfirm={async () => {
							setDeleteOpen(false);
							await del.mutateAsync({ id: data.id });
							await navigate({
								to: "/plants",
								search: { category: "", species: "", cultivar: "" },
							});
						}}
					/>
				</div>
			</DashboardPageHeading>
			<DashboardPageContent className="flex flex-col gap-6 overflow-y-auto pb-6">
				<div className="space-y-3">
					<h2 className="font-medium text-lg">{m.components_detail_metaHeading()}</h2>
					<section className="rounded-xl border border-border/70 bg-muted/15 p-4 shadow-sm">
						<dl className="grid gap-x-4 gap-y-3 text-sm sm:grid-cols-[minmax(9rem,auto)_1fr]">
							<div className="contents">
								<dt className="text-muted-foreground">{m.fields_title()}</dt>
								<dd className="wrap-break-word min-w-0">{title}</dd>
							</div>
							<div className="contents">
								<dt className="text-muted-foreground">{m.fields_description()}</dt>
								<dd className="wrap-break-word min-w-0 whitespace-pre-wrap">
									{data.description?.trim() ? (
										data.description
									) : (
										<span className="text-muted-foreground italic">
											{m.components_detail_field_noDescription()}
										</span>
									)}
								</dd>
							</div>
							<div className="contents">
								<dt className="text-muted-foreground">{m.collections_cultivar_title()}</dt>
								<dd className="wrap-break-word min-w-0">
									{cultivar ? (
										<Link
											to="/catalog/cultivar/$cultivarId"
											params={{ cultivarId: String(cultivar.id) }}
											className="inline-flex items-center gap-2 text-primary underline-offset-4 hover:underline"
										>
											<ItemPresentationIcon presentation={cultivar.presentation} />
											<span className="min-w-0 truncate">{cultivar.characteristics.name}</span>
										</Link>
									) : (
										<span className="text-muted-foreground">{m.filtering_catalogNoCultivar()}</span>
									)}
								</dd>
							</div>
							<div className="contents">
								<dt className="text-muted-foreground">{m.collections_species_title()}</dt>
								<dd className="wrap-break-word min-w-0">
									{species ? (
										<Link
											to="/catalog/species-detail/$speciesId"
											params={{ speciesId: String(species.id) }}
											search={{ category: String(species.categoryId ?? "") }}
											className="inline-flex items-center gap-2 text-primary underline-offset-4 hover:underline"
										>
											<ItemPresentationIcon presentation={species.presentation} />
											<span className="min-w-0 truncate">
												{translateCatalogField(
													species.characteristics.name,
													species.systemCatalog,
												)}
											</span>
										</Link>
									) : (
										<span className="text-muted-foreground">{m.filtering_catalogNoSpecies()}</span>
									)}
								</dd>
							</div>
							<div className="contents">
								<dt className="text-muted-foreground">{m.collections_location_title()}</dt>
								<dd className="wrap-break-word min-w-0">
									{plantPlacement.kind === "underLocation" ? (
										<Link
											to="/location/$locationId"
											params={{ locationId: plantPlacement.locationId }}
											className="inline-flex items-center gap-2 text-primary underline-offset-4 hover:underline"
										>
											<ItemPresentationIcon presentation={plantPlacement.locationPresentation} />
											<span className="min-w-0 truncate">{plantPlacement.locationName}</span>
										</Link>
									) : (
										<span className="text-muted-foreground">
											{m.components_detail_field_unplaced()}
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
