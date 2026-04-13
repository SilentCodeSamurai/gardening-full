import type { CultivarEntityId } from "@backend/core/domain/gardening/entities";
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
import { useAppForm } from "@/hooks/form";
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
};

export function PlantUpdateDialog({ plant, open, onOpenChange }: Props) {
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
		} satisfies FormValues as FormValues,
		onSubmit: async ({ value }) => {
			onOpenChange(false);
			await mut.mutateAsync({
				id: plant.id,
				cultivarId: value.cultivarId === SELECT_NONE ? null : (value.cultivarId as CultivarEntityId),
				title: value.title.trim() || null,
				description: value.description.trim() || null,
			});
		},
	});

	useEffect(() => {
		if (!open) return;
		form.reset({
			cultivarId: plant.cultivarId != null ? String(plant.cultivarId) : SELECT_NONE,
			title: plant.title ?? "",
			description: plant.description ?? "",
		});
	}, [open, plant, form]);

	const close = () => onOpenChange(false);

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-md">
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
