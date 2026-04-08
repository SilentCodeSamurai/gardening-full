import { createFileRoute, Link } from "@tanstack/react-router";

import { PageContent } from "@/components/layout/page-content";
import { PageHeading } from "@/components/layout/page-heading";
import { cn } from "@/lib/utils";
import * as m from "@/paraglide/messages.js";

export const Route = createFileRoute("/")({
	component: HubPage,
});

function HubPage() {
	const cardClass =
		"block rounded-lg border border-border/80 bg-card/40 px-4 py-3 text-sm transition-colors hover:bg-muted/30";

	return (
		<div className="flex min-h-0 flex-1 flex-col overflow-hidden">
			<PageHeading>
				<h1 className="font-heading font-medium text-xl">{m["components.hub.title"]()}</h1>
			</PageHeading>
			<PageContent className="flex flex-col gap-6 overflow-y-auto pb-6">
				<p className="max-w-prose text-muted-foreground text-sm">{m["components.hub.intro"]()}</p>
				<ul className="grid gap-3 sm:grid-cols-2">
					<li>
						<Link to="/catalog/species" search={{ category: "" }} className={cn(cardClass)}>
							{m["components.hub.catalogLinkPrefix"]()} {m["collections.species.titlePlural"]()}
						</Link>
					</li>
					<li>
						<Link to="/catalog/species-categories" className={cn(cardClass)}>
							{m["components.hub.catalogLinkPrefix"]()} {m["collections.speciesCategory.titlePlural"]()}
						</Link>
					</li>
					<li>
						<Link to="/catalog/cultivars" search={{ category: "", species: "" }} className={cn(cardClass)}>
							{m["components.hub.catalogLinkPrefix"]()} {m["collections.cultivar.titlePlural"]()}
						</Link>
					</li>
					<li>
						<Link
							to="/plants"
							search={{ category: "", species: "", cultivar: "" }}
							className={cn(cardClass)}
						>
							{m["collections.plant.titlePlural"]()}
						</Link>
					</li>
					<li>
						<Link to="/locations" className={cn(cardClass)}>
							{m["collections.location.titlePlural"]()}
						</Link>
					</li>
					<li>
						<Link to="/gardening-events" className={cn(cardClass)}>
							{m["collections.gardeningEvent.titlePlural"]()}
						</Link>
					</li>
				</ul>
			</PageContent>
		</div>
	);
}
