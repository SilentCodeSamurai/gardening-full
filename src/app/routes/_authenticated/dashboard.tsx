import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRightIcon, LayoutGridIcon } from "lucide-react";
import { type ReactNode, useMemo, useState } from "react";
import { DashboardPageContent } from "#/app/components/layout/dashboard-page-content";
import { DashboardPageHeading } from "#/app/components/layout/dashboard-page-heading";
import { GardeningEventCreateDialog } from "@/components/gardening/gardening-event/gardening-event-create-dialog";
import { PlantCreateDialog } from "@/components/gardening/plant/plant-create-dialog";
import { getPlantDisplayTitle } from "@/components/gardening/plant/plant-list-card";
import { LocationCreateDialog } from "@/components/gardening/location/location-create-dialog";
import { GardeningActionPresentationIcon } from "@/components/gardening/gardening-action-icon";
import { ItemPresentationIcon } from "@/components/icon/item-presentation-icon";
import { Button } from "@/components/ui/button";
import { ButtonTooltip } from "@/components/ui/button-tooltip";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { gardeningActionMessage } from "@/lib/gardening-action-messages";
import { renderError } from "@/lib/render-error";
import { getLocationPlacementSummary, getPlantPlacementSummary } from "@/lib/spatial-placement-summary";
import * as m from "@/paraglide/messages.js";
import { queryKeys } from "@/store/keys";

export const Route = createFileRoute("/_authenticated/dashboard")({
	component: DashboardPage,
});

const DASHBOARD_PREVIEW_LIMIT = 8;

