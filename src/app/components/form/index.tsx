import { useStore } from "@tanstack/react-form";
import type { ReactNode } from "react";
import { HexAlphaColorPicker } from "react-colorful";

import { Button } from "@/components/ui/button";
import {
	Combobox,
	ComboboxContent,
	ComboboxEmpty,
	ComboboxInput,
	ComboboxItem,
	ComboboxList,
} from "@/components/ui/combobox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import * as ShadcnSelect from "@/components/ui/select";
import { Slider as ShadcnSlider } from "@/components/ui/slider";
import { Switch as ShadcnSwitch } from "@/components/ui/switch";
import { Textarea as ShadcnTextarea } from "@/components/ui/textarea";
import { SELECT_NONE } from "@/components/form/select-sentinel";
import { ItemPresentationIcon } from "@/components/icon/item-presentation-icon";
import { useFieldContext, useFormContext } from "@/hooks/form-context";
import { ITEM_PRESENTATION_ICON_KEYS, type ItemPresentationIconKey } from "@/lib/item-presentation";
import { cn } from "@/lib/utils";
import type { ItemPresentationValueObject } from "@backend/core/domain/gardening/value-objects";

export function SubscribeButton({ label }: { label: string }) {
	const form = useFormContext();
	return (
		<form.Subscribe selector={(state) => state.isSubmitting}>
			{(isSubmitting) => (
				<Button id={`${form.formId}-submit-button`} type="submit" disabled={isSubmitting}>
					{label}
				</Button>
			)}
		</form.Subscribe>
	);
}

function ErrorMessages({ errors }: { errors: (string | { message: string })[] }) {
	if (errors.length === 0) return null;
	return (
		<ul className="mt-1 space-y-0.5" role="alert">
			{errors.map((error) => (
				<li
					key={typeof error === "string" ? error : error.message}
					className="text-destructive text-xs font-medium"
				>
					{typeof error === "string" ? error : error.message}
				</li>
			))}
		</ul>
	);
}

export function TextField({
	label,
	placeholder,
	className,
}: {
	label: string;
	placeholder?: string;
	className?: string;
}) {
	const field = useFieldContext<string>();
	const errors = useStore(field.store, (state) => state.meta.errors);
	const inputId = `${field.form.formId}-${String(field.name)}-input`;

	return (
		<div className={cn("grid gap-1", className)}>
			<Label htmlFor={inputId} className="text-xs font-medium">
				{label}
			</Label>
			<Input
				id={inputId}
				value={field.state.value}
				placeholder={placeholder}
				onBlur={field.handleBlur}
				onChange={(e) => field.handleChange(e.target.value)}
				aria-invalid={errors.length > 0}
			/>
			{field.state.meta.isTouched ? <ErrorMessages errors={errors} /> : null}
		</div>
	);
}

export function TextArea({ label, rows = 3, className }: { label: string; rows?: number; className?: string }) {
	const field = useFieldContext<string>();
	const errors = useStore(field.store, (state) => state.meta.errors);
	const areaId = `${field.form.formId}-${String(field.name)}-textarea`;

	return (
		<div className={cn("grid gap-1", className)}>
			<Label htmlFor={areaId} className="text-xs font-medium">
				{label}
			</Label>
			<ShadcnTextarea
				id={areaId}
				value={field.state.value}
				onBlur={field.handleBlur}
				rows={rows}
				onChange={(e) => field.handleChange(e.target.value)}
				aria-invalid={errors.length > 0}
			/>
			{field.state.meta.isTouched ? <ErrorMessages errors={errors} /> : null}
		</div>
	);
}

export function Select({
	label,
	values,
	placeholder,
	className,
}: {
	label: string;
	values: { label: ReactNode; value: string }[];
	placeholder?: string;
	className?: string;
}) {
	const field = useFieldContext<string>();
	const errors = useStore(field.store, (state) => state.meta.errors);
	const triggerId = `${field.form.formId}-${String(field.name)}-select`;

	return (
		<div className={cn("grid gap-1", className)}>
			<Label htmlFor={triggerId} className="text-xs font-medium">
				{label}
			</Label>
			<ShadcnSelect.Select
				name={String(field.name)}
				value={field.state.value === "" || field.state.value === SELECT_NONE ? undefined : field.state.value}
				onValueChange={(value) => field.handleChange(value)}
			>
				<ShadcnSelect.SelectTrigger id={triggerId} className="w-full" aria-invalid={errors.length > 0}>
					<ShadcnSelect.SelectValue placeholder={placeholder} />
				</ShadcnSelect.SelectTrigger>
				<ShadcnSelect.SelectContent className="bg-popover text-popover-foreground">
					<ShadcnSelect.SelectGroup>
						<ShadcnSelect.SelectLabel className="sr-only">{label}</ShadcnSelect.SelectLabel>
						{values.map((opt) => (
							<ShadcnSelect.SelectItem key={opt.value} value={opt.value} className="text-foreground">
								{opt.label}
							</ShadcnSelect.SelectItem>
						))}
					</ShadcnSelect.SelectGroup>
				</ShadcnSelect.SelectContent>
			</ShadcnSelect.Select>
			{field.state.meta.isTouched ? <ErrorMessages errors={errors} /> : null}
		</div>
	);
}

