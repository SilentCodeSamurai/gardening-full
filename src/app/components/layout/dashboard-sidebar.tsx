import { UserButton } from "@daveyplate/better-auth-ui";
import { Link, useRouterState } from "@tanstack/react-router";
import { ChevronDownIcon, HomeIcon, Sprout } from "lucide-react";
import { CollectionIcon } from "@/components/icon/collection-icon";
import { SidebarLanguageMenu } from "@/components/layout/sidebar-language-menu";
import { ThemeToggle } from "@/components/theme-toggle";
import { ToursMenu } from "@/components/tours/tours-menu";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
	Sidebar,
	SidebarContent,
	SidebarFooter,
	SidebarGroup,
	SidebarGroupContent,
	SidebarGroupLabel,
	SidebarHeader,
	SidebarMenu,
	SidebarMenuButton,
	SidebarMenuItem,
	SidebarRail,
} from "@/components/ui/sidebar";
import { markIntentToOpenPublicHome } from "@/lib/public-home-navigation";
import {
	resetCultivarsSearch,
	resetGardeningEventsSearch,
	resetLocationsSearch,
	resetPlantsSearch,
	resetSpeciesCategoriesSearch,
	resetSpeciesSearch,
} from "@/lib/table-search-reset";
import * as m from "@/paraglide/messages.js";

export function DashboardSidebar() {
	const pathname = useRouterState({ select: (s) => s.location.pathname });
	const isActivePath = (to: string) => pathname === to;

	return (
		<Sidebar variant="inset" collapsible="offcanvas" aria-label={m.components_layout_appShell_sidebarNavLabel()}>
			<SidebarHeader className="border-sidebar-border border-b px-2 py-2">
				<Link
					to="/"
					onClick={() => markIntentToOpenPublicHome()}
					className="flex items-center gap-2 rounded-md px-2 py-1.5 outline-none transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-2 focus-visible:ring-sidebar-ring"
					aria-label={m.components_layout_sidebar_logoLinkAria()}
				>
					<span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
						<Sprout className="size-5" aria-hidden />
					</span>
					<span className="truncate font-heading font-semibold text-sidebar-foreground text-sm">
						{m.components_hub_title()}
					</span>
				</Link>
			</SidebarHeader>
			<SidebarContent>
				<SidebarGroup>
					<SidebarGroupContent>
						<SidebarMenu>
							<SidebarMenuItem>
								<SidebarMenuButton asChild isActive={isActivePath("/dashboard")}>
									<Link
										to="/dashboard"
										className="flex w-full min-w-0 items-center gap-2"
										id="nav-home"
									>
										<HomeIcon className="size-4" />
										{m.components_layout_nav_home()}
									</Link>
								</SidebarMenuButton>
							</SidebarMenuItem>
						</SidebarMenu>
					</SidebarGroupContent>
				</SidebarGroup>
				<Collapsible defaultOpen className="group/collapsible">
					<SidebarGroup>
						<SidebarGroupLabel asChild>
							<CollapsibleTrigger className="w-full">
								<span>{m.components_layout_nav_catalogSection()}</span>
								<ChevronDownIcon className="ml-auto transition-transform group-data-[state=open]/collapsible:rotate-180" />
							</CollapsibleTrigger>
						</SidebarGroupLabel>
						<CollapsibleContent>
							<SidebarGroupContent>
								<SidebarMenu>
									<SidebarMenuItem>
										<SidebarMenuButton
											asChild
											isActive={isActivePath("/catalog/species-categories")}
										>
											<Link
												to="/catalog/species-categories"
												search={resetSpeciesCategoriesSearch}
												className="flex w-full min-w-0 items-center gap-2"
												id="nav-catalog-categories"
											>
												<CollectionIcon collection="speciesCategory" className="size-4" />
												{m.collections_speciesCategory_titlePlural()}
											</Link>
										</SidebarMenuButton>
									</SidebarMenuItem>
									<SidebarMenuItem>
										<SidebarMenuButton asChild isActive={isActivePath("/catalog/species")}>
											<Link
												to="/catalog/species"
												search={resetSpeciesSearch}
												className="flex w-full min-w-0 items-center gap-2"
												id="nav-catalog-species"
											>
												<CollectionIcon collection="species" className="size-4" />
												{m.collections_species_titlePlural()}
											</Link>
										</SidebarMenuButton>
									</SidebarMenuItem>
									<SidebarMenuItem>
										<SidebarMenuButton asChild isActive={isActivePath("/catalog/cultivars")}>
											<Link
												to="/catalog/cultivars"
												search={resetCultivarsSearch}
												className="flex w-full min-w-0 items-center gap-2"
												id="nav-catalog-cultivars"
											>
												<CollectionIcon collection="cultivar" className="size-4" />
												{m.collections_cultivar_titlePlural()}
											</Link>
										</SidebarMenuButton>
									</SidebarMenuItem>
								</SidebarMenu>
							</SidebarGroupContent>
						</CollapsibleContent>
					</SidebarGroup>
				</Collapsible>
				<SidebarGroup>
					<SidebarGroupContent>
						<SidebarMenu>
							<SidebarMenuItem>
								<SidebarMenuButton asChild isActive={isActivePath("/plants")}>
									<Link
										to="/plants"
										search={resetPlantsSearch}
										className="flex w-full min-w-0 items-center gap-2"
										id="nav-plants"
									>
										<CollectionIcon collection="plant" className="size-4" />
										{m.collections_plant_titlePlural()}
									</Link>
								</SidebarMenuButton>
							</SidebarMenuItem>
							<SidebarMenuItem>
								<SidebarMenuButton asChild isActive={isActivePath("/locations")}>
									<Link
										to="/locations"
										search={resetLocationsSearch}
										className="flex w-full min-w-0 items-center gap-2"
										id="nav-locations"
									>
										<CollectionIcon collection="location" className="size-4" />
										{m.collections_location_titlePlural()}
									</Link>
								</SidebarMenuButton>
							</SidebarMenuItem>
							<SidebarMenuItem>
								<SidebarMenuButton asChild isActive={isActivePath("/gardening-events")}>
									<Link
										to="/gardening-events"
										search={resetGardeningEventsSearch}
										className="flex w-full min-w-0 items-center gap-2"
										id="nav-events"
									>
										<CollectionIcon collection="gardeningEvent" className="size-4" />
										{m.collections_gardeningEvent_titlePlural()}
									</Link>
								</SidebarMenuButton>
							</SidebarMenuItem>
						</SidebarMenu>
					</SidebarGroupContent>
				</SidebarGroup>
			</SidebarContent>
			<SidebarFooter className="gap-3 border-sidebar-border border-t pt-3">
				<ThemeToggle />
				<SidebarLanguageMenu />
				<ToursMenu />
				<div className="flex w-full items-center gap-2">
					<UserButton
						size="sm"
						className="w-full border border-border bg-input/20 text-foreground hover:bg-input/50 hover:text-foreground"
					/>
				</div>
			</SidebarFooter>
			<SidebarRail />
		</Sidebar>
	);
}
