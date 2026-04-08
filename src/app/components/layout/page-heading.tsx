import type { ReactNode } from "react";

import { CollectionIcon, type GardeningCollectionKey } from "@/components/icon/collection-icon";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";
import { Separator } from "../ui/separator";

type PageHeadingProps = {
	className?: string;
	triggerClassName?: string;
	collection?: GardeningCollectionKey;
	children: ReactNode;
};

export function PageHeading({ className, triggerClassName, collection, children }: PageHeadingProps) {
	return (
		<>
			<div className={cn("flex min-w-0 items-center gap-2", className)}>
				<SidebarTrigger className={cn("shrink-0", triggerClassName)} />
				<Separator orientation="vertical" className="h-4" />
				{collection ? <CollectionIcon collection={collection} className="size-5" /> : null}
				{children}
			</div>
			<Separator orientation="horizontal" className="w-full" />
		</>
	);
}
