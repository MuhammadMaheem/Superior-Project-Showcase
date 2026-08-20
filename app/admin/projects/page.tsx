import { dataAdapter } from "@/lib/sheets/adapter";
import { AdminProjectsManager } from "@/components/AdminProjectsManager";
import { Layers } from "lucide-react";

export const revalidate = 0;

export default async function AdminProjectsPage() {
  const [projects, teachers] = await Promise.all([
    dataAdapter.getProjects({ publishedOnly: false }),
    dataAdapter.getTeachers(),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600/20 text-blue-400">
          <Layers className="h-4 w-4" />
        </div>
        <div>
          <h1 className="font-display text-2xl font-extrabold text-white tracking-tight">
            Submissions & Project Records
          </h1>
          <p className="text-xs text-slate-400">
            Manage public visibility, edit project metadata, or review direct student submissions.
          </p>
        </div>
      </div>

      <AdminProjectsManager initialProjects={projects} teachers={teachers} />
    </div>
  );
}
