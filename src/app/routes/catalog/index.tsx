import { createFileRoute, Navigate } from "@tanstack/react-router";

export const Route = createFileRoute("/catalog/")({
	component: CatalogIndexRedirect,
});

function CatalogIndexRedirect() {
	return <Navigate to="/catalog/species" search={{ category: "" }} />;
}
