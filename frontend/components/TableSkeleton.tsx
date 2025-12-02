import { Skeleton } from "@/components/ui/skeleton";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";

type TableSkeletonProps = {
	columns: number;
	rows?: number;
};

export function TableSkeleton({ columns, rows = 5 }: TableSkeletonProps) {
	return (
		<Table>
			<TableHeader>
				<TableRow>
					{Array.from({ length: columns }).map((_, i) => (
						<TableHead key={i}>
							<Skeleton className="h-4 w-24" />
						</TableHead>
					))}
				</TableRow>
			</TableHeader>
			<TableBody>
				{Array.from({ length: rows }).map((_, rowIndex) => (
					<TableRow key={rowIndex}>
						{Array.from({ length: columns }).map((_, colIndex) => (
							<TableCell key={colIndex}>
								<Skeleton className="h-4 w-full" />
							</TableCell>
						))}
					</TableRow>
				))}
			</TableBody>
		</Table>
	);
}
