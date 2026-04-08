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
import { useAppForm } from "@/hooks/form";
import { normalizePresentationInput } from "@/lib/item-presentation";
import { useSpeciesCategoryCreateMutation } from "@/store/mutations";

type Props = {
	open: boolean;
	onOpenChange: (open: boolean) => void;
};

type FormValues = {
	title: string;
	iconKey: string;
	iconColor: string;
	backgroundColor: string;
};

export function SpeciesCategoryCreateDialog({ open, onOpenChange }: Props) {
	const mut = useSpeciesCategoryCreateMutation();

	const form = useAppForm({
		defaultValues: {
			title: "",
			iconKey: SELECT_NONE,
			iconColor: "",
			backgroundColor: "",
		} satisfies FormValues as FormValues,
		onSubmit: async ({ value }) => {
			const title = value.title.trim();
			if (!title) return;
			const presentation = normalizePresentationInput({
				iconKey: value.iconKey === SELECT_NONE ? "" : value.iconKey,
				iconColor: value.iconColor,
				backgroundColor: value.backgroundColor,
			});
			await mut.mutateAsync({ title, presentation });
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
					<DialogTitle>{m["collections.speciesCategory.create"]()}</DialogTitle>
					<DialogDescription className="sr-only">
						{m["collections.speciesCategory.create"]()}
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
								onSubmit: ({ value }) => (!value?.trim() ? m["fields.required"]() : undefined),
							}}
						>
							{(field) => (
								<field.TextField label={m["fields.title"]()} placeholder={m["fields.title"]()} />
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
