import { dataAdapter } from "@/lib/sheets/adapter";
import { AdminTeacherSyncReview } from "@/components/AdminTeacherSyncReview";
import { Users } from "lucide-react";

export const revalidate = 0;

export default async function AdminTeachersPage() {
  const [pending, logs, meta, liveTeachers] = await Promise.all([
    dataAdapter.getTeachersPending(),
    dataAdapter.getSyncLogs(),
    dataAdapter.getSyncMeta(),
    dataAdapter.getTeachers(),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600/20 text-blue-400">
          <Users className="h-4 w-4" />
        </div>
        <div>
          <h1 className="font-display text-2xl font-extrabold text-white tracking-tight">
            Faculty 24h Sync & Staging Review
          </h1>
          <p className="text-xs text-slate-400">
            Inspect automated updates, fix subject spelling errors inline, and approve changes into the live database.
          </p>
        </div>
      </div>

      <AdminTeacherSyncReview
        initialPending={pending}
        initialLogs={logs}
        initialMeta={meta}
        liveTeachers={liveTeachers}
      />
    </div>
  );
}