function DashboardPage() {
	const [createEventOpen, setCreateEventOpen] = useState(false);
	const [createLocationOpen, setCreateLocationOpen] = useState(false);
	const [createPlantOpen, setCreatePlantOpen] = useState(false);
	const {
		data: eventsData,
		isPending: isEventsPending,
		isError: isEventsError,
		error: eventsError,
	} = useQuery({ ...queryKeys.gardeningEvent.all });
	const {
		data: locationsData,
		isPending: isLocationsPending,
		isError: isLocationsError,
		error: locationsError,
	} = useQuery({ ...queryKeys.location.all });
	const { data: spatialData } = useQuery({
		...queryKeys.spatial.allNodes,
		placeholderData: (previous) => previous,
	});
	const {
		data: plantsData,
		isPending: isPlantsPending,
		isError: isPlantsError,
		error: plantsError,
	} = useQuery({ ...queryKeys.plant.all });
	const sortedEvents = useMemo(
		() =>
			[...(eventsData?.items ?? [])].sort(
				(a, b) => (b.occurredAt?.getTime() ?? 0) - (a.occurredAt?.getTime() ?? 0),
			),
		[eventsData?.items],
	);
	const allRootLocations = useMemo(() => {
		const spatialItems = spatialData?.items ?? [];
		const allLocations = locationsData?.items ?? [];
		return allLocations
			.filter(
				(location) => getLocationPlacementSummary(spatialItems, location, allLocations).kind === "rootCanvas",
			)
			.sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" }));
	}, [locationsData?.items, spatialData?.items]);
	const sortedPlants = useMemo(
		() => [...(plantsData?.items ?? [])].sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime()),
		[plantsData?.items],
	);
	const recentEvents = useMemo(() => sortedEvents.slice(0, DASHBOARD_PREVIEW_LIMIT), [sortedEvents]);
	const rootLocations = useMemo(
		() => allRootLocations.slice(0, DASHBOARD_PREVIEW_LIMIT),
		[allRootLocations],
	);
	const recentPlants = useMemo(() => sortedPlants.slice(0, DASHBOARD_PREVIEW_LIMIT), [sortedPlants]);

	return (
		<div id="dashboard-page" className="flex min-h-0 flex-1 flex-col overflow-hidden">
			<DashboardPageHeading>
				<h1 className="font-heading font-medium text-xl" id="page-title">
					{m.components_hub_title()}
				</h1>
			</DashboardPageHeading>
			<DashboardPageContent className="flex flex-col gap-6 overflow-y-auto pb-6">
				<div className="grid gap-4 lg:grid-cols-2 2xl:grid-cols-4">
					<DashboardCollectionCard
						title={m.collections_gardeningEvent_titlePlural()}
						to="/gardening-events"
						createLabel={m.collections_gardeningEvent_create()}
						onCreate={() => setCreateEventOpen(true)}
						totalCount={sortedEvents.length}
						isPending={isEventsPending}
						isError={isEventsError}
						error={eventsError}
						isEmpty={recentEvents.length === 0}
					>
						<ul className="space-y-2">
							{recentEvents.map((event) => (
								<li key={String(event.id)}>
									<Link
										to="/gardening-event/$gardeningEventId"
										params={{ gardeningEventId: String(event.id) }}
										className="flex items-start gap-2 rounded-md border border-border/70 bg-card/40 px-3 py-2 transition-colors hover:bg-muted/30"
									>
										<GardeningActionPresentationIcon action={event.action} />
										<div className="min-w-0 flex-1">
											<p className="truncate text-sm capitalize">{gardeningActionMessage(event.action.type)}</p>
											<p className="truncate text-muted-foreground text-xs">
												{event.occurredAt === null
													? m.common_unknown()
													: event.occurredAt.toLocaleString(undefined, {
															dateStyle: "short",
															timeStyle: "short",
														})}
											</p>
										</div>
									</Link>
								</li>
							))}
						</ul>
					</DashboardCollectionCard>
					<DashboardCollectionCard
						title={m.collections_location_titlePlural()}
						to="/locations"
						createLabel={m.collections_location_create()}
						onCreate={() => setCreateLocationOpen(true)}
						totalCount={allRootLocations.length}
						isPending={isLocationsPending}
						isError={isLocationsError}
						error={locationsError}
						isEmpty={rootLocations.length === 0}
					>
						<ul className="space-y-2">
							{rootLocations.map((location) => (
								<li key={String(location.id)}>
									<div className="flex items-center gap-2 rounded-md border border-border/70 bg-card/40 px-3 py-2 transition-colors hover:bg-muted/30">
										<Link
											to="/location/$locationId"
											params={{ locationId: String(location.id) }}
											className="flex min-w-0 flex-1 items-center gap-2"
										>
											<ItemPresentationIcon presentation={location.presentation} className="size-6 shrink-0" />
											<span className="truncate font-medium text-sm">{location.name}</span>
										</Link>
										<ButtonTooltip label={m.components_locationLayoutEditor_openLayoutEditor()}>
											<Button type="button" size="icon-sm" variant="outline" asChild>
												<Link
													to="/location/$locationId/layout"
													params={{ locationId: String(location.id) }}
													aria-label={m.components_locationLayoutEditor_openLayoutEditor()}
												>
													<LayoutGridIcon />
												</Link>
											</Button>
										</ButtonTooltip>
									</div>
								</li>
							))}
						</ul>
					</DashboardCollectionCard>
					<DashboardCollectionCard
						title={m.collections_plant_titlePlural()}
						to="/plants"
						createLabel={m.collections_plant_create()}
						onCreate={() => setCreatePlantOpen(true)}
						totalCount={sortedPlants.length}
						isPending={isPlantsPending}
						isError={isPlantsError}
						error={plantsError}
						isEmpty={recentPlants.length === 0}
					>
						<ul className="space-y-2">
							{recentPlants.map((plant) => (
								<li key={String(plant.id)}>
									<div className="flex items-center gap-2 rounded-md border border-border/70 bg-card/40 px-3 py-2 transition-colors hover:bg-muted/30">
										<Link
											to="/plant/$plantId"
											params={{ plantId: String(plant.id) }}
											className="flex min-w-0 flex-1 items-center gap-2"
										>
											<ItemPresentationIcon presentation={plant.presentation} className="size-6 shrink-0" />
											<div className="min-w-0 flex-1">
												<p className="truncate font-medium text-sm">{getPlantDisplayTitle(plant)}</p>
												<p className="truncate text-muted-foreground text-xs">
													{plant.updatedAt.toLocaleString(undefined, {
														dateStyle: "short",
														timeStyle: "short",
													})}
												</p>
											</div>
										</Link>
										{(() => {
											const placement = getPlantPlacementSummary(
												spatialData?.items ?? [],
												String(plant.id),
												locationsData?.items ?? [],
											);
											const canOpenEditor = placement.kind === "underLocation";
											return (
												<ButtonTooltip
													disabled={canOpenEditor}
													label={
														canOpenEditor
															? m.components_locationLayoutEditor_openLayoutEditor()
															: m.components_detail_field_unplaced()
													}
												>
													<Button
														type="button"
														size="icon-sm"
														variant="outline"
														disabled={!canOpenEditor}
														asChild={canOpenEditor}
													>
														{canOpenEditor ? (
															<Link
																to="/location/$locationId/layout"
																params={{
																	locationId:
																		placement.kind === "underLocation" ? placement.locationId : "",
																}}
																aria-label={m.components_locationLayoutEditor_openLayoutEditor()}
															>
																<LayoutGridIcon />
															</Link>
														) : (
															<LayoutGridIcon />
														)}
													</Button>
												</ButtonTooltip>
											);
										})()}
									</div>
								</li>
							))}
						</ul>
					</DashboardCollectionCard>
					<DashboardCollectionCard
						title={m.components_layout_nav_catalogSection()}
						to="/catalog"
						totalCount={3}
						isEmpty={false}
					>
						<ul className="space-y-2">
							<li>
								<Link
									to="/catalog/species-categories"
									className="flex items-center justify-between rounded-md border border-border/70 bg-card/40 px-3 py-2 text-sm transition-colors hover:bg-muted/30"
								>
									<span>{m.collections_speciesCategory_titlePlural()}</span>
									<ArrowRightIcon className="size-3.5 text-muted-foreground" />
								</Link>
							</li>
							<li>
								<Link
									to="/catalog/species"
									search={{ category: "" }}
									className="flex items-center justify-between rounded-md border border-border/70 bg-card/40 px-3 py-2 text-sm transition-colors hover:bg-muted/30"
								>
									<span>{m.collections_species_titlePlural()}</span>
									<ArrowRightIcon className="size-3.5 text-muted-foreground" />
								</Link>
							</li>
							<li>
								<Link
									to="/catalog/cultivars"
									search={{ category: "", species: "" }}
									className="flex items-center justify-between rounded-md border border-border/70 bg-card/40 px-3 py-2 text-sm transition-colors hover:bg-muted/30"
								>
									<span>{m.collections_cultivar_titlePlural()}</span>
									<ArrowRightIcon className="size-3.5 text-muted-foreground" />
								</Link>
							</li>
						</ul>
					</DashboardCollectionCard>
				</div>
			</DashboardPageContent>
			<GardeningEventCreateDialog open={createEventOpen} onOpenChange={setCreateEventOpen} />
			<LocationCreateDialog open={createLocationOpen} onOpenChange={setCreateLocationOpen} />
			<PlantCreateDialog open={createPlantOpen} onOpenChange={setCreatePlantOpen} />
		</div>
	);
}

