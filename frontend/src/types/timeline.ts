export interface TimelineEvent {
	name: string;
	emoji: string;
	markdown: string;
	eventDt: Date;
	labels: Record<string, string>;
}
