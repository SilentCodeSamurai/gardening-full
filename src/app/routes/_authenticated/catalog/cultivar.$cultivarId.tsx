import type { CultivarEntityId } from "@backend/core/domain/gardening/entities";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { PencilIcon, Trash2Icon } from "lucide-react";
import { useState } from "react";
import { CultivarUpdateDialog } from "@/components/gardening/cultivar/cultivar-update-dialog";
import { DeleteConfirmDialog } from "@/components/gardening/shared/delete-confirm-dialog";
import { ItemPresentationIcon } from "@/components/icon/item-presentation-icon";
import { PageContent } from "@/components/layout/page-content";
import { PageHeading } from "@/components/layout/page-heading";
import { Button } from "@/components/ui/button";
import { ButtonTooltip } from "@/components/ui/button-tooltip";
import { translateCatalogField } from "@/lib/translate-catalog-field";
import * as m from "@/paraglide/messages.js";
import { getLocale } from "@/paraglide/runtime";
import { queryKeys } from "@/store/keys";
import { useCultivarDeleteMutation } from "@/store/mutations";

export const Route = createFileRoute("/_authenticated/catalog/cultivar/$cultivarId")({
	component: CultivarDetailPage,
});

function CultivarDetailPage() {
	const [editOpen, setEditOpen] = useState(false);
	const [deleteOpen, setDeleteOpen] = useState(false);
	const navigate = useNavigate();
	const del = useCultivarDeleteMutation();
	const { cultivarId } = Route.useParams();
	const { data, isPending, isError } = useQuery({
		...queryKeys.cultivar.fullById(cultivarId as CultivarEntityId),
	});

	if (isPending) {
		return <div className="text-muted-foreground text-sm">{m.common_loading()}</div>;
	}
	if (isError || !data) {
		return (
			<div className="text-destructive text-sm">
				{`${m.collections_cultivar_title()} ${m.common_notFound()}`}
			</div>
		)
	}

	const { species } = data;

	return (
		<div className="flex min-h-0 flex-1 flex-col overflow-hidden">
			<PageHeading className="min-w-0 flex-wrap" collection="cultivar">
				<div className="flex min-w-0 flex-wrap items-center gap-3">
					<ItemPresentationIcon presentation={data.presentation} />
					<h1 className="font-heading font-medium text-lg">{data.characteristics.name}</h1>
				</div>
				<div className="flex shrink-0 items-center gap-1">
					<ButtonTooltip label={m.common_edit()}>
						<Button
							type="button"
							variant="outline"
							size="icon"
							aria-label={m.common_edit()}
							onClick={() => setEditOpen(true)}
						>
							<PencilIcon />
						</Button>
					</ButtonTooltip>
					<ButtonTooltip label={m.common_delete()}>
						<Button
							type="button"
							variant="destructive"
							size="icon"
							aria-label={m.common_delete()}
							onClick={() => setDeleteOpen(true)}
						>
							<Trash2Icon />
						</Button>
					</ButtonTooltip>
					<CultivarUpdateDialog cultivar={data} open={editOpen} onOpenChange={setEditOpen} />
					<DeleteConfirmDialog
						open={deleteOpen}
						onOpenChange={setDeleteOpen}
						title={m.collections_cultivar_delete()}
						description={data.characteristics.name}
						isPending={del.isPending}
						onConfirm={async () => {
							await del.mutateAsync({ id: data.id });
							setDeleteOpen(false);
							await navigate({
								to: "/catalog/cultivars",
								search: {
									category: String(species.categoryId),
									species: String(species.id),
								},
							})
						}}
					/>
				</div>
			</PageHeading>
			<PageContent className="flex flex-col gap-6 overflow-y-auto pb-6">
				{data.characteristics.description ? (
					<p className="max-w-2xl text-muted-foreground text-sm leading-relaxed">
						{data.characteristics.description}
					</p>
				) : (
					<p className="text-muted-foreground text-sm italic">
						{m.components_detail_field_noDescription()}
					</p>
				)}

				<section className="rounded-xl border border-border/70 bg-muted/15 p-4 shadow-sm">
					<h2 className="mb-3 font-semibold text-muted-foreground text-xs uppercase tracking-wide">
						{m.components_detail_metaHeading()}
					</h2>
					<dl className="grid gap-x-4 gap-y-3 text-sm sm:grid-cols-[minmax(9rem,auto)_1fr]">
						<div className="contents">
							<dt className="text-muted-foreground">{m.collections_species_title()}</dt>
							<dd className="wrap-break-word min-w-0">
								<Link
									to="/catalog/species-detail/$speciesId"
									params={{ speciesId: String(data.speciesId) }}
									search={{ category: String(species.categoryId) }}
									className="text-primary underline-offset-4 hover:underline"
								>
									{translateCatalogField(species.characteristics.name, species.systemCatalog)}
								</Link>
							</dd>
						</div>

						<div className="contents">
							<dt className="text-muted-foreground">{m.fields_createdAt()}</dt>
							<dd className="wrap-break-word min-w-0">
								{data.createdAt.toLocaleString(getLocale(), {
									dateStyle: "medium",
									timeStyle: "short",
								})}
							</dd>
						</div>
						<div className="contents">
							<dt className="text-muted-foreground">{m.fields_updatedAt()}</dt>
							<dd className="wrap-break-word min-w-0">
								{data.updatedAt.toLocaleString(getLocale(), {
									dateStyle: "medium",
									timeStyle: "short",
								})}
							</dd>
						</div>
						<div className="contents">
							<dt className="text-muted-foreground">{m.components_detail_field_relatedLists()}</dt>
							<dd className="wrap-break-word min-w-0">
								<Link
									to="/plants"
									search={{ category: "", species: "", cultivar: String(data.id) }}
									className="text-primary underline-offset-4 hover:underline"
								>
									{m.components_detail_link_plantsWithCultivar()}
								</Link>
							</dd>
						</div>
					</dl>
				</section>
			</PageContent>
		</div>
	)
}
