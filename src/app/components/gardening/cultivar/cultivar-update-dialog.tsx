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
import type { CultivarEntity, SpeciesEntityId } from "@backend/core/domain/gardening/entities";
import { useAppForm } from "@/hooks/form";
import { normalizePresentationInput } from "@/lib/item-presentation";
import { translateCatalogField } from "@/lib/translate-catalog-field";
import { queryKeys } from "@/store/keys";
import { useCultivarUpdateMutation } from "@/store/mutations";

type Props = {
	cultivar: CultivarEntity;
	open: boolean;
	onOpenChange: (open: boolean) => void;
};

type FormValues = {
	speciesId: string;
	name: string;
	description: string;
	iconKey: string;
	iconColor: string;
	backgroundColor: string;
};

export function CultivarUpdateDialog({ cultivar, open, onOpenChange }: Props) {
	const { data: speciesData } = useQuery({ ...queryKeys.species.all });
	const mut = useCultivarUpdateMutation();

	const speciesOptions = useMemo(() => {
		const speciesList = speciesData?.items ?? [];
		return speciesList.map((s) => ({
			value: String(s.id),
			label: translateCatalogField(s.characteristics.name, s.systemCatalog) ?? String(s.id),
			presentation: s.presentation,
		}));
	}, [speciesData?.items]);

	const form = useAppForm({
		defaultValues: {
			speciesId: String(cultivar.speciesId),
			name: cultivar.characteristics.name,
			description: cultivar.characteristics.description ?? "",
			iconKey: cultivar.presentation?.iconKey ?? SELECT_NONE,
			iconColor: cultivar.presentation?.iconColor ?? "",
			backgroundColor: cultivar.presentation?.backgroundColor ?? "",
		} satisfies FormValues as FormValues,
		onSubmit: async ({ value }) => {
			if (value.speciesId === SELECT_NONE || !value.name.trim()) return;
			const presentation = normalizePresentationInput({
				iconKey: value.iconKey === SELECT_NONE ? "" : value.iconKey,
				iconColor: value.iconColor,
				backgroundColor: value.backgroundColor,
			});
			await mut.mutateAsync({
				id: cultivar.id,
				speciesId: value.speciesId as SpeciesEntityId,
				characteristics: {
					name: value.name.trim(),
					description: value.description.trim() || null,
				},
				presentation,
			});
			onOpenChange(false);
		},
	});

	useEffect(() => {
		if (!open) return;
		form.reset({
			speciesId: String(cultivar.speciesId),
			name: cultivar.characteristics.name,
			description: cultivar.characteristics.description ?? "",
			iconKey: cultivar.presentation?.iconKey ?? SELECT_NONE,
			iconColor: cultivar.presentation?.iconColor ?? "",
			backgroundColor: cultivar.presentation?.backgroundColor ?? "",
		});
	}, [open, cultivar, form]);

	const iconColor = useStore(form.store, (state) => state.values.iconColor);
	const backgroundColor = useStore(form.store, (state) => state.values.backgroundColor);

	const close = () => onOpenChange(false);

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-md">
				<DialogHeader>
					<DialogTitle>{m.collections_cultivar_update()}</DialogTitle>
					<DialogDescription className="sr-only">{m.collections_cultivar_update()}</DialogDescription>
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
							name="speciesId"
							validators={{
								onSubmit: ({ value }) =>
									!value || value === SELECT_NONE ? m.fields_selectRequired() : undefined,
							}}
						>
							{(field) => (
								<field.CatalogCombobox
									label={m.collections_species_title()}
									placeholder={m.fields_selectPlaceholder()}
									emptyLabel={m.filtering_comboboxEmpty()}
									values={speciesOptions}
								/>
							)}
						</form.AppField>
						<form.AppField
							name="name"
							validators={{
								onSubmit: ({ value }) => (!value?.trim() ? m.fields_required() : undefined),
							}}
						>
							{(field) => <field.TextField label={m.fields_name()} placeholder={m.fields_name()} />}
						</form.AppField>
						<form.AppField name="description">
							{(field) => (
								<field.TextField
									label={m.fields_description()}
									placeholder={m.fields_description()}
								/>
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
						<DialogFooter>
							<Button type="button" variant="outline" onClick={close}>
								{m.common_cancel()}
							</Button>
							<form.SubscribeButton label={m.common_save()} />
						</DialogFooter>
					</form>
				</form.AppForm>
			</DialogContent>
		</Dialog>
	);
}
