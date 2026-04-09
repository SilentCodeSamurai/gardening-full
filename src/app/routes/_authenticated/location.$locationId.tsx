import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/location/$locationId")({
	component: LocationIdShell,
});

function LocationIdShell() {
	return <Outlet />;
}
