import { useEffect, useMemo } from "react";

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
import { GardeningActionType } from "@backend/core/domain/gardening/enums";
import type { GardeningEventEntity } from "@backend/core/domain/gardening/entities";
import type { GardeningAction } from "@backend/core/domain/gardening/value-objects";
import { useAppForm } from "@/hooks/form";
import { useGardeningEventUpdateMutation } from "@/store/mutations";

type Props = {
	event: GardeningEventEntity;
	open: boolean;
	onOpenChange: (open: boolean) => void;
};

type FormValues = {
	actionType: string;
	content: string;
};

export function GardeningEventUpdateDialog({ event, open, onOpenChange }: Props) {
	const mut = useGardeningEventUpdateMutation();

	const actionTypeValues = useMemo(
		() =>
			(Object.values(GardeningActionType) as GardeningAction["type"][]).map((type) => ({
				value: type,
				label: m[`gardeningActions.${type}` as keyof typeof m](),
			})),
		[],
	);

	const form = useAppForm({
		defaultValues: {
			actionType: event.action.type,
			content: event.action.content,
		} satisfies FormValues as FormValues,
		onSubmit: async ({ value }) => {
			const actionType = value.actionType as GardeningAction["type"];
			const allowed = Object.values(GardeningActionType) as GardeningAction["type"][];
			if (!allowed.includes(actionType)) return;
			const action: GardeningAction = {
				type: actionType,
				content: value.content,
			};
			await mut.mutateAsync({
				id: event.id,
				action,
			});
			onOpenChange(false);
		},
	});

	useEffect(() => {
		if (!open) return;
		form.reset({
			actionType: event.action.type,
			content: event.action.content,
		});
	}, [open, event, form]);

	const close = () => onOpenChange(false);

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-md">
				<DialogHeader>
					<DialogTitle>{m["collections.gardeningEvent.update"]()}</DialogTitle>
					<DialogDescription className="sr-only">
						{m["collections.gardeningEvent.update"]()}
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
							name="actionType"
							validators={{
								onSubmit: ({ value }) => (!value?.trim() ? m["fields.selectRequired"]() : undefined),
							}}
						>
							{(field) => (
								<field.Select
									label={m["components.detail.field.actionType"]()}
									placeholder={m["fields.selectPlaceholder"]()}
									values={actionTypeValues}
								/>
							)}
						</form.AppField>
						<form.AppField name="content">
							{(field) => <field.TextArea label={m["fields.description"]()} rows={4} />}
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
