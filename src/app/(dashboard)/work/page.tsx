import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function WorkPage() {
  return (
    <div className="container mx-auto p-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">💼 Work Kanban</CardTitle>
          <CardDescription>
            Tablica zadań zawodowych
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="text-6xl mb-4">🚧</div>
            <h2 className="text-xl font-semibold mb-2">Work in progress</h2>
            <p className="text-muted-foreground">
              Work Kanban (coming soon)
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
