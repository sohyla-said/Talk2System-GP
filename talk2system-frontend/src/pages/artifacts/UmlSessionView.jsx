import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { getArtifact } from "../../api/umlAPI";

const BASE_URL = "http://localhost:8000";

export default function UmlSessionViewPage() {
  const navigate = useNavigate();
  const { projectId, sessionId } = useParams();

  const [diagramType, setDiagramType] = useState("usecase");
  const [diagramUrl, setDiagramUrl] = useState(null);
  const [artifactId, setArtifactId] = useState(null);
  const [versions, setVersions] = useState([]);
  const [approved, setApproved] = useState(false);
  const [loading, setLoading] = useState(false);

  // ===============================
  // FETCH SESSION VERSIONS
  // ===============================
  const fetchVersions = async () => {
    try {
      setLoading(true);
      const res = await fetch(
        `${BASE_URL}/api/projects/${projectId}/sessions/${sessionId}/artifacts/${diagramType}/versions`
      );
      const data = await res.json();
      const fetchedVersions = data.versions || [];
      setVersions(fetchedVersions);

      if (fetchedVersions.length > 0) {
        const latest = fetchedVersions[0];
        setDiagramUrl(`${BASE_URL}/${latest.file_path}`);
        setArtifactId(latest.id);
        setApproved(latest.approval_status === "approved");
      } else {
        setDiagramUrl(null);
        setArtifactId(null);
        setApproved(false);
      }
    } catch (err) {
      console.error("Failed to fetch session UML versions:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVersions();
  }, [diagramType, projectId, sessionId]);

  // ===============================
  // SELECT VERSION
  // ===============================
  const handleSelectVersion = async (selectedId) => {
    try {
      const res = await getArtifact(selectedId);
      setDiagramUrl(`${BASE_URL}/${res.data.file_path}`);
      setArtifactId(res.data.id);
      setApproved(res.data.approval_status === "approved");
    } catch (err) {
      console.error(err);
    }
  };

  // ===============================
  // EXPORT
  // ===============================
  const handleExport = () => {
    if (!artifactId) return;
    window.open(`${BASE_URL}/api/artifacts/${artifactId}/download`);
  };

  return (
    <div className="font-display bg-background-light dark:bg-background-dark min-h-screen text-[#100d1c] dark:text-white">
      <main className="max-w-5xl mx-auto pt-8 px-4">

        {/* Breadcrumb */}
        <div className="flex flex-wrap gap-2 text-sm mb-6">
          <button onClick={() => navigate("/projects")} className="text-primary-accent dark:text-secondary-accent font-medium">
            Projects
          </button>
          <span>/</span>
          <button onClick={() => navigate(`/projects/${projectId}`)} className="text-primary-accent dark:text-secondary-accent font-medium">
            Project
          </button>
          <span>/</span>
          <button onClick={() => navigate(`/projects/${projectId}/sessions/${sessionId}/artifacts`)} className="text-primary-accent dark:text-secondary-accent font-medium">
            Session #{sessionId} Artifacts
          </button>
          <span>/</span>
          <span>UML Diagrams</span>
        </div>

        {/* Title */}
        <div className="mb-6">
          <h1 className="text-4xl font-black">UML Diagrams</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Session #{sessionId} — view only
          </p>
        </div>

        {/* Diagram Type Tabs + Controls */}
        <div className="bg-white dark:bg-background-dark rounded-xl shadow mb-4">

          <div className="flex gap-2 p-2 bg-[#e9e7f4] dark:bg-background-dark rounded-lg">
            {["usecase", "class", "sequence"].map((type) => (
              <label
                key={type}
                className={`flex-1 cursor-pointer text-center px-3 py-2 rounded-lg text-sm font-medium
                  ${diagramType === type ? "bg-primary text-white shadow" : "text-[#57499c] dark:text-white/60"}`}
              >
                <input
                  type="radio"
                  className="hidden"
                  checked={diagramType === type}
                  onChange={() => setDiagramType(type)}
                />
                {type}
              </label>
            ))}
          </div>

          <div className="flex justify-between items-center gap-3 px-4 py-3 border-t">
            {/* Version dropdown */}
            <select
              onChange={(e) => handleSelectVersion(e.target.value)}
              className="border px-8 py-2 rounded-lg"
              value={artifactId || ""}
            >
              <option value="" disabled>Select Version</option>
              {versions.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.version} — {v.approval_status}
                </option>
              ))}
            </select>

            {/* Export */}
            <button
              onClick={handleExport}
              disabled={!artifactId}
              className="h-10 px-4 rounded-lg flex items-center gap-2 bg-gray-200 dark:bg-gray-700 disabled:opacity-50"
            >
              <span className="material-symbols-outlined">download</span>
              Export
            </button>
          </div>
        </div>

        {/* Approval badge */}
        {artifactId && (
          <div className="mb-3 flex items-center gap-2">
            <span className={`text-xs font-semibold px-3 py-1 rounded-full ${approved ? "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300" : "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300"}`}>
              {approved ? "✓ Approved" : "Pending Approval"}
            </span>
          </div>
        )}

        {/* Image */}
        <div className="bg-white dark:bg-[#1f1c2e] rounded-xl border p-6 flex justify-center min-h-[300px] items-center">
          {loading ? (
            <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          ) : diagramUrl ? (
            <img src={diagramUrl} alt="UML Diagram" className="max-w-full h-auto rounded-lg" />
          ) : (
            <p className="text-gray-400">No diagram generated for this session yet</p>
          )}
        </div>

      </main>
    </div>
  );
}