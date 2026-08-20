import { dataAdapter } from "@/lib/sheets/adapter";
import { AdminQueriesInbox } from "@/components/AdminQueriesInbox";
import { MessageSquare } from "lucide-react";

export const revalidate = 0;

export default async function AdminQueriesPage() {
  const [queries, projects] = await Promise.all([
    dataAdapter.getQueries(),
    dataAdapter.getProjects({ publishedOnly: false }),
  ]);

  const projectMap = new Map(projects.map((p) => [p.id, p]));
  const enriched = queries.map((q) => ({
    ...q,
    related_project: q.related_project_id ? projectMap.get(q.related_project_id) || null : null,
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600/20 text-blue-400">
          <MessageSquare className="h-4 w-4" />
        </div>
        <div>
          <h1 className="font-display text-2xl font-extrabold text-white tracking-tight">
            Queries & Edit Requests Inbox
          </h1>
          <p className="text-xs text-slate-400">
            Student correction requests with automatically linked project cards.
          </p>
        </div>
      </div>

      <AdminQueriesInbox initialQueries={enriched} />
    </div>
  );
}
