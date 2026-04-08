import { Link } from "@tanstack/react-router";
import { XIcon } from "lucide-react";

import { ItemPresentationIcon } from "@/components/icon/item-presentation-icon";
import { cn } from "@/lib/utils";
import type { LocationPlacementSummary, PlantPlacementSummary } from "@/lib/spatial-placement-summary";

type LocationProps = {
	mode: "location";
	summary: LocationPlacementSummary;
	rootLabel: string;
	unplacedAriaLabel: string;
};

type PlantProps = {
	mode: "plant";
	summary: PlantPlacementSummary;
	unplacedAriaLabel: string;
};

type TablePlacementCellProps = LocationProps | PlantProps;

const linkClass =
	"flex min-w-0 max-w-full items-center gap-1.5 rounded-sm text-left text-xs font-medium text-foreground outline-none transition-colors hover:text-primary focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1";

/**
 * Placement column body: parent / root self-link / unplaced — no combobox chrome (filter uses combobox).
 */
export function TablePlacementCell(props: TablePlacementCellProps) {
	const unplacedAria = props.unplacedAriaLabel;

	if (props.mode === "plant") {
		const { summary } = props;
		if (summary.kind === "unplaced") {
			return (
				<div className="flex min-w-0 items-center text-muted-foreground" aria-label={unplacedAria}>
					<XIcon className="size-3.5 shrink-0" aria-hidden />
				</div>
			);
		}
		return (
			<Link to="/location/$locationId" params={{ locationId: summary.locationId }} className={cn(linkClass)}>
				<ItemPresentationIcon presentation={summary.locationPresentation} className="size-5 shrink-0" />
				<span className="min-w-0 truncate">{summary.locationName}</span>
			</Link>
		);
	}

	const { summary, rootLabel } = props;

	if (summary.kind === "unplaced") {
		return (
			<div className="flex min-w-0 items-center text-muted-foreground" aria-label={unplacedAria}>
				<XIcon className="size-3.5 shrink-0" aria-hidden />
			</div>
		);
	}

	if (summary.kind === "underParent") {
		return (
			<Link
				to="/location/$locationId"
				params={{ locationId: summary.parentLocationId }}
				className={cn(linkClass)}
			>
				<ItemPresentationIcon presentation={summary.parentPresentation} className="size-5 shrink-0" />
				<span className="min-w-0 truncate">{summary.parentName}</span>
			</Link>
		);
	}

	return (
		<Link
			to="/location/$locationId"
			params={{ locationId: summary.selfLocationId }}
			className={cn(linkClass)}
			title={summary.selfName}
		>
			<ItemPresentationIcon presentation={summary.selfPresentation} className="size-5 shrink-0" />
			<span className="min-w-0 truncate">{rootLabel}</span>
		</Link>
	);
}
