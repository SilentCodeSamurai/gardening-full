import type { PlantEntityId } from "@backend/core/domain/gardening/entities";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { PencilIcon, Trash2Icon } from "lucide-react";
import { useState } from "react";
import { GardeningActionPresentationIcon } from "@/components/gardening/gardening-action-icon";
import { getPlantDisplayTitle } from "@/components/gardening/plant/plant-list-card";
import { PlantUpdateDialog } from "@/components/gardening/plant/plant-update-dialog";
import { DeleteConfirmDialog } from "@/components/gardening/shared/delete-confirm-dialog";
import { ItemPresentationIcon } from "@/components/icon/item-presentation-icon";
import { PageContent } from "@/components/layout/page-content";
import { PageHeading } from "@/components/layout/page-heading";
import { Button } from "@/components/ui/button";
import { ButtonTooltip } from "@/components/ui/button-tooltip";
import { translateCatalogField } from "@/lib/translate-catalog-field";
import * as m from "@/paraglide/messages.js";
import { getLocale } from "@/paraglide/runtime";
import { queryKeys } from "@/store/keys";
import { usePlantDeleteMutation } from "@/store/mutations";
import { getSpatialPlacementStatusByRef } from "@/store/spatial-placement";

export const Route = createFileRoute("/plant/$plantId")({
	component: PlantDetailPage,
});

