import { createFileRoute, Navigate } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/catalog/")({
	component: CatalogIndexRedirect,
});

function CatalogIndexRedirect() {
	return <Navigate to="/catalog/species" search={{ category: "" }} />;
}
