import type { ComponentProps, ReactElement } from "react";

import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

type IconTooltipProps = {
	label: string;
	children: ReactElement;
	disabled?: boolean;
} & Pick<ComponentProps<typeof TooltipContent>, "side">;

export function ButtonTooltip({ label, children, side = "top", disabled }: IconTooltipProps) {
	const trigger = disabled ? <span className="inline-flex">{children}</span> : children;
	return (
		<Tooltip>
			<TooltipTrigger asChild>{trigger}</TooltipTrigger>
			<TooltipContent side={side}>{label}</TooltipContent>
		</Tooltip>
	);
}