export type CatalogComboboxOption = {
	value: string;
	label: string;
	presentation?: ItemPresentationValueObject;
};

/** Searchable combobox for lists of user-created catalog entities (ids as strings). */
export function CatalogCombobox({
	label,
	placeholder,
	emptyLabel,
	values,
	disabled = false,
	className,
}: {
	label: string;
	placeholder: string;
	emptyLabel: string;
	values: CatalogComboboxOption[];
	disabled?: boolean;
	className?: string;
}) {
	const field = useFieldContext<string>();
	const errors = useStore(field.store, (state) => state.meta.errors);
	const controlId = `${field.form.formId}-${String(field.name)}-catalog-combobox`;

	const selected =
		field.state.value === "" || field.state.value === SELECT_NONE
			? null
			: (values.find((v) => v.value === field.state.value) ?? null);

	return (
		<div className={cn("grid gap-1", className)}>
			<Label htmlFor={controlId} className="text-xs font-medium">
				{label}
			</Label>
			<Combobox
				name={String(field.name)}
				items={values}
				value={selected}
				disabled={disabled}
				onValueChange={(item) => {
					if (disabled) return;
					field.handleChange(item?.value ?? SELECT_NONE);
				}}
				itemToStringLabel={(o) => o.label}
				itemToStringValue={(o) => o.value}
				isItemEqualToValue={(a, b) => a.value === b.value}
			>
				<ComboboxInput
					id={controlId}
					placeholder={placeholder}
					className="min-w-0 flex-1"
					onBlur={field.handleBlur}
					disabled={disabled}
					aria-invalid={errors.length > 0}
					showClear={!disabled}
					startAdornment={
						selected?.presentation ? (
							<ItemPresentationIcon presentation={selected.presentation} className="shrink-0" />
						) : null
					}
				/>
				<ComboboxContent className="z-100">
					<ComboboxEmpty>{emptyLabel}</ComboboxEmpty>
					<ComboboxList>
						{(item) => (
							<ComboboxItem key={item.value} value={item}>
								{item.presentation ? (
									<ItemPresentationIcon presentation={item.presentation} className="shrink-0" />
								) : null}
								<span className="min-w-0 flex-1 truncate">{item.label}</span>
							</ComboboxItem>
						)}
					</ComboboxList>
				</ComboboxContent>
			</Combobox>
			{field.state.meta.isTouched ? <ErrorMessages errors={errors} /> : null}
		</div>
	);
}

export function Slider({ label, className }: { label: string; className?: string }) {
	const field = useFieldContext<number>();
	const errors = useStore(field.store, (state) => state.meta.errors);
	const sliderId = `${field.form.formId}-${String(field.name)}-slider`;

	return (
		<div className={cn("grid gap-1", className)}>
			<Label htmlFor={sliderId} className="text-xs font-medium">
				{label}
			</Label>
			<ShadcnSlider
				id={sliderId}
				onBlur={field.handleBlur}
				value={[field.state.value]}
				onValueChange={(value) => field.handleChange(value[0] ?? 0)}
				min={0}
				max={100}
				step={1}
			/>
			{field.state.meta.isTouched ? <ErrorMessages errors={errors} /> : null}
		</div>
	);
}

export function Switch({ label, className }: { label: string; className?: string }) {
	const field = useFieldContext<boolean>();
	const errors = useStore(field.store, (state) => state.meta.errors);
	const switchId = `${field.form.formId}-${String(field.name)}-switch`;

	return (
		<div className={cn("grid gap-1", className)}>
			<div className="flex items-center gap-2">
				<ShadcnSwitch
					id={switchId}
					onBlur={field.handleBlur}
					checked={field.state.value}
					onCheckedChange={(checked) => field.handleChange(checked)}
				/>
				<Label htmlFor={switchId} className="cursor-pointer text-xs font-medium">
					{label}
				</Label>
			</div>
			{field.state.meta.isTouched ? <ErrorMessages errors={errors} /> : null}
		</div>
	);
}

