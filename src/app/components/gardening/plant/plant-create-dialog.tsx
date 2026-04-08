import { useEffect, useMemo } from "react";
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
import { usePlantCreateMutation, useSpatialNodeCreateMutation } from "@/store/mutations";

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
	onSubmit?: (input: {
		cultivarId: CultivarEntityId;
		title: string | null;
		description: string | null;
		parentSpatialNodeId: SpatialNodeEntityId | null;
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
	/** Seeds title when the dialog opens (e.g. layout duplicate). */
	initialTitle?: string;
	/** Pre-select cultivar when the dialog opens. */
	defaultCultivarId?: CultivarEntityId;
	/** Seeds description when the dialog opens (e.g. layout duplicate). */
	initialDescription?: string | null;
};

type FormValues = {
	cultivarId: string;
	title: string;
	description: string;
};

export function PlantCreateDialog({
	open,
	onOpenChange,
	initialPlacement,
	onSubmit,
	onSpatialNodeCreated,
	initialTitle,
	defaultCultivarId,
	initialDescription,
}: Props) {
	const { data: cultivarData } = useQuery({ ...queryKeys.cultivar.all });
	const mut = usePlantCreateMutation();
	const spatialMut = useSpatialNodeCreateMutation();

	const cultivarOptions = useMemo(() => {
		const cultivars = cultivarData?.items ?? [];
		return cultivars.map((c) => ({
			value: String(c.id),
			label: c.characteristics.name,
			presentation: c.presentation,
		}));
	}, [cultivarData?.items]);

	const form = useAppForm({
		defaultValues: {
			cultivarId: SELECT_NONE,
			title: "",
			description: "",
		} satisfies FormValues as FormValues,
		onSubmit: async ({ value }) => {
			if (value.cultivarId === SELECT_NONE) return;
			const payload = {
				cultivarId: value.cultivarId as CultivarEntityId,
				title: value.title.trim() || null,
				description: value.description.trim() || null,
				parentSpatialNodeId: initialPlacement?.parentSpatialNodeId ?? null,
				x: initialPlacement?.x,
				y: initialPlacement?.y,
				width: initialPlacement?.width,
				height: initialPlacement?.height,
			};
			if (onSubmit) await onSubmit(payload);
			else {
				const entity = await mut.mutateAsync({
					cultivarId: payload.cultivarId,
					title: payload.title,
					description: payload.description,
				});
				if (initialPlacement) {
					const spatialNode = await spatialMut.mutateAsync({
						parentId: payload.parentSpatialNodeId,
						kind: "leaf",
						ref: { entity: "plant", entityId: String(entity.id) },
						rect: {
							x: payload.x ?? 0,
							y: payload.y ?? 0,
							width: payload.width ?? 40,
							height: payload.height ?? 40,
						},
					});
					onSpatialNodeCreated?.({
						id: String(spatialNode.id),
						parentId: spatialNode.parentId ? String(spatialNode.parentId) : null,
						rect: spatialNode.rect,
						label: payload.title ?? "",
						ref: spatialNode.ref,
					});
				}
			}
			onOpenChange(false);
		},
	});

	useEffect(() => {
		if (open) {
			form.reset();
			if (initialTitle !== undefined) {
				form.setFieldValue("title", initialTitle);
			}
			if (defaultCultivarId !== undefined) {
				form.setFieldValue("cultivarId", String(defaultCultivarId));
			}
			if (initialDescription !== undefined) {
				form.setFieldValue("description", initialDescription ?? "");
			}
		}
	}, [open, form, initialTitle, defaultCultivarId, initialDescription]);

	const close = () => onOpenChange(false);

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-md">
				<DialogHeader>
					<DialogTitle>{m["collections.plant.create"]()}</DialogTitle>
					<DialogDescription className="sr-only">{m["collections.plant.create"]()}</DialogDescription>
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
						<form.AppField name="title">
							{(field) => (
								<field.TextField label={m["fields.title"]()} placeholder={m["fields.title"]()} />
							)}
						</form.AppField>
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
							<form.SubscribeButton label={m["common.save"]()} />
						</DialogFooter>
					</form>
				</form.AppForm>
			</DialogContent>
		</Dialog>
	);
}