function DashboardCollectionCard({
	title,
	to,
	totalCount,
	createLabel,
	onCreate,
	isPending,
	isError,
	error,
	isEmpty,
	children,
}: {
	title: string;
	to: "/catalog" | "/gardening-events" | "/locations" | "/plants";
	totalCount?: number;
	createLabel?: string;
	onCreate?: () => void;
	isPending?: boolean;
	isError?: boolean;
	error?: unknown;
	isEmpty?: boolean;
	children: ReactNode;
}) {
	return (
		<Card className="border border-border/80 bg-card/30 py-3">
			<CardHeader className="border-border/70 border-b pb-3">
				<div className="flex items-center justify-between gap-2">
					<CardTitle className="inline-flex items-center gap-2 text-sm">
						<span>{title}</span>
						{typeof totalCount === "number" ? (
							<span className="rounded-md border border-border/70 bg-muted/30 px-1.5 py-0.5 text-[10px] text-muted-foreground">
								{totalCount}
							</span>
						) : null}
					</CardTitle>
					<div className="flex items-center gap-2">
						{onCreate && createLabel ? (
							<Button
								size="sm"
								variant="outline"
								type="button"
								onClick={onCreate}
							>
								{createLabel}
							</Button>
						) : null}
						<Link
							to={to}
							className="inline-flex items-center gap-1 text-muted-foreground text-xs hover:text-foreground"
						>
							<span>{m.common_open()}</span>
							<ArrowRightIcon className="size-3.5" />
						</Link>
					</div>
				</div>
			</CardHeader>
			<CardContent className="px-3 pt-3">
				{isPending ? <p className="px-1 py-2 text-muted-foreground text-sm">{m.common_loading()}</p> : null}
				{!isPending && isError ? (
					<p className="px-1 py-2 text-destructive text-sm">{renderError(error, m.common_loadError())}</p>
				) : null}
				{!isPending && !isError && isEmpty ? (
					<div className="space-y-2 px-1 py-2">
						<p className="text-muted-foreground text-sm">{m.items_noElements()}</p>
						{onCreate && createLabel ? (
							<Button type="button" variant="outline" size="sm" onClick={onCreate}>
								{createLabel}
							</Button>
						) : null}
					</div>
				) : null}
				{!isPending && !isError && !isEmpty ? children : null}
			</CardContent>
		</Card>
	);
}
