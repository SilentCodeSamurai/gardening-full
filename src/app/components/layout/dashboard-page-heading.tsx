// import { OrganizationSwitcher } from "@daveyplate/better-auth-ui";
import { ArrowLeftIcon } from "lucide-react";
import type { ReactNode } from "react";
import { CollectionIcon, type GardeningCollectionKey } from "@/components/icon/collection-icon";
import { TableViewModeToggle } from "@/components/table/table-view-mode-toggle";
import { Button } from "@/components/ui/button";
import { ButtonTooltip } from "@/components/ui/button-tooltip";
import { SidebarTrigger } from "@/components/ui/sidebar";
import type { CollectionViewMode } from "@/hooks/use-collection-table-state";
import { cn } from "@/lib/utils";
import * as m from "@/paraglide/messages.js";
import { Separator } from "../ui/separator";

type DashboardPageHeadingProps = {
	className?: string;
	triggerClassName?: string;
	collection?: GardeningCollectionKey;
	/** Table vs list; rendered at the end of the heading row. */
	viewModeToggle?: {
		value: CollectionViewMode;
		onValueChange: (mode: CollectionViewMode) => void;
	};
	children: ReactNode;
};

export function DashboardPageHeading({
	className,
	triggerClassName,
	collection,
	viewModeToggle,
	children,
}: DashboardPageHeadingProps) {
	return (
		<>
			<div className={cn("flex min-w-0 items-center gap-1 py-1 pl-1", className)}>
				<SidebarTrigger className={cn("shrink-0", triggerClassName)} />
				<ButtonTooltip label={m.common_back()}>
					<Button
						type="button"
						size="icon"
						variant="outline"
						className="shrink-0"
						aria-label={m.common_back()}
						onClick={() => window.history.back()}
					>
						<span className="sr-only">{m.common_back()}</span>
						<ArrowLeftIcon />
					</Button>
				</ButtonTooltip>
				<Separator orientation="vertical" />
				<div className="ml-1 flex min-w-0 flex-1 items-center justify-between gap-2 pr-1">
					<div className="flex min-w-0 items-center gap-2">
						{collection ? <CollectionIcon collection={collection} className="size-5" /> : null}
						{children}
					</div>
					{viewModeToggle ? (
						<TableViewModeToggle
							value={viewModeToggle.value}
							onValueChange={viewModeToggle.onValueChange}
						/>
					) : null}
				</div>
			</div>
			<Separator orientation="horizontal" className="w-full" />
		</>
	);
}
