import type React from "react";
import {
	createContext,
	useCallback,
	useContext,
	useEffect,
	useState,
} from "react";
import { Labels, processLabels } from "@/src/services/api/labels";
import type { LabelsStore } from "@/src/types/label";

interface LabelsContextType {
	labels: LabelsStore;
	loading: boolean;
	error: string | null;
	refreshLabels: () => Promise<void>;
}

const LabelsContext = createContext<LabelsContextType | undefined>(undefined);

export function LabelsProvider({ children }: { children: React.ReactNode }) {
	const [labels, setLabels] = useState<LabelsStore>({});
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	const fetchLabels = useCallback(async () => {
		try {
			setLoading(true);
			setError(null);
			const response = await Labels.getAll();
			const processedLabels = processLabels(response.data);
			setLabels(processedLabels);
		} catch (err) {
			console.error("Failed to fetch labels:", err);
			setError("Failed to load labels");
			setLabels({});
		} finally {
			setLoading(false);
		}
	}, []);

	// Load labels on mount
	useEffect(() => {
		fetchLabels();
	}, [fetchLabels]);

	const value: LabelsContextType = {
		labels,
		loading,
		error,
		refreshLabels: fetchLabels,
	};

	return (
		<LabelsContext.Provider value={value}>{children}</LabelsContext.Provider>
	);
}

export function useLabels() {
	const context = useContext(LabelsContext);
	if (context === undefined) {
		throw new Error("useLabels must be used within a LabelsProvider");
	}
	return context;
}
