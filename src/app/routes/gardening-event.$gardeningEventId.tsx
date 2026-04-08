import type { GardeningEventEntityId, LocationEntityId, PlantEntityId } from "@backend/core/domain/gardening/entities";
import { useQueries, useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { PencilIcon, Trash2Icon } from "lucide-react";
import { useState } from "react";
import { GardeningActionPresentationIcon } from "@/components/gardening/gardening-action-icon";
import { GardeningEventUpdateDialog } from "@/components/gardening/gardening-event/gardening-event-update-dialog";
import { getPlantDisplayTitle } from "@/components/gardening/plant/plant-list-card";
import { DeleteConfirmDialog } from "@/components/gardening/shared/delete-confirm-dialog";
import { PageContent } from "@/components/layout/page-content";
import { PageHeading } from "@/components/layout/page-heading";
import { Button } from "@/components/ui/button";
import { ButtonTooltip } from "@/components/ui/button-tooltip";
import * as m from "@/paraglide/messages.js";
import { getLocale } from "@/paraglide/runtime";
import { queryKeys } from "@/store/keys";
import { useGardeningEventDeleteMutation } from "@/store/mutations/gardening-event";

export const Route = createFileRoute("/gardening-event/$gardeningEventId")({
	component: GardeningEventDetailPage,
});

function GardeningEventDetailPage() {
	const [editOpen, setEditOpen] = useState(false);
	const { gardeningEventId } = Route.useParams();
	const id = gardeningEventId as GardeningEventEntityId;
	const [deleteOpen, setDeleteOpen] = useState(false);
	const del = useGardeningEventDeleteMutation();
	const detailQuery = useQuery({
		...queryKeys.gardeningEvent.detail(id),
	});

	const bindingsQuery = useQuery({
		...queryKeys.gardeningEvent.bindings(id),
		enabled: !!detailQuery.data,
	});

	const plantIds = bindingsQuery.data?.plantIds ?? [];
	const locationIds = bindingsQuery.data?.locationIds ?? [];

	const plantQueries = useQueries({
		queries: plantIds.map((plantId: PlantEntityId) => ({
			...queryKeys.plant.detail(plantId),
			enabled: !!bindingsQuery.data && plantIds.length > 0,
		})),
	});

	const locationQueries = useQueries({
		queries: locationIds.map((locationId: LocationEntityId) => ({
			...queryKeys.location.detail(locationId),
			enabled: !!bindingsQuery.data && locationIds.length > 0,
		})),
	});

	if (detailQuery.isPending) {
		return <div className="text-muted-foreground text-sm">{m["common.loading"]()}</div>;
	}
	if (detailQuery.isError || !detailQuery.data) {
		return (
			<div className="text-destructive text-sm">
				{`${m["collections.gardeningEvent.title"]()} ${m["common.notFound"]()}`}
			</div>
		);
	}

	const data = detailQuery.data;

	return (
		<div className="flex min-h-0 flex-1 flex-col overflow-hidden">
			<PageHeading className="min-w-0 flex-wrap" collection="gardeningEvent">
				<div className="flex min-w-0 flex-wrap items-center gap-3">
					<GardeningActionPresentationIcon action={data.action} />
					<h1 className="font-heading font-medium text-lg capitalize">
						{m[`gardeningActions.${data.action.type}` as keyof typeof m]()}
					</h1>
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
					<ButtonTooltip label={m["common.delete"]()}>
						<Button
							type="button"
							variant="destructive"
							size="icon"
							aria-label={m["common.delete"]()}
							onClick={() => setDeleteOpen(true)}
						>
							<Trash2Icon />
						</Button>
					</ButtonTooltip>
					<GardeningEventUpdateDialog event={data} open={editOpen} onOpenChange={setEditOpen} />
					<DeleteConfirmDialog
						open={deleteOpen}
						onOpenChange={setDeleteOpen}
						title={m["collections.gardeningEvent.delete"]()}
						description={m[`gardeningActions.${data.action.type}` as keyof typeof m]()}
						isPending={del.isPending}
						onConfirm={async () => {
							await del.mutateAsync({ id: data.id });
							setDeleteOpen(false);
						}}
					/>
				</div>
			</PageHeading>
			<PageContent className="flex flex-col gap-6 overflow-y-auto pb-6">
				<p className="max-w-2xl whitespace-pre-wrap text-muted-foreground text-sm leading-relaxed">
					{data.action.content.trim() ? (
						data.action.content
					) : (
						<span className="italic">{m["components.detail.field.noNoteBody"]()}</span>
					)}
				</p>

				<section className="rounded-xl border border-border/70 bg-muted/15 p-4 shadow-sm">
					<h2 className="mb-3 font-semibold text-muted-foreground text-xs uppercase tracking-wide">
						{m["components.detail.metaHeading"]()}
					</h2>
					<dl className="grid gap-x-4 gap-y-3 text-sm sm:grid-cols-[minmax(9rem,auto)_1fr]">
						<div className="contents">
							<dt className="text-muted-foreground">{m["components.detail.field.actionType"]()}</dt>
							<dd className="wrap-break-word min-w-0 font-mono text-xs">{data.action.type}</dd>
						</div>
						<div className="contents">
							<dt className="text-muted-foreground">{m["components.detail.field.loggedAt"]()}</dt>
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

				<div className="grid gap-6 lg:grid-cols-2">
					<section className="space-y-2">
						<h2 className="font-semibold text-sm">
							{`${m["common.linked"]()} ${m["collections.plant.titlePlural"]().toLowerCase()}`}
						</h2>
						{bindingsQuery.isPending ? (
							<p className="text-muted-foreground text-sm">{m["common.loading"]()}</p>
						) : plantIds.length === 0 ? (
							<p className="rounded-lg border border-border/70 border-dashed bg-muted/10 px-3 py-4 text-muted-foreground text-sm">
								{m["components.detail.eventBindings.nonePlants"]()}
							</p>
						) : (
							<ul className="space-y-2">
								{plantIds.map((plantId, i) => {
									const q = plantQueries[i];
									const label =
										q?.data != null
											? getPlantDisplayTitle(q.data)
											: q?.isError
												? String(plantId)
												: m["common.loading"]();
									return (
										<li key={String(plantId)}>
											{q?.data != null ? (
												<Link
													to="/plant/$plantId"
													params={{ plantId: String(plantId) }}
													className="block rounded-lg border border-border/60 bg-card/40 px-3 py-2 font-medium text-primary text-sm underline-offset-4 hover:border-border hover:bg-card/70 hover:underline"
												>
													{label}
												</Link>
											) : (
												<div className="rounded-lg border border-border/40 bg-muted/10 px-3 py-2 font-mono text-muted-foreground text-xs">
													{label}
												</div>
											)}
										</li>
									);
								})}
							</ul>
						)}
					</section>

					<section className="space-y-2">
						<h2 className="font-semibold text-sm">
							{`${m["common.linked"]()} ${m["collections.location.titlePlural"]().toLowerCase()}`}
						</h2>
						{bindingsQuery.isPending ? (
							<p className="text-muted-foreground text-sm">{m["common.loading"]()}</p>
						) : locationIds.length === 0 ? (
							<p className="rounded-lg border border-border/70 border-dashed bg-muted/10 px-3 py-4 text-muted-foreground text-sm">
								{m["components.detail.eventBindings.noneLocations"]()}
							</p>
						) : (
							<ul className="space-y-2">
								{locationIds.map((locationId, i) => {
									const q = locationQueries[i];
									const label =
										q?.data != null
											? q.data.name
											: q?.isError
												? String(locationId)
												: m["common.loading"]();
									return (
										<li key={String(locationId)}>
											{q?.data != null ? (
												<Link
													to="/location/$locationId"
													params={{ locationId: String(locationId) }}
													className="block rounded-lg border border-border/60 bg-card/40 px-3 py-2 font-medium text-primary text-sm underline-offset-4 hover:border-border hover:bg-card/70 hover:underline"
												>
													{label}
												</Link>
											) : (
												<div className="rounded-lg border border-border/40 bg-muted/10 px-3 py-2 font-mono text-muted-foreground text-xs">
													{label}
												</div>
											)}
										</li>
									);
								})}
							</ul>
						)}
					</section>
				</div>
			</PageContent>
		</div>
	);
}
