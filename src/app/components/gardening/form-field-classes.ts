import { cn } from "@/lib/utils";

/** Shared `<select>` styling for gardening create dialogs */
export const formSelectClassName = cn(
	"h-7 w-full min-w-0 rounded-md border border-input bg-input/20 px-2 py-0.5 text-sm md:text-xs/relaxed",
	"outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30 dark:bg-input/30",
);
