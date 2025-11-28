export type BaseComment = {
	emoji: string;
	title: string;
	start: Date;
	end: Date;
};

export type Comment = BaseComment & {
	id: number;
};
