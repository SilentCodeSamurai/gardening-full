import type { LocationEntityId } from "@backend/core/domain/gardening/entities";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo } from "react";
import { LocationLayoutEditor } from "@/components/gardening/location/location-layout-editor";
import { PageHeading } from "@/components/layout/page-heading";
import * as m from "@/paraglide/messages.js";
import { queryKeys } from "@/store/keys";
import { resolveRootLocationEntityId } from "@/store/spatial-placement";
export const Route = createFileRoute("/_authenticated/location/$locationId/layout")({
	component: LocationLayoutPage,
});

function LocationLayoutPage() {
	const { locationId } = Route.useParams();
	const openedLocationId = locationId as LocationEntityId;

	const { data: spatialData } = useQuery({
		...queryKeys.spatial.allNodes,
		placeholderData: (previous) => previous,
	});

	const layoutRootLocationId = useMemo(() => {
		return (
			resolveRootLocationEntityId(spatialData?.items ?? [], String(openedLocationId)) ?? String(openedLocationId)
		)
	}, [spatialData?.items, openedLocationId]);

	const rootId = layoutRootLocationId as LocationEntityId;
	const rootDiffersFromOpened = String(rootId) !== String(openedLocationId);

	const openedQuery = useQuery({
		...queryKeys.location.detail(openedLocationId),
	});

	const rootQuery = useQuery({
		...queryKeys.location.detail(rootId),
		enabled: rootDiffersFromOpened,
	});

	const editorRootLocation = rootDiffersFromOpened ? rootQuery.data : openedQuery.data;

	const isPending = openedQuery.isPending || (rootDiffersFromOpened && rootQuery.isPending);
	const isError =
		openedQuery.isError || !openedQuery.data || (rootDiffersFromOpened && (rootQuery.isError || !rootQuery.data));

	if (isPending) {
		return <div className="text-muted-foreground text-sm">{m.common_loading()}</div>;
	}
	if (isError || !editorRootLocation) {
		return (
			<div className="text-destructive text-sm">
				{`${m.collections_location_title()} ${m.common_notFound()}`}
			</div>
		)
	}

	return (
		<div className="h-full space-y-6">
			<div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
				<PageHeading collection="location">
					<h1 className="font-semibold text-xl">{editorRootLocation.name}</h1>
				</PageHeading>
				<Link
					to="/location/$locationId"
					params={{ locationId: String(openedLocationId) }}
					className="text-primary text-sm underline-offset-4 hover:underline"
				>
					{m.components_locationLayoutEditor_backToLocation()}
				</Link>
			</div>
			<LocationLayoutEditor
				rootLocation={editorRootLocation}
				className="h-[90%]"
				highlightLocationEntityId={String(openedLocationId)}
			/>
		</div>
	)
}
