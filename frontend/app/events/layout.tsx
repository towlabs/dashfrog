export default function EventsLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	return <div className="min-h-screen bg-background">{children}</div>;
}
