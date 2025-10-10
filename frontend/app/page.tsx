export default function HomePage() {
  return (
    <div className="p-6">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-4">Welcome to DashFrog</h1>
        <p className="text-muted-foreground mb-8">
          Select a teamspace from the sidebar to view your dashboards and notebooks.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="p-6 border rounded-lg">
            <h3 className="text-lg font-semibold mb-2">Getting Started</h3>
            <p className="text-sm text-muted-foreground">
              Explore your teamspaces to access performance dashboards and observability tools.
            </p>
          </div>

          <div className="p-6 border rounded-lg">
            <h3 className="text-lg font-semibold mb-2">Create Notebooks</h3>
            <p className="text-sm text-muted-foreground">
              Click on any teamspace item to create and edit notebooks for your analysis.
            </p>
          </div>

          <div className="p-6 border rounded-lg">
            <h3 className="text-lg font-semibold mb-2">Collaborate</h3>
            <p className="text-sm text-muted-foreground">
              Share your findings and collaborate with your team using our integrated tools.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}