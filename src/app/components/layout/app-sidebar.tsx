import { UserButton } from "@daveyplate/better-auth-ui";
import { Link, useRouterState } from "@tanstack/react-router";
import { ChevronDownIcon, SettingsIcon } from "lucide-react";
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
import * as m from "@/paraglide/messages.js";

export function AppSidebar() {
	const pathname = useRouterState({ select: (s) => s.location.pathname });
	const isActivePath = (to: string) => pathname === to;

	return (
		<Sidebar variant="inset" collapsible="offcanvas" aria-label={m.components_layout_appShell_sidebarNavLabel()}>
			<SidebarContent>
				<SidebarGroup>
					<SidebarGroupContent>
						<SidebarMenu>
							<SidebarMenuItem>
								<SidebarMenuButton asChild isActive={isActivePath("/dashboard")}>
									<Link to="/dashboard">{m.components_layout_nav_home()}</Link>
								</SidebarMenuButton>
							</SidebarMenuItem>
							<SidebarMenuItem>
								<SidebarMenuButton asChild isActive={isActivePath("/account/settings")}>
									<Link
										to="/account/$accountView"
										params={{ accountView: "settings" }}
										className="flex w-full min-w-0 items-center gap-2"
									>
										<SettingsIcon className="size-4 shrink-0" />
										Settings
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
								{m.components_layout_nav_catalogSection()}
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
												{m.collections_speciesCategory_titlePlural()}
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
												{m.collections_species_titlePlural()}
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
										search={{ category: "", species: "", cultivar: "" }}
										className="flex w-full min-w-0 items-center gap-2"
									>
										<CollectionIcon collection="plant" className="size-4" />
										{m.collections_plant_titlePlural()}
									</Link>
								</SidebarMenuButton>
							</SidebarMenuItem>
							<SidebarMenuItem>
								<SidebarMenuButton asChild isActive={isActivePath("/locations")}>
									<Link to="/locations" className="flex w-full min-w-0 items-center gap-2">
										<CollectionIcon collection="location" className="size-4" />
										{m.collections_location_titlePlural()}
									</Link>
								</SidebarMenuButton>
							</SidebarMenuItem>
							<SidebarMenuItem>
								<SidebarMenuButton asChild isActive={isActivePath("/gardening-events")}>
									<Link to="/gardening-events" className="flex w-full min-w-0 items-center gap-2">
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
					<UserButton className="w-full" />
				<ThemeToggle />
				<SidebarLanguageMenu />
			</SidebarFooter>
			<SidebarRail />
		</Sidebar>
	);
}
