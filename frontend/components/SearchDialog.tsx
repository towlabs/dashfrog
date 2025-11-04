import { Building2 } from "lucide-react";
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
	CommandDialog,
	CommandEmpty,
	CommandGroup,
	CommandInput,
	CommandItem,
	CommandList,
} from "@/components/ui/command";
import { useLabelsStore } from "@/src/stores/labels";

interface SearchDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
}

export default function SearchDialog({
	open,
	onOpenChange,
}: SearchDialogProps) {
	const navigate = useNavigate();
	const tenants = useLabelsStore((state) => state.tenants);

	useEffect(() => {
		const down = (e: KeyboardEvent) => {
			if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
				e.preventDefault();
				onOpenChange(!open);
			}
		};

		document.addEventListener("keydown", down);
		return () => document.removeEventListener("keydown", down);
	}, [open, onOpenChange]);

	const handleSelectTenant = (tenantName: string) => {
		onOpenChange(false);
		navigate(`/tenants/${encodeURIComponent(tenantName)}`);
	};

	return (
		<CommandDialog open={open} onOpenChange={onOpenChange}>
			<CommandInput placeholder="Search for tenants..." />
			<CommandList>
				<CommandEmpty>No tenants found.</CommandEmpty>
				<CommandGroup heading="Tenants">
					{tenants.map((tenantName) => (
						<CommandItem
							key={tenantName}
							onSelect={() => handleSelectTenant(tenantName)}
							className="flex items-center gap-3"
						>
							<Building2 className="h-4 w-4" />
							<span>{tenantName}</span>
						</CommandItem>
					))}
				</CommandGroup>
			</CommandList>
		</CommandDialog>
	);
}
