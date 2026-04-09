import { AuthUIProviderTanstack } from "@daveyplate/better-auth-ui/tanstack";
import { Link, useNavigate } from "@tanstack/react-router";
import type { ReactNode } from "react";

import { authClient } from "@/lib/auth-client";

function clientBaseUrl(): string | undefined {
	if (typeof window === "undefined") return undefined;
	return window.location.origin;
}

export function AppAuthProvider({ children }: { children: ReactNode }) {
	const navigate = useNavigate();

	return (
		<AuthUIProviderTanstack
			authClient={authClient}
			baseURL={clientBaseUrl()}
			redirectTo="/dashboard"
			navigate={(href) => {
				void navigate({ to: href });
			}}
			replace={(href) => {
				void navigate({ to: href, replace: true });
			}}
			Link={({ href, className, children: linkChildren }) => (
				<Link to={href} className={className}>
					{linkChildren}
				</Link>
			)}
			account
		>
			{children}
		</AuthUIProviderTanstack>
	);
}
