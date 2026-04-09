import type { SpeciesCategoryEntityId } from "@backend/core/domain/gardening/entities";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { PencilIcon, Trash2Icon } from "lucide-react";
import { useState } from "react";
import { DeleteConfirmDialog } from "@/components/gardening/shared/delete-confirm-dialog";
import { SpeciesCategoryUpdateDialog } from "@/components/gardening/species-category/species-category-update-dialog";
import { ItemPresentationIcon } from "@/components/icon/item-presentation-icon";
import { PageContent } from "@/components/layout/page-content";
import { PageHeading } from "@/components/layout/page-heading";
import { Button } from "@/components/ui/button";
import { ButtonTooltip } from "@/components/ui/button-tooltip";
import { translateCatalogField } from "@/lib/translate-catalog-field";
import * as m from "@/paraglide/messages.js";
import { getLocale } from "@/paraglide/runtime";
import { queryKeys } from "@/store/keys";
import { useSpeciesCategoryDeleteMutation } from "@/store/mutations";

export const Route = createFileRoute("/_authenticated/catalog/species-category/$speciesCategoryId")({
	component: SpeciesCategoryDetailPage,
});

function SpeciesCategoryDetailPage() {
	const [editOpen, setEditOpen] = useState(false);
	const [deleteOpen, setDeleteOpen] = useState(false);
	const navigate = useNavigate();
	const del = useSpeciesCategoryDeleteMutation();
	const { speciesCategoryId } = Route.useParams();
	const { data, isPending, isError } = useQuery({
		...queryKeys.speciesCategory.detail(speciesCategoryId as SpeciesCategoryEntityId),
	});

	if (isPending) {
		return <div className="text-muted-foreground text-sm">{m.common_loading()}</div>;
	}
	if (isError || !data) {
		return (
			<div className="text-destructive text-sm">
				{`${m.collections_speciesCategory_title()} ${m.common_notFound()}`}
			</div>
		)
	}

	const title = translateCatalogField(data.title, data.systemCatalog);

	return (
		<div className="flex min-h-0 flex-1 flex-col overflow-hidden">
			<PageHeading className="min-w-0 flex-wrap" collection="speciesCategory">
				<div className="flex min-w-0 flex-wrap items-center gap-3">
					<ItemPresentationIcon presentation={data.presentation} />
					<h1 className="font-heading font-medium text-lg">{title}</h1>
				</div>
				<div className="flex shrink-0 items-center gap-1">
					{!data.systemCatalog ? (
						<>
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
							<SpeciesCategoryUpdateDialog category={data} open={editOpen} onOpenChange={setEditOpen} />
							<DeleteConfirmDialog
								open={deleteOpen}
								onOpenChange={setDeleteOpen}
								title={m.collections_speciesCategory_delete()}
								description={title ?? ""}
								isPending={del.isPending}
								onConfirm={async () => {
									await del.mutateAsync({ id: data.id });
									setDeleteOpen(false)
									await navigate({ to: "/catalog/species-categories" });
								}}
							/>
						</>
					) : null}
				</div>
			</PageHeading>
			<PageContent className="flex flex-col gap-6 overflow-y-auto pb-6">
				<section className="rounded-xl border border-border/70 bg-muted/15 p-4 shadow-sm">
					<h2 className="mb-3 font-semibold text-muted-foreground text-xs uppercase tracking-wide">
						{m.components_detail_metaHeading()}
					</h2>
					<dl className="grid gap-x-4 gap-y-3 text-sm sm:grid-cols-[minmax(9rem,auto)_1fr]">
						<div className="contents">
							<dt className="text-muted-foreground">
								{m.components_detail_field_defaultCatalogRow()}
							</dt>
							<dd className="wrap-break-word min-w-0">
								{data.systemCatalog ? m.common_yes() : m.common_no()}
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
						<div className="contents sm:col-span-2">
							<dt className="text-muted-foreground">{m.components_detail_field_relatedLists()}</dt>
							<dd className="min-w-0">
								<div className="flex flex-col gap-2">
									<Link
										to="/catalog/species"
										search={{ category: String(data.id) }}
										className="inline-flex w-fit text-primary underline-offset-4 hover:underline"
									>
										{m.components_detail_link_speciesInCategory()}
									</Link>
									<Link
										to="/catalog/cultivars"
										search={{ category: String(data.id), species: "" }}
										className="inline-flex w-fit text-primary underline-offset-4 hover:underline"
									>
										{m.components_detail_link_cultivarsInCategory()}
									</Link>
									<Link
										to="/plants"
										search={{ category: String(data.id), species: "", cultivar: "" }}
										className="inline-flex w-fit text-primary underline-offset-4 hover:underline"
									>
										{m.components_detail_link_plantsInCategory()}
									</Link>
								</div>
							</dd>
						</div>
					</dl>
				</section>
			</PageContent>
		</div>
	)
}
