import { createFileRoute, Link, redirect } from "@tanstack/react-router";

import { Button } from "@/components/ui/button";
import { getAuthSession } from "@/lib/get-auth-session";
import { cn } from "@/lib/utils";
import * as m from "@/paraglide/messages.js";

export const Route = createFileRoute("/")({
	beforeLoad: async () => {
		const session = await getAuthSession();
		if (session) {
			throw redirect({ to: "/dashboard" });
		}
	},
	component: PublicHomePage,
});

function PublicHomePage() {
	const cardClass =
		"block rounded-lg border border-border/80 bg-card/40 px-4 py-3 text-sm transition-colors hover:bg-muted/30";

	return (
		<div className="flex min-h-svh flex-col bg-background">
			<header className="border-border/80 border-b bg-card/30">
				<div className="container mx-auto flex flex-wrap items-center justify-between gap-4 px-4 py-4 md:px-6">
					<div className="min-w-0">
						<p className="font-heading font-medium text-lg">{m.components_hub_title()}</p>
						<p className="max-w-prose text-muted-foreground text-sm">{m.components_hub_intro()}</p>
					</div>
					<div className="flex flex-wrap items-center gap-2">
						<Button variant="outline" asChild>
							<Link to="/auth/$authView" params={{ authView: "sign-in" }}>Sign in</Link>
						</Button>
						<Button asChild>
							<Link to="/auth/$authView" params={{ authView: "sign-up" }}>Sign up</Link>
						</Button>
					</div>
				</div>
			</header>

			<main className="container mx-auto flex flex-1 flex-col gap-6 px-4 py-8 md:px-6">
				<section>
					<h2 className="mb-3 font-heading font-medium text-base">Explore the app</h2>
					<p className="mb-4 max-w-prose text-muted-foreground text-sm">
						Sign in to manage plants, locations, events, and your catalog. Below is a preview of what you
						can do once you have an account.
					</p>
					<ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
						<li>
							<Link to="/auth/$authView" params={{ authView: "sign-in" }} className={cn(cardClass)}>
								{m.components_hub_catalogLinkPrefix()} {m.collections_species_titlePlural()}
							</Link>
						</li>
						<li>
							<Link to="/auth/$authView" params={{ authView: "sign-in" }} className={cn(cardClass)}>
								{m.components_hub_catalogLinkPrefix()} {m.collections_speciesCategory_titlePlural()}
							</Link>
						</li>
						<li>
							<Link to="/auth/$authView" params={{ authView: "sign-in" }} className={cn(cardClass)}>
								{m.components_hub_catalogLinkPrefix()} {m.collections_cultivar_titlePlural()}
							</Link>
						</li>
						<li>
							<Link to="/auth/$authView" params={{ authView: "sign-in" }} className={cn(cardClass)}>
								{m.collections_plant_titlePlural()}
							</Link>
						</li>
						<li>
							<Link to="/auth/$authView" params={{ authView: "sign-in" }} className={cn(cardClass)}>
								{m.collections_location_titlePlural()}
							</Link>
						</li>
						<li>
							<Link to="/auth/$authView" params={{ authView: "sign-in" }} className={cn(cardClass)}>
								{m.collections_gardeningEvent_titlePlural()}
							</Link>
						</li>
					</ul>
				</section>
			</main>
		</div>
	);
}