export function IconPicker({
	label,
	noneLabel,
	iconColor,
	backgroundColor,
	className,
}: {
	label: string;
	noneLabel: string;
	iconColor?: string;
	backgroundColor?: string;
	className?: string;
}) {
	const field = useFieldContext<string>();
	const errors = useStore(field.store, (state) => state.meta.errors);
	const triggerId = `${field.form.formId}-${String(field.name)}-icon-picker`;
	const currentValue = field.state.value.trim();
	const selectedKey =
		!currentValue || currentValue === SELECT_NONE ? undefined : (currentValue as ItemPresentationIconKey);

	const selectedPresentation: ItemPresentationValueObject | undefined = selectedKey
		? {
				iconKey: selectedKey,
				iconColor: iconColor?.trim() || undefined,
				backgroundColor: backgroundColor?.trim() || undefined,
			}
		: undefined;

	return (
		<div className={cn("grid gap-1", className)}>
			<Label htmlFor={triggerId} className="text-xs font-medium">
				{label}
			</Label>
			<DropdownMenu onOpenChange={(open) => !open && field.handleBlur()}>
				<DropdownMenuTrigger asChild>
					<Button
						id={triggerId}
						type="button"
						variant="outline"
						size="icon-item-presentation"
						aria-invalid={errors.length > 0}
					>
						{selectedPresentation ? (
							<ItemPresentationIcon presentation={selectedPresentation} />
						) : (
							<span className="text-muted-foreground text-[0.625rem] leading-none">--</span>
						)}
					</Button>
				</DropdownMenuTrigger>
				<DropdownMenuContent className="w-64 min-w-64">
					<div className="grid gap-2 p-1">
						<Button
							type="button"
							variant={selectedKey ? "outline" : "secondary"}
							size="sm"
							className="justify-start"
							onClick={() => field.handleChange(SELECT_NONE)}
						>
							{noneLabel}
						</Button>
						<div className="grid grid-cols-8 gap-1">
							{ITEM_PRESENTATION_ICON_KEYS.map((iconKey) => (
								<Button
									key={iconKey}
									type="button"
									variant={selectedKey === iconKey ? "secondary" : "ghost"}
									size="icon-item-presentation"
									onClick={() => field.handleChange(iconKey)}
									aria-label={iconKey}
									title={iconKey}
								>
									<ItemPresentationIcon
										presentation={{
											iconKey,
											iconColor: iconColor?.trim() || undefined,
											backgroundColor: backgroundColor?.trim() || undefined,
										}}
									/>
								</Button>
							))}
						</div>
					</div>
				</DropdownMenuContent>
			</DropdownMenu>
			{field.state.meta.isTouched ? <ErrorMessages errors={errors} /> : null}
		</div>
	);
}

export function ColorPicker({
	label,
	placeholder = "#2f855a",
	className,
}: {
	label: string;
	placeholder?: string;
	className?: string;
}) {
	const field = useFieldContext<string>();
	const errors = useStore(field.store, (state) => state.meta.errors);
	const triggerId = `${field.form.formId}-${String(field.name)}-color-picker`;
	const color = field.state.value.trim();

	return (
		<div className={cn("grid gap-1", className)}>
			<Label htmlFor={triggerId} className="text-xs font-medium">
				{label}
			</Label>
			<DropdownMenu onOpenChange={(open) => !open && field.handleBlur()}>
				<DropdownMenuTrigger asChild>
					<Button
						id={triggerId}
						type="button"
						variant="outline"
						size="icon"
						className="relative overflow-hidden"
						aria-invalid={errors.length > 0}
					>
						<span
							className="absolute inset-0"
							style={{ backgroundColor: color || "transparent" }}
							aria-hidden
						/>
						{!color ? (
							<span className="text-muted-foreground z-1 text-[0.625rem] leading-none">--</span>
						) : null}
					</Button>
				</DropdownMenuTrigger>
				<DropdownMenuContent className="w-auto min-w-0">
					<div className="grid gap-2 p-2">
						<HexAlphaColorPicker color={color || "#000000"} onChange={(next) => field.handleChange(next)} />
						<Input
							value={field.state.value}
							placeholder={placeholder}
							onChange={(e) => field.handleChange(e.target.value)}
						/>
						<Button type="button" variant="outline" size="sm" onClick={() => field.handleChange("")}>
							Clear
						</Button>
					</div>
				</DropdownMenuContent>
			</DropdownMenu>
			{field.state.meta.isTouched ? <ErrorMessages errors={errors} /> : null}
		</div>
	);
}
