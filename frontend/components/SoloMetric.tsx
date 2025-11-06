"use client";

import { TrendingDown, TrendingUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
	Card,
	CardAction,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { MetricAggregation, MetricAggregationLabel } from "@/src/types/metric";

type SoloMetricProps = {
	title: string;
	value: number;
	aggregation: MetricAggregation;
	unit: string | null;
};

export function SoloMetric({
	title,
	value,
	aggregation,
	unit,
}: SoloMetricProps) {
	// Helper to round to max 2 decimal places (not fixed)
	const roundToMax2 = (num: number): number => {
		if (num === 0) return 0;
		const magnitude = Math.floor(Math.log10(Math.abs(num)));
		const decimals = Math.max(0, 2 - magnitude - 1);
		return Number(num.toFixed(decimals));
	};

	// Format value based on aggregation and unit
	let formattedValue: string;
	let displayUnit = "";

	// Handle rate aggregations
	if (aggregation.startsWith("rate")) {
		const rounded = roundToMax2(value);
		formattedValue = rounded.toLocaleString();

		if (aggregation === "ratePerSecond") {
			displayUnit = `${unit || "events"}/s`;
		} else if (aggregation === "ratePerMinute") {
			displayUnit = `${unit || "events"}/min`;
		} else if (aggregation === "ratePerHour") {
			displayUnit = `${unit || "events"}/h`;
		} else if (aggregation === "ratePerDay") {
			displayUnit = `${unit || "events"}/day`;
		}
	}
	// Handle percentage (expecting 0-1 range)
	else if (unit === "percent" || unit === "%") {
		const percentage = value * 100;
		const rounded = roundToMax2(percentage);
		formattedValue = rounded.toLocaleString();
		displayUnit = "%";
	}
	// Handle bytes
	else if (unit === "bytes") {
		const gb = value / 1024 / 1024 / 1024;
		const rounded = roundToMax2(gb);
		formattedValue = rounded.toLocaleString();
		displayUnit = "GB";
	}
	// Handle seconds
	else if (unit === "seconds" || unit === "s") {
		const rounded = roundToMax2(value);
		formattedValue = rounded.toLocaleString();
		displayUnit = "s";
	}
	// Handle count and other units
	else {
		const rounded = roundToMax2(value);
		formattedValue = rounded.toLocaleString();
		if (unit && unit !== "count") {
			displayUnit = unit;
		}
	}

	return (
		<Card className="@container/card">
			<CardHeader>
				<CardDescription>
					{title} - {MetricAggregationLabel[aggregation]}
				</CardDescription>
				<CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
					{displayUnit ? (
						<>
							{formattedValue}{" "}
							<span className="text-lg text-muted-foreground font-normal">
								{displayUnit}
							</span>
						</>
					) : (
						formattedValue
					)}
				</CardTitle>
			</CardHeader>
		</Card>
	);
}
