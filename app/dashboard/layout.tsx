import { AppHeader } from "@/components/app-header";

export const metadata = {
  title: "Dashboard | Smart Project Planner",
  description: "Manage your projects and teams",
};

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <AppHeader />
      <div className="flex-1 flex flex-col max-w-screen-2xl mx-auto w-full px-4 sm:px-6 lg:px-8">
        {children}
      </div>
    </>
  );
} 