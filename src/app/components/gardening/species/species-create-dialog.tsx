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
import type { SpeciesCategoryEntityId } from "@backend/core/domain/gardening/entities";
import { useAppForm } from "@/hooks/form";
import { normalizePresentationInput } from "@/lib/item-presentation";
import { translateCatalogField } from "@/lib/translate-catalog-field";
import { queryKeys } from "@/store/keys";
import { useSpeciesCreateMutation } from "@/store/mutations";

type Props = {
	open: boolean;
	onOpenChange: (open: boolean) => void;
};

type FormValues = {
	categoryId: string;
	name: string;
	description: string;
	iconKey: string;
	iconColor: string;
	backgroundColor: string;
};

export function SpeciesCreateDialog({ open, onOpenChange }: Props) {
	const { data: catData } = useQuery({ ...queryKeys.speciesCategory.all });
	const mut = useSpeciesCreateMutation();

	const categoryOptions = useMemo(() => {
		const categories = catData?.items ?? [];
		return categories.map((c) => ({
			value: String(c.id),
			label: translateCatalogField(c.title, c.isDefault) ?? String(c.id),
			presentation: c.presentation,
		}));
	}, [catData?.items, t]);

	const form = useAppForm({
		defaultValues: {
			categoryId: SELECT_NONE,
			name: "",
			description: "",
			iconKey: SELECT_NONE,
			iconColor: "",
			backgroundColor: "",
		} satisfies FormValues as FormValues,
		onSubmit: async ({ value }) => {
			if (value.categoryId === SELECT_NONE || !value.name.trim()) return;
			const presentation = normalizePresentationInput({
				iconKey: value.iconKey === SELECT_NONE ? "" : value.iconKey,
				iconColor: value.iconColor,
				backgroundColor: value.backgroundColor,
			});
			await mut.mutateAsync({
				categoryId: value.categoryId as SpeciesCategoryEntityId,
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
		if (open) form.reset();
	}, [open, form]);
	const iconColor = useStore(form.store, (state) => state.values.iconColor);
	const backgroundColor = useStore(form.store, (state) => state.values.backgroundColor);

	const close = () => onOpenChange(false);

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-md">
				<DialogHeader>
					<DialogTitle>{m["collections.species.create"]()}</DialogTitle>
					<DialogDescription className="sr-only">{m["collections.species.create"]()}</DialogDescription>
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
							name="categoryId"
							validators={{
								onSubmit: ({ value }) =>
									!value || value === SELECT_NONE ? m["fields.selectRequired"]() : undefined,
							}}
						>
							{(field) => (
								<field.CatalogCombobox
									label={m["collections.speciesCategory.title"]()}
									placeholder={m["fields.selectPlaceholder"]()}
									emptyLabel={m["filtering.comboboxEmpty"]()}
									values={categoryOptions}
								/>
							)}
						</form.AppField>
						<form.AppField
							name="name"
							validators={{
								onSubmit: ({ value }) => (!value?.trim() ? m["fields.required"]() : undefined),
							}}
						>
							{(field) => <field.TextField label={m["fields.name"]()} placeholder={m["fields.name"]()} />}
						</form.AppField>
						<form.AppField name="description">
							{(field) => (
								<field.TextField
									label={m["fields.description"]()}
									placeholder={m["fields.description"]()}
								/>
							)}
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
