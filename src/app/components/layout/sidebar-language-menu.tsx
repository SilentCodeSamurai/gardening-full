import { ChevronDownIcon, LanguagesIcon } from "lucide-react";
import * as m from "@/paraglide/messages.js";
import { getLocale } from "@/paraglide/runtime";

import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuLabel,
	DropdownMenuRadioGroup,
	DropdownMenuRadioItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function SidebarLanguageMenu() {
	const current = getLocale().startsWith("de") ? "de" : getLocale().startsWith("ru") ? "ru" : "en";

	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<Button
					type="button"
					variant="outline"
					size="sm"
					className="w-full justify-between gap-2 font-normal"
					aria-label={m["components.layout.lang.menuTriggerAria"]()}
				>
					<span className="flex items-center gap-2">
						<LanguagesIcon className="size-3.5 shrink-0 opacity-70" />
						{current === "de"
							? m["components.layout.lang.de"]()
							: current === "ru"
								? m["components.layout.lang.ru"]()
								: m["components.layout.lang.en"]()}
					</span>
					<ChevronDownIcon className="size-3.5 shrink-0 opacity-50" />
				</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent className="z-100 w-(--radix-dropdown-menu-trigger-width)" align="start">
				<DropdownMenuLabel>{m["components.layout.lang.groupAria"]()}</DropdownMenuLabel>
				<DropdownMenuSeparator />
				<DropdownMenuRadioGroup value={current} onValueChange={(code) => void i18n.changeLanguage(code)}>
					<DropdownMenuRadioItem value="en">{m["components.layout.lang.en"]()}</DropdownMenuRadioItem>
					<DropdownMenuRadioItem value="de">{m["components.layout.lang.de"]()}</DropdownMenuRadioItem>
					<DropdownMenuRadioItem value="ru">{m["components.layout.lang.ru"]()}</DropdownMenuRadioItem>
				</DropdownMenuRadioGroup>
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
