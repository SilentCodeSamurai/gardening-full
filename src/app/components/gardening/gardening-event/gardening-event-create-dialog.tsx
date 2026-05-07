import type { LocationEntityId, PlantEntityId } from "@backend/core/domain/gardening/entities";
import { GardeningActionType } from "@backend/core/domain/gardening/enums";
import type { GardeningAction, ItemPresentationValueObject } from "@backend/core/domain/gardening/value-objects";
import { useStore } from "@tanstack/react-form";
import { useQuery } from "@tanstack/react-query";
import { MinusIcon } from "lucide-react";
import { useEffect, useMemo } from "react";
import { GardeningActionPresentationIcon } from "@/components/gardening/gardening-action-icon";
import { getPlantDisplayTitle } from "@/components/gardening/plant/plant-list-card";
import { ItemPresentationIcon } from "@/components/icon/item-presentation-icon";
import { Button } from "@/components/ui/button";
import {
	Combobox,
	ComboboxChip,
	ComboboxChips,
	ComboboxChipsInput,
	ComboboxContent,
	ComboboxEmpty,
	ComboboxInput,
	ComboboxItem,
	ComboboxList,
	ComboboxValue,
	useComboboxAnchor,
} from "@/components/ui/combobox";
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
import { queryKeys } from "@/store/keys";
import {
	useGardeningEventCreateForLocationMutation,
	useGardeningEventCreateForPlantListMutation,
	useGardeningEventCreateMutation,
} from "@/store/mutations";

type GardeningEventCreateTargetLocationInitialValues = {
	target: "location";
	locationId: LocationEntityId | null;
	actionType?: GardeningAction["type"];
	content?: string;
	occurredAt?: Date;
};

type GardeningEventCreateTargetPlantInitialValues = {
	target: "plants";
	plantIds: PlantEntityId[];
	actionType?: GardeningAction["type"];
	content?: string;
	occurredAt?: Date;
};

type GardeningEventCreateUnboundInitialValues = {
	target: "none";
	actionType?: GardeningAction["type"];
	content?: string;
	occurredAt?: Date;
};

export type GardeningEventCreateDialogInitialValues =
	| GardeningEventCreateUnboundInitialValues
	| GardeningEventCreateTargetLocationInitialValues
	| GardeningEventCreateTargetPlantInitialValues;

type Props = {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	initialValues?: GardeningEventCreateDialogInitialValues;
};

type FormValues = {
	actionType: string;
	content: string;
	occurredAt: Date;
	target: "none" | "location" | "plants";
	locationId: string;
	plantIds: string[];
	targetLocked: boolean;
};

type PlantOption = {
	value: string;
	label: string;
	presentation?: ItemPresentationValueObject | null;
};

type ActionTypeOption = { value: GardeningAction["type"]; label: string };

