import { useEffect, useMemo } from "react";
import { useStore } from "@tanstack/react-form";
import { useQuery } from "@tanstack/react-query";

import { SELECT_NONE } from "@/components/form/select-sentinel";
import { Button } from "@/components/ui/button";
import * as m from "@/paraglide/messages.js";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import type { CultivarEntityId } from "@backend/core/domain/gardening/entities";
import type { SpatialNodeEntityId } from "@backend/core/domain/spatial/entities";
import { useAppForm } from "@/hooks/form";
import { queryKeys } from "@/store/keys";
import type { SpatialGeometry } from "@/components/spatial-layout-editor";
import {
	allocateNumberedLabelsForNewSiblings,
	duplicateNumberingStem,
} from "@/components/spatial-layout-editor/spatial-layout-editor.naming";
import { usePlantCreateManyMutation, useSpatialNodeCreateMutation } from "@/store/mutations";

type LayoutDraft = {
	id: string;
	label: string;
	geometry: SpatialGeometry;
};

type NameMode = "preview" | "customStem";

type Props = {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	parentSpatialNodeId: SpatialNodeEntityId;
	nodes: LayoutDraft[];
	existingSiblingTitles: string[];
	onSpatialNodeCreated?: (input: {
		id: string;
		parentId: string | null;
		rect: { x: number; y: number; width: number; height: number };
		label: string;
		ref: { entity: "location" | "plant"; entityId: string };
	}) => void;
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
	onSpatialNodeCreated,
}: Props) {
	const { data: cultivarData } = useQuery({ ...queryKeys.cultivar.all });
	const mut = usePlantCreateManyMutation();
	const spatialMut = useSpatialNodeCreateMutation();

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
				label: m["components.locationLayoutEditor.createManyNameModePreview"](),
			},
			{
				value: "customStem" as const,
				label: m["components.locationLayoutEditor.createManyNameModeCustomStem"](),
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
			const description = value.description.trim() || null;
			const titles =
				value.nameMode === "preview"
					? nodes.map((n) => n.label.trim() || null)
					: allocateNumberedLabelsForNewSiblings(
							duplicateNumberingStem(value.customStem.trim()),
							existingSiblingTitles,
							nodes.length,
						).map((s) => s.trim() || null);
			const container = await mut.mutateAsync({
				rows: nodes.map((_node, i) => ({
					cultivarId,
					title: titles[i] ?? null,
					description,
				})),
			});
			for (let i = 0; i < container.items.length; i++) {
				const plant = container.items[i];
				const node = nodes[i];
				if (!node) continue;
				const spatialNode = await spatialMut.mutateAsync({
					parentId: parentSpatialNodeId,
					kind: "leaf",
					ref: { entity: "plant", entityId: String(plant.id) },
					rect: {
						x: node.geometry.x,
						y: node.geometry.y,
						width: node.geometry.width,
						height: node.geometry.height,
					},
				});
				onSpatialNodeCreated?.({
					id: String(spatialNode.id),
					parentId: spatialNode.parentId ? String(spatialNode.parentId) : null,
					rect: spatialNode.rect,
					label: titles[i] ?? "",
					ref: spatialNode.ref,
				});
			}
			onOpenChange(false);
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
					<DialogTitle>{m["components.locationLayoutEditor.createManyPlantsTitle"]()}</DialogTitle>
					<DialogDescription className="sr-only">
						{m["components.locationLayoutEditor.createManyPlantsTitle"]()}
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
									!value || value === SELECT_NONE ? m["fields.selectRequired"]() : undefined,
							}}
						>
							{(field) => (
								<field.CatalogCombobox
									label={m["collections.cultivar.title"]()}
									placeholder={m["fields.selectPlaceholder"]()}
									emptyLabel={m["filtering.comboboxEmpty"]()}
									values={cultivarOptions}
								/>
							)}
						</form.AppField>
						<form.AppField name="nameMode">
							{(field) => (
								<field.Select
									label={m["components.locationLayoutEditor.createManyNamesLabel"]()}
									values={nameModeOptions}
								/>
							)}
						</form.AppField>
						{nameMode === "customStem" ? (
							<form.AppField name="customStem">
								{(field) => (
									<field.TextField
										label={m["components.locationLayoutEditor.createManyCustomStemLabel"]()}
										placeholder={m[
											"components.locationLayoutEditor.createManyCustomStemPlaceholder"
										]()}
									/>
								)}
							</form.AppField>
						) : null}
						<form.AppField name="description">
							{(field) => (
								<field.TextField
									label={m["fields.description"]()}
									placeholder={m["fields.description"]()}
								/>
							)}
						</form.AppField>
						<DialogFooter>
							<Button type="button" variant="outline" onClick={close}>
								{m["common.cancel"]()}
							</Button>
							<form.SubscribeButton label={m["common.create"]()} />
						</DialogFooter>
					</form>
				</form.AppForm>
			</DialogContent>
		</Dialog>
	);
}
