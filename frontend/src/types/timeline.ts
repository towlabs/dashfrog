export interface TimelineEvent {
	id: number;
	name: string;
	emoji: string;
	markdown: string;
	eventDt: Date;
	labels: Record<string, string>;
}
