import React from "react";

interface Props {
	children: React.ReactNode;
}

interface State {
	hasError: boolean;
	error?: Error;
}

export class EditorErrorBoundary extends React.Component<Props, State> {
	constructor(props: Props) {
		super(props);
		this.state = { hasError: false };
	}

	static getDerivedStateFromError(error: Error): State {
		// Check if it's a TipTap/BlockNote internal error that's safe to ignore
		const errorMsg = error.message || "";
		const isTipTapError =
			errorMsg.includes("[tiptap error]") ||
			errorMsg.includes("Cannot find node position") ||
			errorMsg.includes("view['dom']") ||
			errorMsg.includes("editor view is not available");

		if (isTipTapError) {
			// These are cleanup/unmount errors that happen in dev mode
			// They don't affect functionality, just log and continue
			if (process.env.NODE_ENV === "development") {
				console.warn(
					"⚠️ TipTap cleanup error (dev mode only, safe to ignore):",
					error.message,
				);
			}
			// Don't show error UI for these
			return { hasError: false };
		}

		// Real errors - show error UI
		console.error("❌ Editor error:", error);
		return { hasError: true, error };
	}

	componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
		const isTipTapError =
			error.message?.includes("[tiptap error]") ||
			error.message?.includes("Cannot find node position") ||
			error.message?.includes("view['dom']");

		if (!isTipTapError) {
			console.error("Editor error:", error, errorInfo);
		}
	}

	render() {
		if (this.state.hasError) {
			return (
				<div className="p-8 text-center">
					<h2 className="text-xl font-semibold mb-2">Editor Error</h2>
					<p className="text-muted-foreground mb-4">
						Something went wrong with the editor.
					</p>
					<button
						type="button"
						onClick={() => this.setState({ hasError: false })}
						className="px-4 py-2 bg-primary text-primary-foreground rounded-md"
					>
						Try Again
					</button>
				</div>
			);
		}

		return this.props.children;
	}
}
