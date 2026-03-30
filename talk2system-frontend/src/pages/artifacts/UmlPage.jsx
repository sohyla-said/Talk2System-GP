
import { useEffect, useState } from "react";
import UMLApprovalModal from "../../components/modals/UMLApprovalModal";
import { useNavigate, useParams } from "react-router-dom";

import {
  generateUML,
  getVersions,
  getArtifact,
  approveArtifact,
  downloadArtifact,
} from "../../api/umlAPI";

const BASE_URL = "http://localhost:8000";

export default function UmlPage() {
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [approved, setApproved] = useState(false);
  const [diagramType, setDiagramType] = useState("usecase");

  const [diagramUrl, setDiagramUrl] = useState(null);
  const [artifactId, setArtifactId] = useState(null);
  const [versions, setVersions] = useState([]);

  const navigate = useNavigate();
  const { id: projectId } = useParams(); // 🔥 dynamic project id
  const [loading, setLoading] = useState(false);

  // ===============================
  // GENERATE UML
  // ===============================
const handleGenerate = async () => {
  try {
    setLoading(true); // 🔥 START LOADING

    const res = await generateUML(projectId, diagramType);

    const filePath = res.data.file_path;
    const artifact = res.data.artifact;

    setDiagramUrl(`${BASE_URL}/${filePath}`);
    setArtifactId(artifact.id);
    setApproved(false);

    fetchVersions();
  } catch (err) {
    console.error(err);
  } finally {
    setLoading(false); // 🔥 STOP LOADING
  }
};

  // ===============================
  // FETCH VERSIONS
  // ===============================
  const fetchVersions = async () => {
    try {
      const res = await getVersions(projectId, diagramType);
      setVersions(res.data.versions);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchVersions();
  }, [diagramType]);

  // ===============================
  //  SELECT VERSION
  // ===============================
  const handleSelectVersion = async (artifactId) => {
    try {
      const res = await getArtifact(artifactId);

      setDiagramUrl(`${BASE_URL}/${res.data.file_path}`);
      setArtifactId(res.data.id);
      setApproved(res.data.approval_status === "approved");
    } catch (err) {
      console.error(err);
    }
  };

  // ===============================
  // APPROVE
  // ===============================
  const handleApprove = async () => {
    try {
      await approveArtifact(artifactId);
      setApproved(true);
      setShowApprovalModal(false);
      fetchVersions();
    } catch (err) {
      console.error(err);
    }
  };

  // ===============================
  // EXPORT
  // ===============================
  const handleExportClick = async (e) => {
    e.preventDefault();

    if (!approved) {
      setShowApprovalModal(true);
      return;
    }

  if (!artifactId) return;

  // DIRECT DOWNLOAD
  window.open(`http://localhost:8000/api/artifacts/${artifactId}/download`);
};

  return (
    <div className="font-display bg-background-light dark:bg-background-dark min-h-screen text-[#100d1c] dark:text-white">
      
      <main className="max-w-5xl mx-auto pt-8 px-4">

        {/* Breadcrumb */}
        <div className="flex flex-wrap gap-2 text-sm">
          <button 
            onClick={() => navigate("/projects")}
            className="text-primary-accent dark:text-secondary-accent font-medium"
          >
            Projects
          </button>
          <span>/</span>
          <button 
            onClick={() => navigate(`/projects/${projectId}`)}
            className="text-primary-accent dark:text-secondary-accent font-medium"
          >
            Project
          </button>
          <span>/</span>
          <span>UML Diagrams</span>
        </div>

        {/* TITLE */}
        <div className="mb-6">
          <h1 className="text-4xl font-black">UML Diagrams</h1>
        </div>

        {/* DIAGRAM TYPE */}
        <div className="bg-white dark:bg-background-dark rounded-xl shadow mb-4">

          <div className="flex gap-2 p-2 bg-[#e9e7f4] dark:bg-background-dark rounded-lg">
            {["usecase", "class", "sequence"].map((type) => (
              <label
                key={type}
                className={`flex-1 cursor-pointer text-center px-3 py-2 rounded-lg text-sm font-medium
                  ${diagramType === type
                    ? "bg-primary text-white shadow"
                    : "text-[#57499c] dark:text-white/60"
                  }`}
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

          {/* ACTION BUTTONS */}
          <div className="flex justify-between items-center gap-3 px-4 py-3 border-t">

            {/* LEFT SIDE */}
            <div className="flex gap-3 items-center">

              {/* GENERATE */}
              <button
                onClick={handleGenerate}
                disabled={loading}
                className="h-10 px-4 rounded-lg bg-primary text-white disabled:opacity-50"
              >
                {loading ? "Generating..." : "Generate UML"}
              </button>

              {/* VERSION DROPDOWN */}
              <select
                onChange={(e) => handleSelectVersion(e.target.value)}
                className="border px-8 py-2 rounded-lg"
              >
                <option>Select Version</option>
                {versions.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.version} ({v.approval_status})
                  </option>
                ))}
              </select>
            </div>

            {/* RIGHT SIDE */}
            <div className="flex gap-3">

              {/* EXPORT */}
              <button
                onClick={handleExportClick}
                className="h-10 px-4 rounded-lg flex items-center gap-2 bg-gray-200 dark:bg-gray-700"
              >
                <span className="material-symbols-outlined">download</span>
                Export
              </button>

              {/* APPROVE */}
              <button
                onClick={() => setShowApprovalModal(true)}
                disabled={approved || !artifactId}
                className={`h-10 px-6 rounded-lg flex items-center gap-2 text-white
                  ${approved ? "bg-green-600" : "bg-primary"}`}
              >
                <span className="material-symbols-outlined">
                  {approved ? "check_circle" : "approval"}
                </span>
                {approved ? "Approved" : "Approve"}
              </button>

            </div>
          </div>
        </div>

        {/* IMAGE */}
        <div className="bg-white dark:bg-[#1f1c2e] rounded-xl border p-6 flex justify-center">
          {diagramUrl ? (
            <img
              src={diagramUrl}
              alt="UML Diagram"
              className="max-w-full h-auto rounded-lg"
            />
          ) : (
            <p className="text-gray-400">No diagram generated yet</p>
          )}
        </div>
        {loading && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            
            <div className="bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-2xl flex flex-col items-center gap-4">
              
              {/* Spinner */}
              <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>

              {/* Text */}
              <p className="text-sm text-gray-600 dark:text-gray-300 font-medium">
                Generating UML Diagram...
              </p>

            </div>
          </div>
        )}
      </main>

      {/* MODAL */}
      {showApprovalModal && (
        <UMLApprovalModal
          onClose={() => setShowApprovalModal(false)}
          onApprove={handleApprove}
        />
      )}
    </div>
  );
}