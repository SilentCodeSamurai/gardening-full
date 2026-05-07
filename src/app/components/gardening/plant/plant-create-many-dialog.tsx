import type { CultivarEntityId } from "@backend/core/domain/gardening/entities";
import type { SpatialNodeEntity, SpatialNodeEntityId } from "@backend/core/domain/spatial/entities";
import { useStore } from "@tanstack/react-form";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo } from "react";
import { SELECT_NONE } from "@/components/form/select-sentinel";
import type { SpatialGeometry } from "@/components/spatial-layout-editor";
import {
	allocateNumberedLabelsForNewSiblings,
	duplicateNumberingStem,
} from "@/components/spatial-layout-editor/spatial-layout-editor.naming";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { useAppForm } from "@/hooks/form";
import { orpc } from "@/orpc/client";
import * as m from "@/paraglide/messages.js";
import { queryKeys } from "@/store/keys";
import { usePlantCreateManyMutation } from "@/store/mutations";

type LayoutDraft = {
	id: string;
	label: string;
	geometry: SpatialGeometry;
};

export type PlantCreateManySpatialResult = {
	id: string;
	parentId: string | null;
	rect: { x: number; y: number; width: number; height: number };
	label: string;
	ref: SpatialNodeEntity["ref"];
};

type NameMode = "preview" | "customStem";

type Props = {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	parentSpatialNodeId: SpatialNodeEntityId;
	nodes: LayoutDraft[];
	existingSiblingTitles: string[];
	/** Called once after all plants + spatial nodes are created (single undo step in the layout editor). */
	onSpatialNodesCreated: (nodes: readonly PlantCreateManySpatialResult[]) => void;
};

type FormValues = {
	nameMode: NameMode;
	customStem: string;
	cultivarId: string;
	description: string;
};

export function PlantCreateManyDialog({
	open,
	onOpenChange,
	parentSpatialNodeId,
	nodes,
	existingSiblingTitles,
	onSpatialNodesCreated,
}: Props) {
	const { data: cultivarData } = useQuery({ ...queryKeys.cultivar.all });
	const mut = usePlantCreateManyMutation();
	const queryClient = useQueryClient();

	const cultivarOptions = useMemo(() => {
		const cultivars = cultivarData?.items ?? [];
		return cultivars.map((c) => ({
			value: String(c.id),
			label: c.characteristics.name,
			presentation: c.presentation,
		}));
	}, [cultivarData?.items]);

	const nameModeOptions = useMemo(
		() => [
			{
				value: "preview" as const,
				label: m.components_locationLayoutEditor_createManyNameModePreview(),
			},
			{
				value: "customStem" as const,
				label: m.components_locationLayoutEditor_createManyNameModeCustomStem(),
			},
		],
		[],
	);

	const form = useAppForm({
		defaultValues: {
			nameMode: "preview" satisfies NameMode as NameMode,
			customStem: "",
			cultivarId: SELECT_NONE,
			description: "",
		} satisfies FormValues as FormValues,
		onSubmit: async ({ value }) => {
			if (nodes.length === 0 || value.cultivarId === SELECT_NONE) return;
			if (value.nameMode === "customStem" && !value.customStem.trim()) return;
			const cultivarId = value.cultivarId as CultivarEntityId;
			const cultivarPresentation =
				cultivarData?.items.find((item) => String(item.id) === String(cultivarId))?.presentation ??
				null;
			const description = value.description.trim() || null;
			const titles =
				value.nameMode === "preview"
					? nodes.map((n) => n.label.trim() || null)
					: allocateNumberedLabelsForNewSiblings(
							duplicateNumberingStem(value.customStem.trim()),
							existingSiblingTitles,
							nodes.length,
						).map((s) => s.trim() || null);
			onOpenChange(false);
			const container = await mut.mutateAsync({
				rows: nodes.map((_node, i) => ({
					cultivarId,
					title: titles[i] ?? null,
					description,
					presentation: cultivarPresentation,
				})),
			});
			const spatialCreateInputs: Array<{
				label: string;
				rect: { x: number; y: number; width: number; height: number };
				ref: { entity: "plant"; entityId: string };
			}> = [];
			for (let i = 0; i < container.items.length; i++) {
				const plant = container.items[i];
				const node = nodes[i];
				if (!node) continue;
				spatialCreateInputs.push({
					label: titles[i] ?? "",
					rect: {
						x: node.geometry.x,
						y: node.geometry.y,
						width: node.geometry.width,
						height: node.geometry.height,
					},
					ref: { entity: "plant", entityId: String(plant.id) },
				});
			}
			const createdSpatial = await orpc.spatial.createManyNodes.call({
				items: spatialCreateInputs.map((row) => ({
					parentId: parentSpatialNodeId,
					kind: "leaf" as const,
					ref: row.ref,
					rect: row.rect,
				})),
			});
			const createdNodes = createdSpatial.items.map((spatialNode, i) => ({
				id: String(spatialNode.id),
				parentId: spatialNode.parentId ? String(spatialNode.parentId) : null,
				rect: spatialNode.rect,
				label: spatialCreateInputs[i]?.label ?? "",
				ref: spatialNode.ref,
			}));
			await queryClient.invalidateQueries({ queryKey: queryKeys.spatial._def });
			if (createdNodes.length > 0) onSpatialNodesCreated(createdNodes);
		},
	});

	useEffect(() => {
		if (open) {
			form.reset();
		}
	}, [open, form]);

	const nameMode = useStore(form.store, (state) => state.values.nameMode);

	const close = () => onOpenChange(false);

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-md">
				<DialogHeader>
					<DialogTitle>{m.components_locationLayoutEditor_createManyPlantsTitle()}</DialogTitle>
					<DialogDescription className="sr-only">
						{m.components_locationLayoutEditor_createManyPlantsTitle()}
					</DialogDescription>
				</DialogHeader>
				<form.AppForm>
					<form
						id={form.formId}
						noValidate
						className="grid gap-3"
						onSubmit={(e) => {
							e.preventDefault();
							e.stopPropagation();
							void form.handleSubmit();
						}}
					>
						<form.AppField
							name="cultivarId"
							validators={{
								onSubmit: ({ value }) =>
									!value || value === SELECT_NONE ? m.fields_selectRequired() : undefined,
							}}
						>
							{(field) => (
								<field.CatalogCombobox
									label={m.collections_cultivar_title()}
									placeholder={m.fields_selectPlaceholder()}
									emptyLabel={m.filtering_comboboxEmpty()}
									values={cultivarOptions}
								/>
							)}
						</form.AppField>
						<form.AppField name="nameMode">
							{(field) => (
								<field.Select
									label={m.components_locationLayoutEditor_createManyNamesLabel()}
									values={nameModeOptions}
								/>
							)}
						</form.AppField>
						{nameMode === "customStem" ? (
							<form.AppField name="customStem">
								{(field) => (
									<field.TextField
										label={m.components_locationLayoutEditor_createManyCustomStemLabel()}
										placeholder={m.components_locationLayoutEditor_createManyCustomStemPlaceholder()}
									/>
								)}
							</form.AppField>
						) : null}
						<form.AppField name="description">
							{(field) => (
								<field.TextField label={m.fields_description()} placeholder={m.fields_description()} />
							)}
						</form.AppField>
						<DialogFooter>
							<Button type="button" variant="outline" onClick={close}>
								{m.common_cancel()}
							</Button>
							<form.SubscribeButton label={m.common_create()} />
						</DialogFooter>
					</form>
				</form.AppForm>
			</DialogContent>
		</Dialog>
	);
}