export function GardeningEventCreateDialog({ open, onOpenChange, initialValues }: Props) {
	const { data: locationData } = useQuery({ ...queryKeys.location.all });
	const { data: plantData } = useQuery({ ...queryKeys.plant.all });
	const createMut = useGardeningEventCreateMutation();
	const locationMut = useGardeningEventCreateForLocationMutation();
	const plantsMut = useGardeningEventCreateForPlantListMutation();

	const actionTypeValues = useMemo<ActionTypeOption[]>(
		() =>
			(Object.values(GardeningActionType) as GardeningAction["type"][]).map((type) => ({
				value: type,
				label: gardeningActionMessage(type),
			})),
		[],
	);

	const locationValues = useMemo(
		() =>
			(locationData?.items ?? []).map((location) => ({
				value: String(location.id),
				label: location.name,
				presentation: location.presentation,
			})),
		[locationData?.items],
	);

	const plantOptions = useMemo<PlantOption[]>(
		() =>
			(plantData?.items ?? []).map((plant) => ({
				value: String(plant.id),
				label: getPlantDisplayTitle(plant),
				presentation: plant.presentation,
			})),
		[plantData?.items],
	);

	const form = useAppForm({
		defaultValues: {
			actionType: "note",
			content: "",
			occurredAt: new Date(),
			target: "none",
			locationId: "",
			plantIds: [],
			targetLocked: false,
		} satisfies FormValues as FormValues,
		onSubmit: async ({ value }) => {
			const actionTypeValue = typeof value.actionType === "string" ? value.actionType : "";
			const actionType = actionTypeValue as GardeningAction["type"];
			const allowed = Object.values(GardeningActionType) as GardeningAction["type"][];
			if (!allowed.includes(actionType)) return;
			const action: GardeningAction = {
				type: actionType,
				content: value.content,
			};
			if (!(value.occurredAt instanceof Date) || Number.isNaN(value.occurredAt.getTime())) return;
			const occurredAt = value.occurredAt;

			if (value.target === "none") {
				onOpenChange(false);
				await createMut.mutateAsync({ action, occurredAt });
			} else if (value.target === "location") {
				const locationId = typeof value.locationId === "string" ? value.locationId.trim() : "";
				if (!locationId) return;
				onOpenChange(false);
				await locationMut.mutateAsync({
					locationId: locationId as LocationEntityId,
					action,
					occurredAt,
				});
			} else {
				const plantIds = (Array.isArray(value.plantIds) ? value.plantIds : []).filter(
					(id): id is string => typeof id === "string" && id.trim().length > 0,
				);
				if (plantIds.length === 0) return;
				onOpenChange(false);
				await plantsMut.mutateAsync({
					plantIds: plantIds as PlantEntityId[],
					action,
					occurredAt,
				});
			}
		},
	});

	useEffect(() => {
		if (!open) return;
		const actionType = initialValues?.actionType ?? "note";
		const content = initialValues?.content ?? "";
		const occurredAt = initialValues?.occurredAt ?? new Date();
		if (!initialValues) {
			form.reset({
				actionType,
				content,
				occurredAt,
				target: "none",
				locationId: "",
				plantIds: [],
				targetLocked: false,
			});
			return;
		}
		if (initialValues.target === "none") {
			form.reset({
				actionType,
				content,
				occurredAt,
				target: "none",
				locationId: "",
				plantIds: [],
				targetLocked: false,
			});
			return;
		}
		if (initialValues.target === "location") {
			form.reset({
				actionType,
				content,
				occurredAt,
				target: "location",
				locationId: initialValues?.locationId != null ? String(initialValues.locationId) : "",
				plantIds: [],
				targetLocked: initialValues?.locationId != null,
			});
			return;
		}
		form.reset({
			actionType,
			content,
			occurredAt,
			target: "plants",
			locationId: "",
			plantIds: initialValues.plantIds.map((id) => String(id)),
			targetLocked: initialValues.plantIds.length > 0,
		});
	}, [open, form, initialValues]);

	const close = () => onOpenChange(false);
	const plantsAnchor = useComboboxAnchor();
	/** Subscribe to action type only (combobox outside Subscribe branch). */
	const selectedActionType = useStore(form.store, (state) => state.values.actionType);
	const buildLocationValuesWithFallback = (selectedLocationId: string) => {
		if (!selectedLocationId) return locationValues;
		const exists = locationValues.some((location) => location.value === selectedLocationId);
		if (exists) return locationValues;
		return [{ value: selectedLocationId, label: selectedLocationId }, ...locationValues];
	};
	const buildPlantOptionsWithFallback = (selectedPlantIds: string[]) => {
		if (selectedPlantIds.length === 0) return plantOptions;
		const existingIds = new Set(plantOptions.map((option) => option.value));
		const missing = selectedPlantIds.filter((id) => !existingIds.has(id)).map((id) => ({ value: id, label: id }));
		return [...missing, ...plantOptions];
	};
	const buildSelectedPlants = (plantOptionsWithFallback: PlantOption[], selectedPlantIds: string[]) =>
		plantOptionsWithFallback.filter((option) => selectedPlantIds.includes(option.value));
	const selectedAction = useMemo(
		() => actionTypeValues.find((option) => option.value === selectedActionType) ?? null,
		[actionTypeValues, selectedActionType],
	);

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-md">
				<DialogHeader>
					<DialogTitle>{m.collections_gardeningEvent_create()}</DialogTitle>
					<DialogDescription className="sr-only">{m.collections_gardeningEvent_create()}</DialogDescription>
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
						<form.Subscribe
							selector={(state) => ({
								target: state.values.target,
								targetLocked: state.values.targetLocked,
								locationId: state.values.locationId,
								plantIds: state.values.plantIds,
							})}
						>
							{({ target, targetLocked, locationId, plantIds }) => {
								const isLocationLocked = Boolean(targetLocked && target === "location");
								const isPlantsLocked = Boolean(targetLocked && target === "plants");
								const locationValuesWithFallback = buildLocationValuesWithFallback(locationId);
								const plantOptionsWithFallback = buildPlantOptionsWithFallback(plantIds);
								const selectedPlants = buildSelectedPlants(plantOptionsWithFallback, plantIds);
								return (
									<>
										{!targetLocked ? (
											<form.AppField
													name="target"
													validators={{
														onSubmit: ({ value }) =>
															typeof value !== "string" || !value.trim()
																? m.fields_selectRequired()
																: undefined,
													}}
												>
													{(field) => (
														<field.Select
															label={m.common_linkedTo()}
															placeholder={m.fields_selectPlaceholder()}
															values={[
																{
																	value: "none",
																	label: (
																		<span className="inline-flex items-center">
																			<MinusIcon className="size-4" aria-hidden />
																		</span>
																	),
																},
																{
																	value: "location",
																	label: m.collections_location_title(),
																},
																{
																	value: "plants",
																	label: m.collections_plant_titlePlural(),
																},
															]}
														/>
													)}
											</form.AppField>
										) : null}
										{target === "location" ? (
											<form.AppField
												name="locationId"
												validators={{
													onSubmit: ({ value }) =>
														typeof value !== "string" || !value.trim()
															? m.fields_selectRequired()
															: undefined,
												}}
											>
												{(field) => (
													<field.CatalogCombobox
														label={m.collections_location_title()}
														placeholder={m.fields_selectPlaceholder()}
														emptyLabel={m.filtering_comboboxEmpty()}
														values={locationValuesWithFallback}
														disabled={isLocationLocked}
													/>
												)}
											</form.AppField>
										) : target === "plants" ? (
											<form.AppField
												name="plantIds"
												validators={{
													onSubmit: ({ value, fieldApi }) =>
														fieldApi.form.state.values.target === "plants" &&
														(!Array.isArray(value) || value.length === 0)
															? m.fields_required()
															: undefined,
												}}
											>
												{(field) => (
													<div className="grid gap-1">
														<p className="font-medium text-xs">
															{m.collections_plant_titlePlural()}
														</p>
														<Combobox
															multiple
															autoHighlight
															disabled={isPlantsLocked}
															items={plantOptionsWithFallback}
															value={selectedPlants}
															onValueChange={(items) =>
																field.handleChange(
																	(items ?? []).map((item) => item.value),
																)
															}
															itemToStringLabel={(o) => o.label}
															itemToStringValue={(o) => o.value}
															isItemEqualToValue={(a, b) => a.value === b.value}
														>
															<ComboboxChips
																ref={plantsAnchor}
																className="w-full"
																onBlur={field.handleBlur}
															>
																<ComboboxValue>
																	{(values) => (
																		<>
																			{values.map((value: PlantOption) => (
																				<ComboboxChip
																					key={value.value}
																					showRemove={!isPlantsLocked}
																					className={
																						value.presentation
																							? "h-6 gap-1 pl-0"
																							: "h-6"
																					}
																				>
																					{value.presentation ? (
																						<ItemPresentationIcon
																							presentation={
																								value.presentation
																							}
																						/>
																					) : null}
																					<span className="max-w-32 truncate pr-1">
																						{value.label}
																					</span>
																				</ComboboxChip>
																			))}
																			<ComboboxChipsInput
																				placeholder={m.fields_selectPlaceholder()}
																				disabled={isPlantsLocked}
																			/>
																		</>
																	)}
																</ComboboxValue>
															</ComboboxChips>
															<ComboboxContent className="z-100" anchor={plantsAnchor}>
																<ComboboxEmpty>
																	{m.filtering_comboboxEmpty()}
																</ComboboxEmpty>
																<ComboboxList>
																	{(item) => (
																		<ComboboxItem key={item.value} value={item}>
																			{item.presentation ? (
																				<ItemPresentationIcon
																					presentation={item.presentation}
																				/>
																			) : null}
																			<span className="min-w-0 flex-1 truncate">
																				{item.label}
																			</span>
																		</ComboboxItem>
																	)}
																</ComboboxList>
															</ComboboxContent>
														</Combobox>
														{selectedPlants.length > 0 ? (
															<p className="text-muted-foreground text-xs">
																{selectedPlants.map((item) => item.label).join(", ")}
															</p>
														) : null}
														{field.state.meta.isTouched &&
														field.state.meta.errors.length > 0 ? (
															<p className="font-medium text-destructive text-xs">
																{String(field.state.meta.errors[0])}
															</p>
														) : null}
													</div>
												)}
											</form.AppField>
										) : null}
										{target === "none" ? (
											<p className="text-muted-foreground text-xs">
												{m.collections_gardeningEvent_createUnboundHint()}
											</p>
										) : null}
									</>
								);
							}}
						</form.Subscribe>
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
								onSubmit: ({ value }) =>
									typeof value !== "string" || !value.trim() ? m.fields_selectRequired() : undefined,
							}}
						>
							{(field) => (
								<div className="grid gap-1">
									<p className="font-medium text-xs">{m.components_detail_field_actionType()}</p>
									<Combobox
										items={actionTypeValues}
										value={selectedAction}
										onValueChange={(item) => field.handleChange(item?.value ?? "")}
										itemToStringLabel={(o) => o.label}
										itemToStringValue={(o) => o.value}
										isItemEqualToValue={(a, b) => a.value === b.value}
									>
										<ComboboxInput
											placeholder={m.fields_selectPlaceholder()}
											showClear
											onBlur={field.handleBlur}
											startAdornment={
												selectedAction ? (
													<GardeningActionPresentationIcon
														action={{ type: selectedAction.value, content: "" }}
													/>
												) : null
											}
										/>
										<ComboboxContent className="z-100">
											<ComboboxEmpty>{m.filtering_comboboxEmpty()}</ComboboxEmpty>
											<ComboboxList>
												{(item) => (
													<ComboboxItem key={item.value} value={item}>
														<GardeningActionPresentationIcon
															action={{ type: item.value, content: "" }}
														/>
														<span className="min-w-0 flex-1 truncate">{item.label}</span>
													</ComboboxItem>
												)}
											</ComboboxList>
										</ComboboxContent>
									</Combobox>
									{field.state.meta.isTouched && field.state.meta.errors.length > 0 ? (
										<p className="font-medium text-destructive text-xs">
											{String(field.state.meta.errors[0])}
										</p>
									) : null}
								</div>
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

