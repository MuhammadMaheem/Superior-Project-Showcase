import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { PublicShowcaseClient } from "@/components/PublicShowcaseClient";
import { dataAdapter } from "@/lib/sheets/adapter";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const revalidate = 0; // Dynamic data fetch

export default async function HomePage() {
  const [projects, teachers] = await Promise.all([
    dataAdapter.getProjects({ publishedOnly: true }),
    dataAdapter.getTeachers(),
  ]);

  return (
    <div className="flex min-h-screen flex-col bg-[#0a0f1d] text-[#f8fafc]">
      <Navbar />
      <main className="flex-1 mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        <PublicShowcaseClient initialProjects={projects} teachers={teachers} />
      </main>
      <Footer />
    </div>
  );
}
