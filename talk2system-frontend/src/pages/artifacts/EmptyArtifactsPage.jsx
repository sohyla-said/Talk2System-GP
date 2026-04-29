
import { useNavigate } from "react-router-dom";

export default function EmptyArtifacts({ projectId, sessionId, isSession }) {
  const navigate = useNavigate();

  const handleGenerate = () => {
    if (isSession) {
      navigate(`/transcript/${sessionId}/requirements`);
    } else {
      navigate(`/projects/${projectId}/requirements`);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center text-center py-20">
      <span className="material-symbols-outlined text-6xl text-gray-300 mb-4">
        inventory_2
      </span>

      <h2 className="text-2xl font-bold mb-2">
        No artifacts generated yet
      </h2>

      <p className="text-gray-500 max-w-md mb-6">
        You haven’t generated any results yet. Start by generating UML diagrams,
        SRS documents, or summaries from your requirements.
      </p>

      <button
        onClick={handleGenerate}
        className="bg-primary text-white px-6 py-2 rounded-lg font-bold hover:opacity-90"
      >
        Generate Artifacts
      </button>
    </div>
  );
}