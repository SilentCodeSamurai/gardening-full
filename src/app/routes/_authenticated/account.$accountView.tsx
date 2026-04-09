import { AccountView } from "@daveyplate/better-auth-ui";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/account/$accountView")({
	component: AccountSettingsRoute,
});

function AccountSettingsRoute() {
	const { accountView } = Route.useParams();

	return (
		<div className="flex min-h-0 flex-1 flex-col overflow-hidden p-4 md:p-6">
			<AccountView pathname={accountView} />
		</div>
	)
}
