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

type Props = {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	title: string;
	description: string;
	confirmLabel?: string;
	isPending?: boolean;
	onConfirm: () => Promise<void> | void;
};

export function DeleteConfirmDialog({
	open,
	onOpenChange,
	title,
	description,
	confirmLabel,
	isPending = false,
	onConfirm,
}: Props) {
	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-md">
				<DialogHeader>
					<DialogTitle>{title}</DialogTitle>
					<DialogDescription>{description}</DialogDescription>
				</DialogHeader>
				<DialogFooter>
					<Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
						{m["common.cancel"]()}
					</Button>
					<Button type="button" variant="destructive" disabled={isPending} onClick={() => void onConfirm()}>
						{confirmLabel ?? m["common.delete"]()}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