function PlantDetailPage() {
	const [editOpen, setEditOpen] = useState(false);
	const [deleteOpen, setDeleteOpen] = useState(false);
	const navigate = useNavigate();
	const del = usePlantDeleteMutation();
	const { plantId } = Route.useParams();
	const { data, isPending, isError } = useQuery({
		...queryKeys.plant.detail(plantId as PlantEntityId),
	});
	const { data: eventsData, isPending: eventsPending } = useQuery({
		...queryKeys.gardeningEvent.forPlant(plantId as PlantEntityId),
	});
	const { data: spatialData } = useQuery({
		...queryKeys.spatial.allNodes,
		placeholderData: (previous) => previous,
	});

	if (isPending) {
		return <div className="text-muted-foreground text-sm">{m["common.loading"]()}</div>;
	}
	if (isError || !data) {
		return (
			<div className="text-destructive text-sm">{`${m["collections.plant.title"]()} ${m["common.notFound"]()}`}</div>
		);
	}

	const title = getPlantDisplayTitle(data);
	const { cultivar } = data;
	const events = eventsData?.items ?? [];
	const isPlaced = getSpatialPlacementStatusByRef(spatialData?.items ?? [], {
		entity: "plant",
		entityId: String(data.id),
	}).isPlaced;

	return (
		<div className="flex min-h-0 flex-1 flex-col overflow-hidden">
			<PageHeading className="min-w-0 flex-wrap" collection="plant">
				<div className="flex min-w-0 flex-wrap items-center gap-3">
					<ItemPresentationIcon presentation={cultivar.presentation} />
					<h1 className="font-heading font-medium text-lg">{title}</h1>
				</div>
				<div className="auto flex shrink-0 items-center gap-1">
					<ButtonTooltip label={m["common.edit"]()}>
						<Button
							type="button"
							variant="outline"
							size="icon"
							aria-label={m["common.edit"]()}
							onClick={() => setEditOpen(true)}
						>
							<PencilIcon />
						</Button>
					</ButtonTooltip>
					<ButtonTooltip
						disabled={!isPlaced}
						label={isPlaced ? m["common.deleteDisabledWhilePlaced"]() : m["common.delete"]()}
					>
						<Button
							type="button"
							variant="destructive"
							size="icon"
							disabled={isPlaced}
							aria-label={isPlaced ? m["common.deleteDisabledWhilePlaced"]() : m["common.delete"]()}
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
						title={m["collections.plant.delete"]()}
						description={title}
						isPending={del.isPending}
						onConfirm={async () => {
							await del.mutateAsync({ id: data.id });
							setDeleteOpen(false);
							await navigate({
								to: "/plants",
								search: { category: "", species: "", cultivar: "" },
							});
						}}
					/>
				</div>
			</PageHeading>
			<PageContent className="flex flex-col gap-8 overflow-y-auto pb-6">
				<div className="space-y-4">
					{data.description ? (
						<p className="max-w-2xl text-muted-foreground text-sm leading-relaxed">{data.description}</p>
					) : (
						<p className="text-muted-foreground text-sm italic">
							{m["components.detail.field.noDescription"]()}
						</p>
					)}

					<section className="rounded-xl border border-border/70 bg-muted/15 p-4 shadow-sm">
						<h2 className="mb-3 font-semibold text-muted-foreground text-xs uppercase tracking-wide">
							{m["components.detail.metaHeading"]()}
						</h2>
						<dl className="grid gap-x-4 gap-y-3 text-sm sm:grid-cols-[minmax(9rem,auto)_1fr]">
							<div className="contents">
								<dt className="text-muted-foreground">{m["collections.cultivar.title"]()}</dt>
								<dd className="wrap-break-word min-w-0">{cultivar.characteristics.name}</dd>
							</div>
							<div className="contents">
								<dt className="text-muted-foreground">
									{`${m["collections.cultivar.title"]()} ${m["common.record"]().toLowerCase()}`}
								</dt>
								<dd className="wrap-break-word min-w-0">
									<Link
										to="/catalog/cultivar/$cultivarId"
										params={{ cultivarId: String(data.cultivarId) }}
										className="text-primary underline-offset-4 hover:underline"
									>
										{`${m["common.open"]()} ${m["collections.cultivar.title"]().toLowerCase()}`}
									</Link>
								</dd>
							</div>
							<div className="contents">
								<dt className="text-muted-foreground">{m["collections.species.title"]()}</dt>
								<dd className="wrap-break-word min-w-0">
									{translateCatalogField(
										cultivar.species.characteristics.name,
										cultivar.species.isDefault,
									)}
								</dd>
							</div>
							<div className="contents">
								<dt className="text-muted-foreground">
									{`${m["collections.species.title"]()} ${m["common.record"]().toLowerCase()}`}
								</dt>
								<dd className="wrap-break-word min-w-0">
									<Link
										to="/catalog/species-detail/$speciesId"
										params={{ speciesId: String(cultivar.speciesId) }}
										search={{ category: String(cultivar.species.categoryId) }}
										className="text-primary underline-offset-4 hover:underline"
									>
										{`${m["common.open"]()} ${m["collections.species.title"]().toLowerCase()}`}
									</Link>
								</dd>
							</div>

							<div className="contents">
								<dt className="text-muted-foreground">{m["collections.location.title"]()}</dt>
								<dd className="wrap-break-word min-w-0">
									<span className="text-muted-foreground">
										{m["components.detail.field.layoutFrame"]()}
									</span>
								</dd>
							</div>
							<div className="contents">
								<dt className="text-muted-foreground">
									{m["components.detail.field.layoutInLocation"]()}
								</dt>
								<dd className="wrap-break-word min-w-0">
									<span className="text-muted-foreground">
										{m["components.detail.field.layoutFrame"]()}
									</span>
								</dd>
							</div>
							<div className="contents">
								<dt className="text-muted-foreground">{m["fields.createdAt"]()}</dt>
								<dd className="wrap-break-word min-w-0">
									{data.createdAt.toLocaleString(getLocale(), {
										dateStyle: "medium",
										timeStyle: "short",
									})}
								</dd>
							</div>
							<div className="contents">
								<dt className="text-muted-foreground">{m["fields.updatedAt"]()}</dt>
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
					<h2 className="font-medium text-lg">{m["components.detail.eventsSection.title"]()}</h2>
					{eventsPending ? (
						<p className="text-muted-foreground text-sm">
							{m["components.detail.eventsSection.loading"]()}
						</p>
					) : events.length === 0 ? (
						<p className="rounded-lg border border-border/80 border-dashed bg-muted/10 px-4 py-6 text-center text-muted-foreground text-sm">
							{m["components.detail.eventsSection.empty"]()}
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
												{m[`gardeningActions.${event.action.type}` as keyof typeof m]()}
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
	);
}
