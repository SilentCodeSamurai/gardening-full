import { createFileRoute, Link } from "@tanstack/react-router";

import { PageContent } from "@/components/layout/page-content";
import { PageHeading } from "@/components/layout/page-heading";
import { cn } from "@/lib/utils";
import * as m from "@/paraglide/messages.js";

export const Route = createFileRoute("/_authenticated/dashboard")({
	component: DashboardPage,
});

function DashboardPage() {
	const cardClass =
		"block rounded-lg border border-border/80 bg-card/40 px-4 py-3 text-sm transition-colors hover:bg-muted/30";

	return (
		<div className="flex min-h-0 flex-1 flex-col overflow-hidden">
			<PageHeading>
				<h1 className="font-heading font-medium text-xl">{m.components_hub_title()}</h1>
			</PageHeading>
			<PageContent className="flex flex-col gap-6 overflow-y-auto pb-6">
				<p className="max-w-prose text-muted-foreground text-sm">{m.components_hub_intro()}</p>
				<ul className="grid gap-3 sm:grid-cols-2">
					<li>
						<Link to="/catalog/species" search={{ category: "" }} className={cn(cardClass)}>
							{m.components_hub_catalogLinkPrefix()} {m.collections_species_titlePlural()}
						</Link>
					</li>
					<li>
						<Link to="/catalog/species-categories" className={cn(cardClass)}>
							{m.components_hub_catalogLinkPrefix()} {m.collections_speciesCategory_titlePlural()}
						</Link>
					</li>
					<li>
						<Link to="/catalog/cultivars" search={{ category: "", species: "" }} className={cn(cardClass)}>
							{m.components_hub_catalogLinkPrefix()} {m.collections_cultivar_titlePlural()}
						</Link>
					</li>
					<li>
						<Link to="/plants" search={{ category: "", species: "", cultivar: "" }} className={cn(cardClass)}>
							{m.collections_plant_titlePlural()}
						</Link>
					</li>
					<li>
						<Link to="/locations" className={cn(cardClass)}>
							{m.collections_location_titlePlural()}
						</Link>
					</li>
					<li>
						<Link to="/gardening-events" className={cn(cardClass)}>
							{m.collections_gardeningEvent_titlePlural()}
						</Link>
					</li>
				</ul>
			</PageContent>
		</div>
	)
}
