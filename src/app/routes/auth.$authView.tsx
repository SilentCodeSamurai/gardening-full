import { AuthView } from "@daveyplate/better-auth-ui";
import { createFileRoute, redirect } from "@tanstack/react-router";

import { getAuthSession } from "@/lib/get-auth-session";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/auth/$authView")({
	validateSearch: (search: Record<string, unknown>): { redirect?: string } => ({
		redirect: typeof search.redirect === "string" ? search.redirect : undefined,
	}),
	beforeLoad: async ({ params }) => {
		const session = await getAuthSession();
		const view = params.authView;
		if (session && (view === "sign-in" || view === "sign-up")) {
			throw redirect({ to: "/dashboard" });
		}
	},
	component: AuthViewRoute,
});

function safeInternalPath(raw: string | undefined): string | undefined {
	if (!raw || !raw.startsWith("/") || raw.startsWith("//")) return undefined;
	return raw;
}

function AuthViewRoute() {
	const { authView } = Route.useParams();
	const { redirect: redirectSearch } = Route.useSearch();
	const redirectTo = safeInternalPath(redirectSearch);

	return (
		<div className="flex min-h-svh flex-col bg-background">
			<main className="container mx-auto flex grow flex-col items-center justify-center gap-3 self-center p-4 md:p-6">
				<AuthView pathname={authView} redirectTo={redirectTo} />

				<p
					className={cn(
						["callback", "sign-out"].includes(authView) && "hidden",
						"text-center text-muted-foreground text-xs",
					)}
				>
					Powered by{" "}
					<a className="text-primary underline" href="https://better-auth.com" target="_blank" rel="noreferrer">
						better-auth
					</a>
					.
				</p>
			</main>
		</div>
	);
}
