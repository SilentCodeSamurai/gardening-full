import { createFormHook } from "@tanstack/react-form";

import {
	CatalogCombobox,
	ColorPicker,
	IconPicker,
	Select,
	Slider,
	SubscribeButton,
	Switch,
	TextArea,
	TextField,
} from "@/components/form";
import { fieldContext, formContext } from "@/hooks/form-context";

export const { useAppForm, withForm } = createFormHook({
	fieldComponents: {
		TextField,
		Select,
		CatalogCombobox,
		IconPicker,
		ColorPicker,
		TextArea,
		Slider,
		Switch,
	},
	formComponents: {
		SubscribeButton,
	},
	fieldContext,
	formContext,
});
