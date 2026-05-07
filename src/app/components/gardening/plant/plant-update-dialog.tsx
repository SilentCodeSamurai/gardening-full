import type { CultivarEntityId } from "@backend/core/domain/gardening/entities";
import type { ItemPresentationValueObject } from "@backend/core/domain/gardening/value-objects";
import { useStore } from "@tanstack/react-form";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo } from "react";
import { SELECT_NONE } from "@/components/form/select-sentinel";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { useAppTours } from "@/components/tours/app-tours-provider";
import { useAppForm } from "@/hooks/form";
import { normalizePresentationInput } from "@/lib/item-presentation";
import * as m from "@/paraglide/messages.js";
import { queryKeys } from "@/store/keys";
import { usePlantUpdateMutation } from "@/store/mutations";
import type { CachedHydratedPlant } from "@/store/query-cache-types";

type Props = {
	plant: CachedHydratedPlant;
	open: boolean;
	onOpenChange: (open: boolean) => void;
};

type FormValues = {
	cultivarId: string;
	title: string;
	description: string;
	iconKey: string;
	iconColor: string;
	backgroundColor: string;
};

function toPresentationFields(presentation: ItemPresentationValueObject | null): Pick<FormValues, "iconKey" | "iconColor" | "backgroundColor"> {
	return {
		iconKey: presentation?.iconKey ? String(presentation.iconKey) : SELECT_NONE,
		iconColor: presentation?.iconColor ?? "",
		backgroundColor: presentation?.backgroundColor ?? "",
	};
}

export function PlantUpdateDialog({ plant, open, onOpenChange }: Props) {
	const { activeTourId } = useAppTours();
	const isCrudTourActive = activeTourId === "working-with-data";
	const { data: cultivarData } = useQuery({ ...queryKeys.cultivar.all });
	const mut = usePlantUpdateMutation();

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
			cultivarId: plant.cultivarId != null ? String(plant.cultivarId) : SELECT_NONE,
			title: plant.title ?? "",
			description: plant.description ?? "",
			...toPresentationFields(plant.presentation),
		} satisfies FormValues as FormValues,
		onSubmit: async ({ value }) => {
			const presentation = normalizePresentationInput({
				iconKey: value.iconKey === SELECT_NONE ? "" : value.iconKey,
				iconColor: value.iconColor,
				backgroundColor: value.backgroundColor,
			});
			onOpenChange(false);
			await mut.mutateAsync({
				id: plant.id,
				cultivarId: value.cultivarId === SELECT_NONE ? null : (value.cultivarId as CultivarEntityId),
				title: value.title.trim() || null,
				description: value.description.trim() || null,
				presentation,
			});
		},
	});

	useEffect(() => {
		if (!open) return;
		form.reset({
			cultivarId: plant.cultivarId != null ? String(plant.cultivarId) : SELECT_NONE,
			title: plant.title ?? "",
			description: plant.description ?? "",
			...toPresentationFields(plant.presentation),
		});
	}, [open, plant, form]);

	const iconColor = useStore(form.store, (state) => state.values.iconColor);
	const backgroundColor = useStore(form.store, (state) => state.values.backgroundColor);
	const selectedCultivarId = useStore(form.store, (state) => state.values.cultivarId);

	const close = () => onOpenChange(false);

	return (
		<Dialog open={open} onOpenChange={onOpenChange} modal={!isCrudTourActive}>
			<DialogContent
				className="sm:max-w-md"
				id="plant-update-dialog"
				onInteractOutside={(event) => {
					if (isCrudTourActive) event.preventDefault();
				}}
			>
				<DialogHeader>
					<DialogTitle>{m.collections_plant_update()}</DialogTitle>
					<DialogDescription className="sr-only">{m.collections_plant_update()}</DialogDescription>
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
						<div className="grid gap-3" id="plant-update-form-fields">
							<form.AppField name="cultivarId">
								{(field) => (
									<field.CatalogCombobox
										label={m.collections_cultivar_title()}
										placeholder={m.fields_selectPlaceholder()}
										emptyLabel={m.filtering_comboboxEmpty()}
										values={cultivarOptions}
									/>
								)}
							</form.AppField>
							<form.AppField name="title">
								{(field) => <field.TextField label={m.fields_title()} placeholder={m.fields_title()} />}
							</form.AppField>
							<form.AppField name="description">
								{(field) => (
									<field.TextField label={m.fields_description()} placeholder={m.fields_description()} />
								)}
							</form.AppField>
							<div className="grid grid-cols-3 gap-2">
								<form.AppField name="iconKey">
									{(field) => (
										<field.IconPicker
											label={m.fields_icon()}
											noneLabel={m.fields_iconNone()}
											iconColor={iconColor}
											backgroundColor={backgroundColor}
										/>
									)}
								</form.AppField>
								<form.AppField name="iconColor">
									{(field) => <field.ColorPicker label={m.fields_iconColor()} placeholder="#2f855a" />}
								</form.AppField>
								<form.AppField name="backgroundColor">
									{(field) => (
										<field.ColorPicker label={m.fields_backgroundColor()} placeholder="#e6ffed" />
									)}
								</form.AppField>
							</div>
							<div className="flex justify-end">
								<Button
									type="button"
									variant="outline"
									size="sm"
									disabled={selectedCultivarId === SELECT_NONE}
									onClick={() => {
										const cultivar = cultivarData?.items.find(
											(item) => String(item.id) === selectedCultivarId,
										);
										const next = toPresentationFields(cultivar?.presentation ?? null);
										form.setFieldValue("iconKey", next.iconKey);
										form.setFieldValue("iconColor", next.iconColor);
										form.setFieldValue("backgroundColor", next.backgroundColor);
									}}
								>
									Select from parent cultivar
								</Button>
							</div>
						</div>
						<DialogFooter>
							<Button id="cancel" type="button" variant="outline" onClick={close}>
								{m.common_cancel()}
							</Button>
							<div id="submit">
								<form.SubscribeButton label={m.common_save()} />
							</div>
						</DialogFooter>
					</form>
				</form.AppForm>
			</DialogContent>
		</Dialog>
	);
}
