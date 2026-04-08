import type { GardeningAction, ItemPresentationValueObject } from "@backend/core/domain/gardening/value-objects";
import { ItemPresentationIcon } from "../icon/item-presentation-icon";
import { GardeningActionType } from "@backend/core/domain/gardening/enums";

const GARDENING_ACTION_PRESENTATION_MAP: Record<GardeningActionType, ItemPresentationValueObject> = {
	[GardeningActionType.watering]: {
		iconKey: "action.watering",
		iconColor: "#1d4ed8",
		backgroundColor: "#dbeafe",
	},
	[GardeningActionType.fertilization]: {
		iconKey: "action.fertilization",
		iconColor: "#b45309",
		backgroundColor: "#ffedd5",
	},
	[GardeningActionType.pruning]: {
		iconKey: "action.pruning",
		iconColor: "#166534",
		backgroundColor: "#dcfce7",
	},
	[GardeningActionType.harvesting]: {
		iconKey: "action.harvesting",
		iconColor: "#9a3412",
		backgroundColor: "#ffedd5",
	},
	[GardeningActionType.transplanting]: {
		iconKey: "action.transplanting",
		iconColor: "#92400e",
		backgroundColor: "#fef3c7",
	},
	[GardeningActionType.note]: {
		iconKey: "action.note",
		iconColor: "#a16207",
		backgroundColor: "#fef9c3",
	},
};

export function GardeningActionPresentationIcon({
	action,
	className,
}: {
	action: GardeningAction;
	className?: string;
}) {
	return <ItemPresentationIcon presentation={GARDENING_ACTION_PRESENTATION_MAP[action.type]} className={className} />;
}
