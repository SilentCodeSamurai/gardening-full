import { createFileRoute, Outlet, redirect, useRouterState } from "@tanstack/react-router";
import type { ReactNode } from "react";

import { AppSidebar } from "@/components/layout/app-sidebar";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { getAuthSession } from "@/lib/get-auth-session";
import { cn } from "@/lib/utils";
import * as m from "@/paraglide/messages.js";

const LIST_FULL_HEIGHT_PATHNAMES = new Set([
	"/plants",
	"/locations",
	"/gardening-events",
	"/catalog/species",
	"/catalog/cultivars",
	"/catalog/species-categories",
]);

function MainOutletShell({ children }: { children: ReactNode }) {
	const pathname = useRouterState({ select: (s) => s.location.pathname });
	const listFullHeight = LIST_FULL_HEIGHT_PATHNAMES.has(pathname);
	return (
		<div
			className={cn(
				"flex min-h-0 flex-1 flex-col",
				listFullHeight ? "overflow-hidden" : "overflow-y-auto overflow-x-hidden",
			)}
		>
			{children}
		</div>
	);
}

export const Route = createFileRoute("/_authenticated")({
	beforeLoad: async ({ location }) => {
		const session = await getAuthSession();
		if (!session) {
			throw redirect({
				to: "/auth/$authView",
				params: { authView: "sign-in" },
				search: { redirect: location.pathname },
			});
		}
	},
	component: AuthenticatedLayout,
});

function AuthenticatedLayout() {
	return (
		<SidebarProvider className="h-svh max-h-svh overflow-hidden bg-background">
			<AppSidebar />
			<SidebarInset
				id="main-content"
				aria-label={m.components_layout_appShell_mainLabel()}
				className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden"
			>
				<MainOutletShell>
					<Outlet />
				</MainOutletShell>
			</SidebarInset>
		</SidebarProvider>
	);
}
