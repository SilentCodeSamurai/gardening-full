import { Link, useRouterState } from "@tanstack/react-router";
import { ChevronDownIcon } from "lucide-react";
import * as m from "@/paraglide/messages.js";

import { CollectionIcon } from "@/components/icon/collection-icon";
import { SidebarLanguageMenu } from "@/components/layout/sidebar-language-menu";
import { ThemeToggle } from "@/components/theme-toggle";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
	Sidebar,
	SidebarContent,
	SidebarFooter,
	SidebarGroup,
	SidebarGroupContent,
	SidebarGroupLabel,
	SidebarMenu,
	SidebarMenuButton,
	SidebarMenuItem,
	SidebarRail,
} from "@/components/ui/sidebar";

export function AppSidebar() {
	const pathname = useRouterState({ select: (s) => s.location.pathname });
	const isActivePath = (to: string) => pathname === to;

	return (
		<Sidebar variant="inset" collapsible="offcanvas" aria-label={m["components.layout.appShell.sidebarNavLabel"]()}>
			<SidebarContent>
				<SidebarGroup>
					<SidebarGroupContent>
						<SidebarMenu>
							<SidebarMenuItem>
								<SidebarMenuButton asChild isActive={isActivePath("/")}>
									<Link to="/">{m["components.layout.nav.home"]()}</Link>
								</SidebarMenuButton>
							</SidebarMenuItem>
						</SidebarMenu>
					</SidebarGroupContent>
				</SidebarGroup>
				<Collapsible defaultOpen className="group/collapsible">
					<SidebarGroup>
						<SidebarGroupLabel asChild>
							<CollapsibleTrigger className="w-full">
								{m["components.layout.nav.catalogSection"]()}
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
												className="flex w-full min-w-0 items-center gap-2"
											>
												<CollectionIcon collection="speciesCategory" className="size-4" />
												{m["collections.speciesCategory.titlePlural"]()}
											</Link>
										</SidebarMenuButton>
									</SidebarMenuItem>
									<SidebarMenuItem>
										<SidebarMenuButton asChild isActive={isActivePath("/catalog/species")}>
											<Link
												to="/catalog/species"
												search={{ category: "" }}
												className="flex w-full min-w-0 items-center gap-2"
											>
												<CollectionIcon collection="species" className="size-4" />
												{m["collections.species.titlePlural"]()}
											</Link>
										</SidebarMenuButton>
									</SidebarMenuItem>
									<SidebarMenuItem>
										<SidebarMenuButton asChild isActive={isActivePath("/catalog/cultivars")}>
											<Link
												to="/catalog/cultivars"
												search={{ category: "", species: "" }}
												className="flex w-full min-w-0 items-center gap-2"
											>
												<CollectionIcon collection="cultivar" className="size-4" />
												{m["collections.cultivar.titlePlural"]()}
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
										search={{ category: "", species: "", cultivar: "" }}
										className="flex w-full min-w-0 items-center gap-2"
									>
										<CollectionIcon collection="plant" className="size-4" />
										{m["collections.plant.titlePlural"]()}
									</Link>
								</SidebarMenuButton>
							</SidebarMenuItem>
							<SidebarMenuItem>
								<SidebarMenuButton asChild isActive={isActivePath("/locations")}>
									<Link to="/locations" className="flex w-full min-w-0 items-center gap-2">
										<CollectionIcon collection="location" className="size-4" />
										{m["collections.location.titlePlural"]()}
									</Link>
								</SidebarMenuButton>
							</SidebarMenuItem>
							<SidebarMenuItem>
								<SidebarMenuButton asChild isActive={isActivePath("/gardening-events")}>
									<Link to="/gardening-events" className="flex w-full min-w-0 items-center gap-2">
										<CollectionIcon collection="gardeningEvent" className="size-4" />
										{m["collections.gardeningEvent.titlePlural"]()}
									</Link>
								</SidebarMenuButton>
							</SidebarMenuItem>
						</SidebarMenu>
					</SidebarGroupContent>
				</SidebarGroup>
			</SidebarContent>
			<SidebarFooter>
				<ThemeToggle />
				<SidebarLanguageMenu />
			</SidebarFooter>
			<SidebarRail />
		</Sidebar>
	);
}
