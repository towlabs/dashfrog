interface SimplePaginationProps {
	currentPage: number;
	totalPages: number;
	onPreviousPage: () => void;
	onNextPage: () => void;
}

export function SimplePagination({
	currentPage,
	totalPages,
	onPreviousPage,
	onNextPage,
}: SimplePaginationProps) {
	if (totalPages <= 1) return null;

	return (
		<div className="flex items-center justify-start mt-2">
			<div className="flex items-center gap-2 text-xs text-muted-foreground">
				<button
					type="button"
					onClick={onPreviousPage}
					disabled={currentPage === 1}
					className="px-2 py-1 rounded hover:bg-accent disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
				>
					Previous
				</button>
				<span className="px-2">
					Page {currentPage} of {totalPages}
				</span>
				<button
					type="button"
					onClick={onNextPage}
					disabled={currentPage === totalPages}
					className="px-2 py-1 rounded hover:bg-accent disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
				>
					Next
				</button>
			</div>
		</div>
	);
}
