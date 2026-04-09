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
import type { SpeciesCategoryWithSystemCatalog } from "@backend/core/application/use-cases/gardening/species-category.crud-use-cases";
import { useAppForm } from "@/hooks/form";
import { normalizePresentationInput } from "@/lib/item-presentation";
import { useSpeciesCategoryUpdateMutation } from "@/store/mutations";

type Props = {
	category: SpeciesCategoryWithSystemCatalog;
	open: boolean;
	onOpenChange: (open: boolean) => void;
};

type FormValues = {
	title: string;
	iconKey: string;
	iconColor: string;
	backgroundColor: string;
};

export function SpeciesCategoryUpdateDialog({ category, open, onOpenChange }: Props) {
	const mut = useSpeciesCategoryUpdateMutation();

	const form = useAppForm({
		defaultValues: {
			title: category.title,
			iconKey: category.presentation?.iconKey ?? SELECT_NONE,
			iconColor: category.presentation?.iconColor ?? "",
			backgroundColor: category.presentation?.backgroundColor ?? "",
		} satisfies FormValues as FormValues,
		onSubmit: async ({ value }) => {
			const title = value.title.trim();
			if (!title) return;
			const presentation = normalizePresentationInput({
				iconKey: value.iconKey === SELECT_NONE ? "" : value.iconKey,
				iconColor: value.iconColor,
				backgroundColor: value.backgroundColor,
			});
			await mut.mutateAsync({
				id: category.id,
				title,
				presentation,
			});
			onOpenChange(false);
		},
	});

	useEffect(() => {
		if (!open) return;
		form.reset({
			title: category.title,
			iconKey: category.presentation?.iconKey ?? SELECT_NONE,
			iconColor: category.presentation?.iconColor ?? "",
			backgroundColor: category.presentation?.backgroundColor ?? "",
		});
	}, [open, category, form]);

	const iconColor = useStore(form.store, (state) => state.values.iconColor);
	const backgroundColor = useStore(form.store, (state) => state.values.backgroundColor);

	const close = () => onOpenChange(false);

	if (category.systemCatalog) return null;

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-md">
				<DialogHeader>
					<DialogTitle>{m.collections_speciesCategory_update()}</DialogTitle>
					<DialogDescription className="sr-only">
						{m.collections_speciesCategory_update()}
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
							name="title"
							validators={{
								onSubmit: ({ value }) => (!value?.trim() ? m.fields_required() : undefined),
							}}
						>
							{(field) => (
								<field.TextField label={m.fields_title()} placeholder={m.fields_title()} />
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
