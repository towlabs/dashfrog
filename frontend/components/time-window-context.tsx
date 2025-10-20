import { createContext, useContext } from "react";

export interface TimeWindow {
	start: Date;
	end: Date;
	label?: string;
}

const TimeWindowContext = createContext<TimeWindow | undefined>(undefined);

export function TimeWindowProvider({
	children,
	timeWindow,
}: {
	children: React.ReactNode;
	timeWindow: TimeWindow;
}) {
	return (
		<TimeWindowContext.Provider value={timeWindow}>
			{children}
		</TimeWindowContext.Provider>
	);
}

export function useTimeWindow() {
	const context = useContext(TimeWindowContext);
	if (!context) {
		throw new Error("useTimeWindow must be used within a TimeWindowProvider");
	}
	return context;
}
