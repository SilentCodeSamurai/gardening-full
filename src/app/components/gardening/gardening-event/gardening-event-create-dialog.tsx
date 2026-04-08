import { useEffect, useMemo } from "react";
import { useStore } from "@tanstack/react-form";
import { useQuery } from "@tanstack/react-query";
import { MinusIcon } from "lucide-react";
import * as m from "@/paraglide/messages.js";

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
import type { LocationEntityId, PlantEntityId } from "@backend/core/domain/gardening/entities";
import { GardeningActionType } from "@backend/core/domain/gardening/enums";
import type { GardeningAction, ItemPresentationValueObject } from "@backend/core/domain/gardening/value-objects";
import { useAppForm } from "@/hooks/form";
import { queryKeys } from "@/store/keys";
import {
	useGardeningEventCreateMutation,
	useGardeningEventCreateForLocationMutation,
	useGardeningEventCreateForPlantListMutation,
} from "@/store/mutations";

type GardeningEventCreateTargetLocationInitialValues = {
	target: "location";
	locationId: LocationEntityId | null;
	actionType?: GardeningAction["type"];
	content?: string;
};

type GardeningEventCreateTargetPlantInitialValues = {
	target: "plants";
	plantIds: PlantEntityId[];
	actionType?: GardeningAction["type"];
	content?: string;
};

type GardeningEventCreateUnboundInitialValues = {
	target: "none";
	actionType?: GardeningAction["type"];
	content?: string;
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
	target: "none" | "location" | "plants";
	locationId: string;
	plantIds: string[];
	targetLocked: boolean;
};

type PlantOption = {
	value: string;
	label: string;
	presentation?: ItemPresentationValueObject;
};

type ActionTypeOption = {
	value: GardeningAction["type"];
	label: string;
};

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
				label: m[`gardeningActions.${type}` as keyof typeof m](),
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
				presentation: plant.cultivar.presentation,
			})),
		[plantData?.items, t],
	);

	const form = useAppForm({
		defaultValues: {
			actionType: "note",
			content: "",
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

			if (value.target === "none") {
				await createMut.mutateAsync({ action });
			} else if (value.target === "location") {
				const locationId = typeof value.locationId === "string" ? value.locationId.trim() : "";
				if (!locationId) return;
				await locationMut.mutateAsync({
					locationId: locationId as LocationEntityId,
					action,
				});
			} else {
				const plantIds = (Array.isArray(value.plantIds) ? value.plantIds : []).filter(
					(id): id is string => typeof id === "string" && id.trim().length > 0,
				);
				if (plantIds.length === 0) return;
				await plantsMut.mutateAsync({
					plantIds: plantIds as PlantEntityId[],
					action,
				});
			}

			onOpenChange(false);
		},
	});

	useEffect(() => {
		if (!open) return;
		const actionType = initialValues?.actionType ?? "note";
		const content = initialValues?.content ?? "";
		if (!initialValues) {
			form.reset({
				actionType,
				content,
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
					<DialogTitle>{m["collections.gardeningEvent.create"]()}</DialogTitle>
					<DialogDescription className="sr-only">
						{m["collections.gardeningEvent.create"]()}
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
															? m["fields.selectRequired"]()
															: undefined,
												}}
											>
												{(field) => (
													<field.Select
														label={m["common.linkedTo"]()}
														placeholder={m["fields.selectPlaceholder"]()}
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
																label: m["collections.location.title"](),
															},
															{
																value: "plants",
																label: m["collections.plant.titlePlural"](),
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
															? m["fields.selectRequired"]()
															: undefined,
												}}
											>
												{(field) => (
													<field.CatalogCombobox
														label={m["collections.location.title"]()}
														placeholder={m["fields.selectPlaceholder"]()}
														emptyLabel={m["filtering.comboboxEmpty"]()}
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
															? m["fields.required"]()
															: undefined,
												}}
											>
												{(field) => (
													<div className="grid gap-1">
														<p className="text-xs font-medium">
															{m["collections.plant.titlePlural"]()}
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
																				>
																					{value.presentation ? (
																						<ItemPresentationIcon
																							presentation={
																								value.presentation
																							}
																							className="size-4"
																						/>
																					) : null}
																					<span className="max-w-32 truncate">
																						{value.label}
																					</span>
																				</ComboboxChip>
																			))}
																			<ComboboxChipsInput
																				placeholder={m[
																					"fields.selectPlaceholder"
																				]()}
																				disabled={isPlantsLocked}
																			/>
																		</>
																	)}
																</ComboboxValue>
															</ComboboxChips>
															<ComboboxContent className="z-100" anchor={plantsAnchor}>
																<ComboboxEmpty>
																	{m["filtering.comboboxEmpty"]()}
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
															<p className="text-destructive text-xs font-medium">
																{String(field.state.meta.errors[0])}
															</p>
														) : null}
													</div>
												)}
											</form.AppField>
										) : null}
										{target === "none" ? (
											<p className="text-muted-foreground text-xs">
												{m["collections.gardeningEvent.createUnboundHint"]()}
											</p>
										) : null}
									</>
								);
							}}
						</form.Subscribe>
						<form.AppField
							name="actionType"
							validators={{
								onSubmit: ({ value }) =>
									typeof value !== "string" || !value.trim()
										? m["fields.selectRequired"]()
										: undefined,
							}}
						>
							{(field) => (
								<div className="grid gap-1">
									<p className="text-xs font-medium">{m["components.detail.field.actionType"]()}</p>
									<Combobox
										items={actionTypeValues}
										value={selectedAction}
										onValueChange={(item) => field.handleChange(item?.value ?? "")}
										itemToStringLabel={(o) => o.label}
										itemToStringValue={(o) => o.value}
										isItemEqualToValue={(a, b) => a.value === b.value}
									>
										<ComboboxInput
											placeholder={m["fields.selectPlaceholder"]()}
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
											<ComboboxEmpty>{m["filtering.comboboxEmpty"]()}</ComboboxEmpty>
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
										<p className="text-destructive text-xs font-medium">
											{String(field.state.meta.errors[0])}
										</p>
									) : null}
								</div>
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
