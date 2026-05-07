import type { ItemPresentationValueObject } from "@backend/core/domain/gardening/value-objects";
import { resolveItemPresentationIconNode } from "@/lib/item-presentation-icon-registry";
import { cn } from "@/lib/utils";

export function ItemPresentationIcon({
	presentation,
	className,
}: {
	presentation?: ItemPresentationValueObject | null;
	className?: string;
}) {
	if (!presentation) return null;

	const iconNode =
		presentation.iconKey != null && String(presentation.iconKey).trim() !== ""
			? resolveItemPresentationIconNode(presentation.iconKey, {
					className: "size-5 shrink-0",
				})
			: null;

	const hasCustomBg = Boolean(presentation.backgroundColor?.trim());

	return (
		<span
			data-slot="item-presentation-icon"
			className={cn(
				"box-border grid size-6 shrink-0 place-items-center rounded-sm border [&>svg]:block [&>svg]:shrink-0",
				!hasCustomBg && "bg-muted",
				className,
			)}
			style={{
				color: presentation.iconColor?.trim() || undefined,
				backgroundColor: hasCustomBg ? presentation.backgroundColor?.trim() : undefined,
			}}
			aria-hidden
		>
			{iconNode ?? null}
		</span>
	);
}
