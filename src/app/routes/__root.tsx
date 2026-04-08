import { TanStackDevtools } from "@tanstack/react-devtools";
import type { QueryClient } from "@tanstack/react-query";
import { createRootRouteWithContext, HeadContent, Outlet, Scripts, useRouterState } from "@tanstack/react-router";
import { TanStackRouterDevtoolsPanel } from "@tanstack/react-router-devtools";
import type { ReactNode } from "react";
import { buildThemeInitScript, ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import * as m from "@/paraglide/messages.js";
import { getLocale } from "@/paraglide/runtime";
import TanStackQueryDevtools from "../integrations/tanstack-query/devtools";
import appCss from "../styles.css?url";

// import { TanStackRouterDevtools } from "@tanstack/react-router-devtools";

import { AppSidebar } from "@/components/layout/app-sidebar";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { TooltipProvider } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface MyRouterContext {
	queryClient: QueryClient;
}

const THEME_INIT_SCRIPT = buildThemeInitScript();

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

export const Route = createRootRouteWithContext<MyRouterContext>()({
	beforeLoad: async () => {
		// Other redirect strategies are possible; see
		// https://github.com/TanStack/router/tree/main/examples/react/i18n-paraglide#offline-redirect
		if (typeof document !== "undefined") {
			document.documentElement.setAttribute("lang", getLocale());
		}
	},

	head: () => ({
		meta: [
			{
				charSet: "utf-8",
			},
			{
				name: "viewport",
				content: "width=device-width, initial-scale=1",
			},
			{
				title: "TanStack Start Starter",
			},
		],
		links: [
			{
				rel: "stylesheet",
				href: appCss,
			},
		],
	}),
	shellComponent: RootDocument,
});

function RootDocument() {
	return (
		<html lang={getLocale()} suppressHydrationWarning>
			<head>
				{/** biome-ignore lint/security/noDangerouslySetInnerHtml: <safe theme script> */}
				<script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
				<HeadContent />
			</head>
			<body className="font-sans antialiased [overflow-wrap:anywhere] selection:bg-[rgba(79,184,178,0.24)]">
				<ThemeProvider>
					<TooltipProvider>
						<SidebarProvider className="h-svh max-h-svh overflow-hidden bg-background">
							<AppSidebar />

							<SidebarInset
								id="main-content"
								aria-label={m["components.layout.appShell.mainLabel"]()}
								className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden"
							>
								<MainOutletShell>
									<Outlet />
								</MainOutletShell>
							</SidebarInset>

							<Toaster position="top-center" richColors />

							<TanStackDevtools
								config={{
									position: "bottom-right",
								}}
								plugins={[
									{
										name: "Tanstack Router",
										render: <TanStackRouterDevtoolsPanel />,
									},
									TanStackQueryDevtools,
								]}
							/>
							<Scripts />
						</SidebarProvider>
					</TooltipProvider>
				</ThemeProvider>
			</body>
		</html>
	);
}
