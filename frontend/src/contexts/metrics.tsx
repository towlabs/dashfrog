import type React from "react";
import {
	createContext,
	useCallback,
	useContext,
	useEffect,
	useState,
} from "react";
import { Metrics, processMetrics } from "@/src/services/api/metrics";
import type { MetricsStore } from "@/src/types/metric";

interface MetricsContextType {
	metrics: MetricsStore;
	loading: boolean;
	error: string | null;
	refreshMetrics: () => Promise<void>;
	getMetricDisplayName: (metricId: number | string) => string | null;
}

const MetricsContext = createContext<MetricsContextType | undefined>(undefined);

export function MetricsProvider({ children }: { children: React.ReactNode }) {
	const [metrics, setMetrics] = useState<MetricsStore>({});
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	const fetchMetrics = useCallback(async () => {
		try {
			setLoading(true);
			setError(null);
			const response = await Metrics.getAll();
			const processedMetrics = processMetrics(response.data);
			setMetrics(processedMetrics);
		} catch (err) {
			console.error("Failed to fetch metrics:", err);
			setError("Failed to load metrics");
			setMetrics({});
		} finally {
			setLoading(false);
		}
	}, []);

	// Load metrics on mount
	useEffect(() => {
		void fetchMetrics();
	}, [fetchMetrics]);

	/**
	 * Helper function to get the display name for a metric ID
	 * Returns null if metric not found or ID is invalid
	 */
	const getMetricDisplayName = (metricId: number | string): string | null => {
		// Try to parse as number if string
		const id = typeof metricId === "string" ? parseInt(metricId, 10) : metricId;

		// Return null if not a valid number
		if (Number.isNaN(id)) {
			return null;
		}

		// Return display_as if metric exists, otherwise null
		return metrics[id]?.displayAs || null;
	};

	const value: MetricsContextType = {
		metrics,
		loading,
		error,
		refreshMetrics: fetchMetrics,
		getMetricDisplayName,
	};

	return (
		<MetricsContext.Provider value={value}>{children}</MetricsContext.Provider>
	);
}

export function useMetrics() {
	const context = useContext(MetricsContext);
	if (context === undefined) {
		throw new Error("useMetrics must be used within a MetricsProvider");
	}
	return context;
}
