import { Link } from "react-router-dom";

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-6 bg-background-light dark:bg-background-dark">
      <h1 className="text-4xl font-black text-[#100d1c] dark:text-white">
        Talk2System
      </h1>

      <div className="flex gap-4">
        <Link
          to="/srs"
          className="px-6 py-3 bg-primary text-white rounded-lg font-bold"
        >
          Open SRS Document
        </Link>

        <Link
          to="/uml"
          className="px-6 py-3 bg-primary text-white rounded-lg font-bold"
        >
          Open UML Diagrams
        </Link>

        <Link
          to="/transcript"
          className="px-6 py-3 bg-primary text-white rounded-lg font-bold"
        >
          Open Transcript
        </Link>
        <Link
          to="/project-details"
          className="px-6 py-3 bg-primary text-white rounded-lg font-bold"
        >
          Open Project Details
        </Link>
      </div>
    </div>
  );
}
