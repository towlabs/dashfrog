import { fetchWithAuth } from "@/src/lib/fetch-wrapper";
import type { BaseComment, Comment } from "@/src/types/comment";

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
	list: async (payload: {
		notebook_id?: string;
		start?: Date;
		end?: Date;
	}): Promise<Comment[]> => {
		const response = await fetchWithAuth(`/api/comments/list`, {
			headers: {
				"Content-Type": "application/json",
			},
			method: "POST",
			body: JSON.stringify(payload),
		});
		const data = (await response.json()) as CommentApiResponse[];
		return data.map(toComment);
	},

	delete: async (id: number): Promise<void> => {
		const response = await fetchWithAuth(`/api/comments/${id}`, {
			headers: {
				"Content-Type": "application/json",
			},
			method: "DELETE",
		});
		return response.json();
	},

	create: async (comment: BaseComment): Promise<Comment> => {
		const response = await fetchWithAuth(`/api/comments/`, {
			headers: {
				"Content-Type": "application/json",
			},
			method: "POST",
			body: JSON.stringify(comment),
		});
		return toComment((await response.json()) as CommentApiResponse);
	},

	update: async (comment: Comment) => {
		await fetchWithAuth(`/api/comments/${comment.id}`, {
			headers: {
				"Content-Type": "application/json",
			},
			method: "PUT",
			body: JSON.stringify(comment),
		});
	},
};
