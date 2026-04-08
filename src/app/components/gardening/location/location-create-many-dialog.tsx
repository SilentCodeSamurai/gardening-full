import { useEffect, useMemo } from "react";
import { useStore } from "@tanstack/react-form";

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
import type { SpatialNodeEntityId } from "@backend/core/domain/spatial/entities";
import { useAppForm } from "@/hooks/form";
import { normalizePresentationInput } from "@/lib/item-presentation";
import type { SpatialGeometry } from "@/components/spatial-layout-editor";
import {
	allocateNumberedLabelsForNewSiblings,
	duplicateNumberingStem,
} from "@/components/spatial-layout-editor/spatial-layout-editor.naming";
import { useLocationCreateMutation, useSpatialNodeCreateMutation } from "@/store/mutations";

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
	existingSiblingNames: string[];
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
	iconKey: string;
	iconColor: string;
	backgroundColor: string;
};

export function LocationCreateManyDialog({
	open,
	onOpenChange,
	parentSpatialNodeId,
	nodes,
	existingSiblingNames,
	onSpatialNodeCreated,
}: Props) {
	const mut = useLocationCreateMutation();
	const spatialMut = useSpatialNodeCreateMutation();

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
			iconKey: SELECT_NONE,
			iconColor: "",
			backgroundColor: "",
		} satisfies FormValues as FormValues,
		onSubmit: async ({ value }) => {
			if (nodes.length === 0) return;
			if (value.nameMode === "customStem" && !value.customStem.trim()) return;
			const presentation = normalizePresentationInput({
				iconKey: value.iconKey === SELECT_NONE ? "" : value.iconKey,
				iconColor: value.iconColor,
				backgroundColor: value.backgroundColor,
			});
			const names =
				value.nameMode === "preview"
					? nodes.map((n) => n.label.trim())
					: allocateNumberedLabelsForNewSiblings(
							duplicateNumberingStem(value.customStem.trim()),
							existingSiblingNames,
							nodes.length,
						);
			for (let i = 0; i < nodes.length; i++) {
				const node = nodes[i];
				const name = (names[i] ?? "").trim();
				if (!name) continue;
				const entity = await mut.mutateAsync({ name, presentation });
				const spatialNode = await spatialMut.mutateAsync({
					parentId: parentSpatialNodeId,
					kind: "frame",
					ref: { entity: "location", entityId: String(entity.id) },
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
					label: name,
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

	const iconColor = useStore(form.store, (state) => state.values.iconColor);
	const backgroundColor = useStore(form.store, (state) => state.values.backgroundColor);
	const nameMode = useStore(form.store, (state) => state.values.nameMode);

	const close = () => onOpenChange(false);

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-md">
				<DialogHeader>
					<DialogTitle>{m["components.locationLayoutEditor.createManyLocationsTitle"]()}</DialogTitle>
					<DialogDescription className="sr-only">
						{m["components.locationLayoutEditor.createManyLocationsTitle"]()}
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
						<div className="grid grid-cols-3 gap-2">
							<form.AppField name="iconKey">
								{(field) => (
									<field.IconPicker
										label={m["fields.icon"]()}
										noneLabel={m["fields.iconNone"]()}
										iconColor={iconColor}
										backgroundColor={backgroundColor}
									/>
								)}
							</form.AppField>
							<form.AppField name="iconColor">
								{(field) => <field.ColorPicker label={m["fields.iconColor"]()} placeholder="#2f855a" />}
							</form.AppField>
							<form.AppField name="backgroundColor">
								{(field) => (
									<field.ColorPicker label={m["fields.backgroundColor"]()} placeholder="#e6ffed" />
								)}
							</form.AppField>
						</div>
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
