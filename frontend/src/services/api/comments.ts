import { fetchWithAuth } from "@/src/lib/fetch-wrapper";
import type { Comment } from "@/src/types/comment";

// API response type (snake_case from backend)
interface CommentApiResponse {
	id: number;
	emoji: string;
	title: string;
	start: string;
	end: string;
}

// Conversion function
function toComment(apiComment: CommentApiResponse): Comment {
	return {
		id: apiComment.id,
		emoji: apiComment.emoji,
		title: apiComment.title,
		start: new Date(apiComment.start),
		end: new Date(apiComment.end),
	};
}

export const Comments = {
	/**
	 * Get comments for a specific notebook
	 */
	list: async (_notebookId: string): Promise<Comment[]> => {
		// TODO: Replace with actual API call when backend is ready
		// Dummy data for testing
		await new Promise((resolve) => setTimeout(resolve, 500)); // Simulate API delay

		const dummyData: CommentApiResponse[] = [
			{
				id: 1,
				emoji: "🎉",
				title: "Product Launch",
				start: new Date("2024-01-15T14:00:00").toISOString(),
				end: new Date("2024-01-15T16:00:00").toISOString(),
			},
			{
				id: 2,
				emoji: "🚀",
				title: "Feature Release - V2.0",
				start: new Date("2024-01-20T09:00:00").toISOString(),
				end: new Date("2024-01-20T17:00:00").toISOString(),
			},
			{
				id: 3,
				emoji: "🔧",
				title: "Maintenance Window",
				start: new Date("2024-01-22T02:00:00").toISOString(),
				end: new Date("2024-01-22T04:00:00").toISOString(),
			},
			{
				id: 4,
				emoji: "📊",
				title: "Q1 Planning Session",
				start: new Date("2024-01-25T13:00:00").toISOString(),
				end: new Date("2024-01-25T15:30:00").toISOString(),
			},
			{
				id: 5,
				emoji: "⚠️",
				title: "Incident - API Outage",
				start: new Date("2024-01-28T10:15:00").toISOString(),
				end: new Date("2024-01-28T11:45:00").toISOString(),
			},
		];

		return dummyData.map(toComment);

		// Uncomment when backend is ready:
		// const response = await fetchWithAuth(`/api/comments/${notebookId}`, {
		// 	method: "GET",
		// 	headers: {
		// 		"Content-Type": "application/json",
		// 	},
		// });
		// const data = (await response.json()) as CommentApiResponse[];
		// return data.map(toComment);
	},
};
