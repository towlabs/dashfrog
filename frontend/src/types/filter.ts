export type FilterOperator =
	| "equals"
	| "not_equals"
	| "contains"
	| "not_contains";

export type Filter = {
	label: string;
	operator: FilterOperator;
	value: string;
};

export interface ApiFilter {
	key: string;
	operator: FilterOperator;
	value: string;
	is_label: boolean;
}
