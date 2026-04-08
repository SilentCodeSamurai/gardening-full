import { useEffect } from "react";
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
import { useLocationCreateMutation, useSpatialNodeCreateMutation } from "@/store/mutations";

type Props = {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	initialPlacement?: {
		parentSpatialNodeId: SpatialNodeEntityId | null;
		x: number;
		y: number;
		width: number;
		height: number;
	};
	/** Seeds the name field when the dialog opens (e.g. layout duplicate). */
	initialName?: string;
	/** Seeds icon colors when duplicating or prefilling a layout draft. */
	initialPresentationFields?: {
		iconKey: string;
		iconColor: string;
		backgroundColor: string;
	};
	onSubmit?: (input: {
		name: string;
		parentSpatialNodeId: SpatialNodeEntityId | null;
		presentation?: ReturnType<typeof normalizePresentationInput>;
		x?: number;
		y?: number;
		width?: number;
		height?: number;
	}) => Promise<void> | void;
	onSpatialNodeCreated?: (input: {
		id: string;
		parentId: string | null;
		rect: { x: number; y: number; width: number; height: number };
		label: string;
		ref: { entity: "location" | "plant"; entityId: string };
	}) => void;
};

type FormValues = {
	name: string;
	iconKey: string;
	iconColor: string;
	backgroundColor: string;
};

export function LocationCreateDialog({
	open,
	onOpenChange,
	initialPlacement,
	initialName,
	initialPresentationFields,
	onSubmit,
	onSpatialNodeCreated,
}: Props) {
	const mut = useLocationCreateMutation();
	const spatialMut = useSpatialNodeCreateMutation();

	const form = useAppForm({
		defaultValues: {
			name: "",
			iconKey: SELECT_NONE,
			iconColor: "",
			backgroundColor: "",
		} satisfies FormValues as FormValues,
		onSubmit: async ({ value }) => {
			const name = value.name.trim();
			if (!name) return;
			const presentation = normalizePresentationInput({
				iconKey: value.iconKey === SELECT_NONE ? "" : value.iconKey,
				iconColor: value.iconColor,
				backgroundColor: value.backgroundColor,
			});
			const payload = {
				name,
				parentSpatialNodeId: initialPlacement?.parentSpatialNodeId ?? null,
				presentation,
				x: initialPlacement?.x,
				y: initialPlacement?.y,
				width: initialPlacement?.width,
				height: initialPlacement?.height,
			};
			if (onSubmit) await onSubmit(payload);
			else if (initialPlacement != null && onSpatialNodeCreated) {
				const entity = await mut.mutateAsync({ name, presentation });
				const spatialNode = await spatialMut.mutateAsync({
					parentId: payload.parentSpatialNodeId,
					kind: "frame",
					ref: { entity: "location", entityId: String(entity.id) },
					rect: {
						x: payload.x ?? 0,
						y: payload.y ?? 0,
						width: payload.width ?? 80,
						height: payload.height ?? 80,
					},
				});
				onSpatialNodeCreated({
					id: String(spatialNode.id),
					parentId: spatialNode.parentId ? String(spatialNode.parentId) : null,
					rect: spatialNode.rect,
					label: name,
					ref: spatialNode.ref,
				});
			} else {
				await mut.mutateAsync({ name, presentation });
			}
			onOpenChange(false);
		},
	});

	useEffect(() => {
		if (open) {
			form.reset();
			if (initialName !== undefined && initialName !== "") {
				form.setFieldValue("name", initialName);
			}
			if (initialPresentationFields) {
				form.setFieldValue(
					"iconKey",
					initialPresentationFields.iconKey ? initialPresentationFields.iconKey : SELECT_NONE,
				);
				form.setFieldValue("iconColor", initialPresentationFields.iconColor ?? "");
				form.setFieldValue("backgroundColor", initialPresentationFields.backgroundColor ?? "");
			}
		}
	}, [open, form, initialName, initialPresentationFields]);

	const iconColor = useStore(form.store, (state) => state.values.iconColor);
	const backgroundColor = useStore(form.store, (state) => state.values.backgroundColor);

	const close = () => onOpenChange(false);

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-md">
				<DialogHeader>
					<DialogTitle>{m["collections.location.create"]()}</DialogTitle>
					<DialogDescription className="sr-only">{m["collections.location.create"]()}</DialogDescription>
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
							name="name"
							validators={{
								onSubmit: ({ value }) => (!value?.trim() ? m["fields.required"]() : undefined),
							}}
						>
							{(field) => <field.TextField label={m["fields.name"]()} placeholder={m["fields.name"]()} />}
						</form.AppField>
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
							<form.SubscribeButton label={m["common.save"]()} />
						</DialogFooter>
					</form>
				</form.AppForm>
			</DialogContent>
		</Dialog>
	);
}
