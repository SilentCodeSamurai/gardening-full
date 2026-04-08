import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/location/$locationId")({
	component: LocationIdShell,
});

function LocationIdShell() {
	return <Outlet />;
}
