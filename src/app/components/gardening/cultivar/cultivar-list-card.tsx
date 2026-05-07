import { Link } from "@tanstack/react-router";
import { EllipsisVerticalIcon, ExternalLinkIcon, PencilIcon, Trash2Icon } from "lucide-react";
import { useState } from "react";
import { CultivarUpdateDialog } from "@/components/gardening/cultivar/cultivar-update-dialog";
import { DeleteConfirmDialog } from "@/components/gardening/shared/delete-confirm-dialog";
import { ItemPresentationIcon } from "@/components/icon/item-presentation-icon";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSub,
	DropdownMenuSubContent,
	DropdownMenuSubTrigger,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Item, ItemActions } from "@/components/ui/item";
import { pendingItemSurfaceClassName } from "@/components/ui/pending-item-surface";
import { serializeUrlColumnFilters } from "@/lib/table-url-filters";
import { cn } from "@/lib/utils";
import * as m from "@/paraglide/messages.js";
import { useCultivarDeleteMutation } from "@/store/mutations";
import type { CachedCultivar } from "@/store/query-cache-types";
import { isQueryObjectPending } from "@/store/query-object-status";

type Props = {
	cultivar: CachedCultivar;
	speciesLabel: string;
	linkedPlantsCount: number;
	selected?: boolean;
	onSelectedChange?: (next: boolean) => void;
};

export function CultivarListCard({
	cultivar,
	speciesLabel,
	linkedPlantsCount,
	selected = false,
	onSelectedChange,
}: Props) {
	const [editOpen, setEditOpen] = useState(false);
	const [deleteOpen, setDeleteOpen] = useState(false);
	const del = useCultivarDeleteMutation();
	const linkedTitle = m.common_related();
	const syncPending = isQueryObjectPending(cultivar);
	const name = cultivar.characteristics.name;

	return (
		<Item
			variant="list"
			size="list"
			className={cn(
				"relative transition-colors",
				!syncPending && "hover:bg-card/45",
				syncPending && pendingItemSurfaceClassName,
			)}
			data-pending={syncPending ? "true" : undefined}
			aria-busy={syncPending || undefined}
		>
			<div className="relative flex w-full min-w-0 flex-row items-center justify-between gap-3">
				<Link
					to="/catalog/cultivar/$cultivarId"
					params={{ cultivarId: String(cultivar.id) }}
					className="absolute inset-0 z-0 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
					aria-label={`${name} — ${m.common_open()} ${m.common_details().toLowerCase()}`}
				/>
				<div className="relative z-20 flex shrink-0 items-center justify-center">
					<Checkbox
						aria-label={m.table_selectRow({ name: name || m.items_untitled() })}
						checked={selected}
						className="size-5"
						onCheckedChange={(checked) => onSelectedChange?.(checked === true)}
					/>
				</div>
				<div className="pointer-events-none relative z-10 flex min-w-0 flex-1 flex-row items-center gap-2">
					<ItemPresentationIcon presentation={cultivar.presentation} />
					<div className="flex min-w-0 flex-col items-start justify-center">
						<span className="truncate font-medium">{name}</span>
						<span className="text-muted-foreground text-xs">{speciesLabel}</span>
					</div>
				</div>
				<ItemActions className="relative z-20 shrink-0 gap-1">
					<DropdownMenu>
						<DropdownMenuTrigger asChild>
							<Button type="button" variant="outline" size="icon" aria-label={m.common_actions()}>
								<EllipsisVerticalIcon />
							</Button>
						</DropdownMenuTrigger>
						<DropdownMenuContent className="flex flex-col gap-1" align="end">
							<DropdownMenuItem
								disabled={syncPending}
								title={syncPending ? m.common_editDisabledPendingSync() : m.common_edit()}
								onSelect={() => setEditOpen(true)}
							>
								<PencilIcon />
								{m.common_edit()}
							</DropdownMenuItem>
							<DropdownMenuItem
								disabled={syncPending}
								title={syncPending ? m.common_editDisabledPendingSync() : m.common_delete()}
								onSelect={() => setDeleteOpen(true)}
							>
								<Trash2Icon />
								{m.common_delete()}
							</DropdownMenuItem>
							<DropdownMenuSub>
								<DropdownMenuSubTrigger title={linkedTitle} aria-label={linkedTitle}>
									<ExternalLinkIcon />
									{linkedTitle}
								</DropdownMenuSubTrigger>
								<DropdownMenuSubContent className="flex flex-col gap-1">
									<DropdownMenuItem asChild>
										<Button asChild variant="outline" size="xs" title={linkedTitle}>
											<Link
												to="/plants"
												search={{
													cf: serializeUrlColumnFilters([{ id: "cultivar", value: String(cultivar.id) }]),
												}}
												aria-label={linkedTitle}
											>
												<ExternalLinkIcon />
												{m.collections_plant_titlePlural()}
											</Link>
										</Button>
									</DropdownMenuItem>
								</DropdownMenuSubContent>
							</DropdownMenuSub>
						</DropdownMenuContent>
					</DropdownMenu>
					<CultivarUpdateDialog cultivar={cultivar} open={editOpen} onOpenChange={setEditOpen} />
					<DeleteConfirmDialog
						open={deleteOpen}
						onOpenChange={setDeleteOpen}
						title={m.collections_cultivar_delete()}
						description={cultivar.characteristics.name}
						warningDescription={
							linkedPlantsCount > 0
								? linkedPlantsCount === 1
									? m.collections_cultivar_deleteLinkedSingle()
									: m.collections_cultivar_deleteLinkedMany({ count: String(linkedPlantsCount) })
								: undefined
						}
						isPending={del.isPending}
						onConfirm={async () => {
							setDeleteOpen(false);
							await del.mutateAsync({ id: cultivar.id });
						}}
					/>
				</ItemActions>
			</div>
		</Item>
	);
}
