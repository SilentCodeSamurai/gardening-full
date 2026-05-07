import { GardeningActionType } from "@backend/core/domain/gardening/enums";
import type { GardeningAction } from "@backend/core/domain/gardening/value-objects";
import { useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { useAppForm } from "@/hooks/form";
import { gardeningActionMessage } from "@/lib/gardening-action-messages";
import * as m from "@/paraglide/messages.js";
import { useGardeningEventUpdateMutation } from "@/store/mutations";
import type { CachedGardeningEvent } from "@/store/query-cache-types";

type Props = {
	event: CachedGardeningEvent;
	open: boolean;
	onOpenChange: (open: boolean) => void;
};

type FormValues = {
	actionType: string;
	content: string;
	occurredAt: Date;
};

export function GardeningEventUpdateDialog({ event, open, onOpenChange }: Props) {
	const mut = useGardeningEventUpdateMutation();

	const actionTypeValues = useMemo(
		() =>
			(Object.values(GardeningActionType) as GardeningAction["type"][]).map((type) => ({
				value: type,
				label: gardeningActionMessage(type),
			})),
		[],
	);

	const form = useAppForm({
		defaultValues: {
			actionType: event.action.type,
			content: event.action.content,
			occurredAt: event.occurredAt ?? new Date(),
		} satisfies FormValues as FormValues,
		onSubmit: async ({ value }) => {
			const actionType = value.actionType as GardeningAction["type"];
			const allowed = Object.values(GardeningActionType) as GardeningAction["type"][];
			if (!allowed.includes(actionType)) return;
			const action: GardeningAction = {
				type: actionType,
				content: value.content,
			};
			if (!(value.occurredAt instanceof Date) || Number.isNaN(value.occurredAt.getTime())) return;
			const occurredAt = value.occurredAt;
			onOpenChange(false);
			await mut.mutateAsync({
				id: event.id,
				action,
				occurredAt,
			});
		},
	});

	useEffect(() => {
		if (!open) return;
		form.reset({
			actionType: event.action.type,
			content: event.action.content,
			occurredAt: event.occurredAt ?? new Date(),
		});
	}, [open, event, form]);

	const close = () => onOpenChange(false);

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-md">
				<DialogHeader>
					<DialogTitle>{m.collections_gardeningEvent_update()}</DialogTitle>
					<DialogDescription className="sr-only">{m.collections_gardeningEvent_update()}</DialogDescription>
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
							name="occurredAt"
							validators={{
								onSubmit: ({ value }) => {
									if (!(value instanceof Date)) return m.fields_required();
									return Number.isNaN(value.getTime()) ? m.fields_required() : undefined;
								},
							}}
						>
							{(field) => <field.DateTimePicker label={m.fields_occurredAt()} />}
						</form.AppField>
						<form.AppField
							name="actionType"
							validators={{
								onSubmit: ({ value }) => (!value?.trim() ? m.fields_selectRequired() : undefined),
							}}
						>
							{(field) => (
								<field.Select
									label={m.components_detail_field_actionType()}
									placeholder={m.fields_selectPlaceholder()}
									values={actionTypeValues}
								/>
							)}
						</form.AppField>
						<form.AppField name="content">
							{(field) => <field.TextArea label={m.fields_description()} rows={4} />}
						</form.AppField>
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

