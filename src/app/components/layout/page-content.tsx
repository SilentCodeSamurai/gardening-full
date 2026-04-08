import type { HTMLAttributes } from "react";

import { cn } from "@/lib/utils";

type PageContentProps = HTMLAttributes<HTMLDivElement>;

export function PageContent({ className, ...props }: PageContentProps) {
	return <div className={cn("px-4 pt-4 pb-2", className)} {...props} />;
}
