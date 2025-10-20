"use client";

import { useState } from "react";
import { MetricQueryBuilder } from "@/components/metric-query-builder";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";

export default function HomePage() {
	const [query, setQuery] = useState("");

	return (
		<div className="p-6">
			<div className="max-w-4xl mx-auto space-y-8">
				<div>
					<h1 className="text-3xl font-bold mb-4">Welcome to DashFrog</h1>
					<p className="text-muted-foreground mb-8">
						Select a teamspace from the sidebar to view your dashboards and
						notebooks.
					</p>
				</div>

				<Card>
					<CardHeader>
						<CardTitle>Metric Query Builder</CardTitle>
						<CardDescription>
							Build metric queries by selecting a metric, adding filters, and
							choosing a transform
						</CardDescription>
					</CardHeader>
					<CardContent className="space-y-4">
						<MetricQueryBuilder value={query} onChange={setQuery} />

						{query && (
							<div className="pt-4 border-t">
								<div className="text-sm font-medium mb-2">Generated Query:</div>
								<code className="block p-3 rounded-md bg-muted text-sm">
									{query}
								</code>
							</div>
						)}
					</CardContent>
				</Card>

				<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
					<div className="p-6 border rounded-lg">
						<h3 className="text-lg font-semibold mb-2">Getting Started</h3>
						<p className="text-sm text-muted-foreground">
							Explore your teamspaces to access performance dashboards and
							observability tools.
						</p>
					</div>

					<div className="p-6 border rounded-lg">
						<h3 className="text-lg font-semibold mb-2">Create Notebooks</h3>
						<p className="text-sm text-muted-foreground">
							Click on any teamspace item to create and edit notebooks for your
							analysis.
						</p>
					</div>

					<div className="p-6 border rounded-lg">
						<h3 className="text-lg font-semibold mb-2">Collaborate</h3>
						<p className="text-sm text-muted-foreground">
							Share your findings and collaborate with your team using our
							integrated tools.
						</p>
					</div>
				</div>
			</div>
		</div>
	);
}
