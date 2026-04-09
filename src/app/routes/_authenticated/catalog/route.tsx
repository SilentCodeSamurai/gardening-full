import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/catalog")({
	component: CatalogLayout,
});

function CatalogLayout() {
	return <Outlet />;
}
