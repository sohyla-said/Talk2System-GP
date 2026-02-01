import { Outlet } from "react-router-dom";
import Header from "./Header";
import Footer from "./Footer";

export default function AppLayout() {
  return (
    <div className="relative flex min-h-screen w-full flex-col bg-background-light dark:bg-background-dark font-display text-[#1F2937] dark:text-gray-200">
      
      <Header />

      <main className="flex-grow w-full max-w-screen-2xl mx-auto p-4 sm:p-6 lg:p-6 lg:p-8">
        <Outlet />
      </main>

      <Footer />
    </div>
  );
}
