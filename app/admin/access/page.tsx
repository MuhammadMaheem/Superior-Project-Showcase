import { getTeacherAccounts } from "@/lib/auth/accounts";
import { dataAdapter } from "@/lib/sheets/adapter";
import { TeacherAccountsManager } from "@/components/TeacherAccountsManager";
import { getAdminSessionFromCookies } from "@/lib/auth/session";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function AdminAccessPage() {
  const session = await getAdminSessionFromCookies();
  if (!session || session.role !== "SUPER_ADMIN") {
    redirect("/admin/projects");
  }

  const rawAccounts = await getTeacherAccounts();
  const accounts = rawAccounts.map(({ password_hash, ...rest }) => rest);
  const teachersList = await dataAdapter.getTeachers();

  return <TeacherAccountsManager initialAccounts={accounts} teachersList={teachersList} />;
}
