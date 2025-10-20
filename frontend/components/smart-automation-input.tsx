"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

interface ParsedToken {
	type: "keyword" | "entity" | "property" | "operator" | "value" | "text";
	value: string;
	start: number;
	end: number;
}

interface SmartAutomationInputProps {
	value: string;
	onChange: (value: string) => void;
	placeholder?: string;
	className?: string;
}

export function SmartAutomationInput({
	value,
	onChange,
	placeholder,
	className,
}: SmartAutomationInputProps) {
	const [tokens, setTokens] = useState<ParsedToken[]>([]);
	const [cursorPosition, setCursorPosition] = useState(0);
	const inputRef = useRef<HTMLInputElement>(null);

	const parseExpression = (expression: string): ParsedToken[] => {
		const tokens: ParsedToken[] = [];
		let current = 0;

		const patterns = [
			{ type: "keyword", regex: /^(ON|WHEN|IF|THEN|AND|OR|NOT)\b/i },
			{ type: "entity", regex: /^<([^>]+)>/i },
			{ type: "property", regex: /^\.([A-Za-z_][A-Za-z0-9_]*)/i },
			{
				type: "operator",
				regex:
					/^(FAILED|SUCCESS|PENDING|STARTED|ENDED|>|<|>=|<=|==|!=|\+|-|\*|\/)/i,
			},
			{ type: "value", regex: /^"([^"]*)"/ },
			{ type: "value", regex: /^'([^']*)'/ },
			{ type: "value", regex: /^(\d+(?:\.\d+)?)\b/ },
			{ type: "text", regex: /^(\s+)/ },
			{ type: "text", regex: /^([^<.\s"'><=!+\-*/]+)/ },
		];

		while (current < expression.length) {
			let matched = false;

			for (const pattern of patterns) {
				const match = expression.slice(current).match(pattern.regex);
				if (match) {
					const fullMatch = match[0];
					const capturedValue = match[1] || fullMatch;

					tokens.push({
						type: pattern.type,
						value: capturedValue,
						start: current,
						end: current + fullMatch.length,
					});

					current += fullMatch.length;
					matched = true;
					break;
				}
			}

			if (!matched) {
				// Skip unknown character
				current++;
			}
		}

		return tokens;
	};

	useEffect(() => {
		const parsed = parseExpression(value);
		setTokens(parsed);
	}, [value]);

	const getTokenColor = (type: string) => {
		switch (type) {
			case "keyword":
				return "text-blue-600 font-semibold";
			case "entity":
				return "text-purple-600 font-medium";
			case "property":
				return "text-green-600";
			case "operator":
				return "text-orange-600 font-medium";
			case "value":
				return "text-red-600";
			default:
				return "text-gray-900";
		}
	};

	const renderTokens = () => {
		return tokens.map((token, index) => {
			if (token.type === "text" && token.value.trim() === "") {
				return <span key={index}>{token.value}</span>;
			}

			if (token.type === "entity") {
				return (
					<span
						key={index}
						className="inline-flex items-center rounded-md bg-purple-100 px-2 py-0.5 text-xs font-medium text-purple-800 dark:bg-purple-900/20 dark:text-purple-400"
					>
						{token.value}
					</span>
				);
			}

			if (token.type === "keyword") {
				return (
					<span
						key={index}
						className="inline-flex items-center rounded-md bg-blue-100 px-2 py-0.5 text-xs font-semibold text-blue-800 dark:bg-blue-900/20 dark:text-blue-400"
					>
						{token.value}
					</span>
				);
			}

			if (token.type === "operator") {
				return (
					<span
						key={index}
						className="inline-flex items-center rounded-md bg-orange-100 px-2 py-0.5 text-xs font-medium text-orange-800 dark:bg-orange-900/20 dark:text-orange-400"
					>
						{token.value}
					</span>
				);
			}

			if (token.type === "property") {
				return (
					<span
						key={index}
						className="inline-flex items-center rounded-md bg-green-100 px-1.5 py-0.5 text-xs font-medium text-green-800 dark:bg-green-900/20 dark:text-green-400"
					>
						{token.value}
					</span>
				);
			}

			if (token.type === "value") {
				return (
					<span
						key={index}
						className="inline-flex items-center rounded-md bg-red-100 px-2 py-0.5 text-xs font-medium text-red-800 dark:bg-red-900/20 dark:text-red-400"
					>
						{token.value}
					</span>
				);
			}

			return (
				<span key={index} className={getTokenColor(token.type)}>
					{token.value}
				</span>
			);
		});
	};

	return (
		<div className={cn("relative", className)}>
			{/* Invisible input for typing */}
			<input
				ref={inputRef}
				type="text"
				value={value}
				onChange={(e) => {
					onChange(e.target.value);
					setCursorPosition(e.target.selectionStart || 0);
				}}
				onSelect={(e) => {
					const target = e.target as HTMLInputElement;
					setCursorPosition(target.selectionStart || 0);
				}}
				placeholder={placeholder}
				className="absolute inset-0 w-full bg-transparent text-transparent caret-black resize-none outline-none z-10 px-3 py-2"
				style={{ caretColor: "black" }}
			/>

			{/* Rendered tokens display */}
			<div className="flex flex-wrap items-center gap-1 px-3 py-2 text-sm bg-background border rounded-md min-h-[2.5rem] pointer-events-none">
				{tokens.length > 0 ? (
					renderTokens()
				) : (
					<span className="text-muted-foreground">{placeholder}</span>
				)}
			</div>
		</div>
	);
}
