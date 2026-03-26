import { useState } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { useEffect } from "react";
import RequirementsApprovalModal from "../../components/modals/RequirementsApprovalModal";
import RequirementsEditModal from "../../components/modals/RequirementsEditModal";

export default function RequirementsView() {
  const [approved, setApproved] = useState(false);
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [pendingNavigation, setPendingNavigation] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingSection, setEditingSection] = useState(null);
  const [versions, setVersions] = useState([]);
  const [selectedVersionId, setSelectedVersionId] = useState(null);
  const navigate = useNavigate();
  const { id: projectId } = useParams();
  const location = useLocation();
  const [currentRequirementId, setCurrentRequirementId] = useState(location.state?.requirementId ?? null);

  const initialData = location.state?.groupedData;
  const [requirementId, setRequirementId] = useState(location.state?.requirementId ?? null);

  useEffect(() => {
    fetchVersions();

    if (initialData) {
      mapBackendData(initialData);
      setCurrentRequirementId(location.state?.requirementId)
    } else {
      fetchLatestRequirements();
    }
  }, [initialData]);


  const fetchLatestRequirements = async () => {
    if (!projectId) return;

    try{
      const response = await fetch (
        `http://127.0.0.1:8000/api/projects/${projectId}/requirements`
      );
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.detail || "Failed to load requirements");
      }

      setRequirementId(data.id ?? null);
      setCurrentRequirementId(data.id ?? null);
      setApproved(data.approval_status === "approved");
      mapBackendData(data.data || data.grouped_requirements || data);
    }
    catch (err) {
      console.error(err);
    }
  };


  const mapBackendData = (grouped) => {
    if (!grouped || typeof grouped !== "object") {
      setRequirements({
        functional: [],
        nonFunctional: [],
        actors: []
      });
      return;
    }
    const functionalList = Array.isArray(grouped.functional_requirements)
      ? grouped.functional_requirements
      : [];
    const nonFunctionalList = Array.isArray(grouped.nonfunctional_requirements)
      ? grouped.nonfunctional_requirements
      : Array.isArray(grouped.non_functional_requirements)
        ? grouped.non_functional_requirements
        : [];
    const actorsList = Array.isArray(grouped.actors) ? grouped.actors : [];

    const functional = functionalList.map((fr, index) => ({
      id: `FR-${index + 1}`,
      description: fr.text,
      tags: fr.actor
        ? [{ label: `Actor: ${fr.actor}`, color: "blue" }]
        : []
    }));

    const nonFunctional = nonFunctionalList.map((nfr, index) => ({
      id: `NFR-${index + 1}`,
      description: nfr.text,
      tags: nfr.category
        ? [{ label: `Category: ${nfr.category}`, color: "green" }]
        : []
    }));

    const actors = actorsList.map((actor, index) => ({
      id: `A-${index + 1}`,
      description: actor
    }));

    setRequirements({
      functional,
      nonFunctional,
      actors
    });
  };


  const buildGroupedFromUI = (sectionType, updatedData) => {
    const mergedRequirements = {
      ...requirements,
      [sectionType]: updatedData
    };

    return {
      functional_requirements: mergedRequirements.functional.map((fr) => ({
        text: fr.description,
        actor: extractActor(fr.tags)
      })),
      non_functional_requirements: mergedRequirements.nonFunctional.map((nfr) => ({
        text: nfr.description,
        category: extractCategory(nfr.tags)
      })),
      actors: mergedRequirements.actors.map((a) => a.description)
    };
  };

  const extractActor = (tags) => {
    const tag = (tags || []).find(t => t.label.startsWith("Actor:"));
    return tag ? tag.label.replace("Actor: ", "") : null;
  };

  const extractCategory = (tags) => {
    const tag = (tags || []).find(t => t.label.startsWith("Category:"));
    return tag ? tag.label.replace("Category: ", "") : null;
  };


  const [requirements, setRequirements] = useState({
    functional: [],
    nonFunctional: [],
    actors: []
  });

  // Handle navigation with approval check
  const handleNavigation = (path) => {
    if (!approved) {
      setPendingNavigation(path);
      setShowApprovalModal(true);
    } else {
      navigate(path);
    }
  };
    
  // Handle approval
  const handleApprove = async () => {
    const targetRequirementId = currentRequirementId ?? requirementId;

    if (!targetRequirementId) {
      console.error("No requirement ID available for approval");
      return;
    }

    try{
      const response = await fetch(
        `http://localhost:8000/api/requirements/${targetRequirementId}/approve`,
        { method: 'PATCH' }
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.detail || "Failed to approve requirements");
      }

      setApproved(true);
      setRequirementId(targetRequirementId);
      setCurrentRequirementId(targetRequirementId);
      setShowApprovalModal(false);

      if (pendingNavigation) {
        navigate(pendingNavigation);
        setPendingNavigation(null);
      }
    }
    catch (err) {
      console.error(err);
    }
   
  };

  // Close modal and cancel navigation
  const handleCloseModal = () => {
    setShowApprovalModal(false);
    setPendingNavigation(null);
  };

  // Handle opening edit modal
  const handleEditSection = (sectionType) => {
    setEditingSection(sectionType);
    setShowEditModal(true);
  };

  // Handle saving edited requirements
  const handleSaveRequirements = async (sectionType, updatedData) => {
    try {
      // Merge updated section into full structure
      const updatedGrouped = buildGroupedFromUI(sectionType, updatedData);

      const res = await fetch(
        `http://localhost:8000/api/requirements/${currentRequirementId}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            grouped: updatedGrouped
          }),
        }
      );

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || "Failed to update requirements");
      }

      // Update UI with NEW version
      setCurrentRequirementId(data.id);
      setRequirementId(data.id);
      setSelectedVersionId(data.id);
      setApproved(data.approval_status === "approved");
      mapBackendData(data.data);

      // Refresh versions list
      fetchVersions();

      setShowEditModal(false);

    } catch (err) {
      console.error(err);
    }
  };

  // Get tag color classes
  const getTagColorClasses = (color) => {
    const colors = {
      blue: "bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-300",
      purple: "bg-purple-100 dark:bg-purple-900/50 text-purple-800 dark:text-purple-300",
      green: "bg-green-100 dark:bg-green-900/50 text-green-800 dark:text-green-300",
    };
    return colors[color] || colors.blue;
  };

  const fetchVersions = async () => {
    if (!projectId) return;

    try {
      const response = await fetch (
        `http://localhost:8000/api/projects/${projectId}/requirements/versions`
      );
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.detail || "Failed to load versions");
      }

      setVersions(data);
    }
    catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (versions.length > 0) {
      const latest = versions[0]; // already sorted DESC
      setSelectedVersionId(latest.id);
      fetchRequirementById(latest.id);
    }
  }, [versions]);

  const fetchRequirementById = async (id) => {
    try{
      const response = await fetch (
        `http://localhost:8000/api/requirements/${id}`
      );
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.detail || "Failed to load requirement version");
      }

      setCurrentRequirementId(data.id);
      setRequirementId(data.id);
      setApproved(data.approval_status === "approved");
      mapBackendData(data.data);
    }
    catch (err) {
      console.error(err);
    }
  };

  return (
    <>
      <div className="w-full max-w-5xl mx-auto">
        <div className="flex flex-wrap gap-2 text-sm">
              <button 
                onClick={() => navigate("/projects")}
                className="text-primary-accent dark:text-secondary-accent font-medium leading-normal"
              >
                Projects
              </button>
              <span className="text-text-dark/50 dark:text-text-light/50 font-medium leading-normal">/</span>
              <button 
                onClick={() => navigate(`/projects/${projectId}`)}
                className="text-primary-accent dark:text-secondary-accent font-medium leading-normal"
              >
                E-commerce App Redesign
              </button>
              <span className="text-text-dark/50 dark:text-text-light/50 font-medium leading-normal">/</span>
              <span className="text-text-dark dark:text-text-light font-medium leading-normal">Requirements</span>
            </div>
        {/* Page Header */}
        <div className="flex flex-wrap justify-between gap-3 p-4">
          <div className="flex min-w-72 flex-col gap-3">
            <h1 className="text-slate-900 dark:text-white text-4xl font-black leading-tight tracking-[-0.033em]">
              E-commerce App Redesign - Requirements
            </h1>
            <p className="text-slate-500 dark:text-slate-400 text-base font-normal leading-normal">
              Review, filter, and manage project requirements generated from your brainstorming session.
            </p>
          </div>
          <div className="flex items-start gap-3">
            <div className="flex flex-col items-stretch sm:items-end gap-3 w-full sm:w-auto">
              <button
                onClick={handleApprove}
                className={`flex min-w-[220px] items-center justify-center gap-2 h-12 px-6 rounded-lg text-sm font-bold transition-all ${
                  approved
                    ? 'bg-green-600 text-white cursor-default'
                    : 'bg-primary text-white hover:bg-primary/90'
                }`}
                disabled={approved || !(currentRequirementId ?? requirementId)}
              >
                <span className="material-symbols-outlined text-lg">
                  {approved ? 'check_circle' : 'approval'}
                </span>
                <span>{approved ? 'Approved' : 'Approve Requirements'}</span>
              </button>

              <div className={`relative min-w-[220px] h-12 rounded-xl border border-[#d9d2f2] dark:border-[#3a3360] bg-[#f3f0ff] dark:bg-[#1f1a36] transition-all shadow-sm ${
                approved ? 'text-green-600 dark:text-green-300' : 'text-primary'
              }`}>
                <div className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2">
                  <span className="material-symbols-outlined text-lg">history</span>
                </div>
                <select
                  value={selectedVersionId || ""}
                  onChange={(e) => {
                    const id = e.target.value;
                    setSelectedVersionId(id);
                    fetchRequirementById(id);
                  }}
                  className={`appearance-none w-full h-full bg-transparent pl-10 pr-10 text-sm font-semibold tracking-wide focus:outline-none focus:ring-2 focus:ring-primary/30 rounded-xl ${
                    approved ? 'text-green-600 dark:text-green-300' : 'text-primary'
                  }`}
                >
                  <option value="">Select Version</option>
                  {versions.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.version} - {v.approval_status}
                    </option>
                  ))}
                </select>
                <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2">
                  <span className="material-symbols-outlined text-lg">expand_more</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs Navigation */}
        <div className="flex items-center gap-8 px-4 border-b border-[#d3cee8]/50 dark:border-white/10 mb-4 overflow-x-auto">
          <button 
            className="text-primary dark:text-primary/90 border-b-2 border-primary pb-3 text-sm font-bold leading-normal whitespace-nowrap"
          >
            Requirements
          </button>
          <button 
            onClick={() => handleNavigation(`/projects/${projectId}/artifacts/uml`)}
            className="text-slate-500 dark:text-slate-400 pb-3 text-sm font-medium leading-normal hover:text-slate-800 dark:hover:text-slate-200 transition-colors whitespace-nowrap"
          >
            Diagrams
          </button>
          <button 
            onClick={() => handleNavigation(`/projects/${projectId}/artifacts/srs`)}
            className="text-slate-500 dark:text-slate-400 pb-3 text-sm font-medium leading-normal hover:text-slate-800 dark:hover:text-slate-200 transition-colors whitespace-nowrap"
          >
            Documents
          </button>
          <button 
            onClick={() => navigate("/transcript")}
            className="text-slate-500 dark:text-slate-400 pb-3 text-sm font-medium leading-normal hover:text-slate-800 dark:hover:text-slate-200 transition-colors whitespace-nowrap"
          >
            Transcript
          </button>
        </div>

        {/* Search and Filter Bar */}
        <div className="flex flex-col md:flex-row gap-4 p-4 pt-0">
          <label className="flex flex-col h-12 w-full md:flex-1">
            <div className="flex w-full flex-1 items-stretch rounded-lg h-full">
              <div className="text-slate-500 dark:text-slate-400 flex border-none bg-white dark:bg-background-dark dark:border dark:border-white/10 items-center justify-center pl-4 rounded-l-lg border-r-0">
                <span className="material-symbols-outlined">search</span>
              </div>
              <input 
                className="form-input flex w-full min-w-0 flex-1 resize-none overflow-hidden rounded-r-lg text-slate-900 dark:text-white focus:outline-0 focus:ring-2 focus:ring-primary/50 border-none bg-white dark:bg-background-dark dark:border dark:border-l-0 dark:border-white/10 h-full placeholder:text-slate-500 dark:placeholder:text-slate-400 px-4 pl-2 text-base font-normal leading-normal" 
                placeholder="Search requirements by ID or keyword..." 
              />
            </div>
          </label>
          
          <div className="flex gap-3 overflow-x-auto pb-2">
            <button className="flex h-12 shrink-0 items-center justify-center gap-x-2 rounded-lg bg-white dark:bg-background-dark dark:border dark:border-white/10 px-4">
              <span className="material-symbols-outlined text-slate-500 dark:text-slate-400">filter_list</span>
              <p className="text-slate-900 dark:text-white text-sm font-medium leading-normal">Type: All</p>
              <span className="material-symbols-outlined text-slate-500 dark:text-slate-400">expand_more</span>
            </button>
            
          </div>
        </div>

        {/* Requirements Sections */}
        <div className="flex flex-col p-4 gap-4">
          
          {/* Functional Requirements */}
          <details className="flex flex-col rounded-xl border border-[#d3cee8]/50 dark:border-white/10 bg-white dark:bg-background-dark px-4 group" open>
            <summary className="flex cursor-pointer items-center justify-between gap-6 py-4 list-none">
              <div className="flex flex-col">
                <div className="flex items-center gap-2">
                  <p className="text-slate-900 dark:text-white text-lg font-bold leading-normal">
                    Functional Requirements
                  </p>
                  <span 
                    onClick={(e) => {
                      e.stopPropagation();
                      handleEditSection('functional');
                    }}
                    className="material-symbols-outlined text-slate-400 hover:text-primary text-lg cursor-pointer transition-colors"
                  >
                    edit
                  </span>
                </div>
                <p className="text-slate-500 dark:text-slate-400 text-sm font-normal leading-normal">
                  User-facing features and system behaviors.
                </p>
              </div>
              <span className="material-symbols-outlined text-slate-500 dark:text-slate-400 group-open:rotate-180 transition-transform">
                expand_more
              </span>
            </summary>
            
            <div className="flex flex-col gap-3 pb-4">
              {requirements.functional.map((req) => (
                <div key={req.id} className="p-4 rounded-lg bg-background-light dark:bg-background-dark/50 border border-transparent dark:border-white/5">
                  <p className="text-slate-500 dark:text-slate-400 font-mono text-xs mb-1">
                    {req.id}
                  </p>
                  <p className="text-slate-800 dark:text-slate-200 text-sm mb-3">
                    {req.description}
                  </p>
                  <div className="flex gap-2 flex-wrap">
                    {req.tags.map((tag, idx) => (
                      <span 
                        key={idx}
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${getTagColorClasses(tag.color)}`}
                      >
                        {tag.label}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </details>

          {/* Non-Functional Requirements */}
          <details className="flex flex-col rounded-xl border border-[#d3cee8]/50 dark:border-white/10 bg-white dark:bg-background-dark px-4 group">
            <summary className="flex cursor-pointer items-center justify-between gap-6 py-4 list-none">
              <div className="flex flex-col">
                <div className="flex items-center gap-2">
                  <p className="text-slate-900 dark:text-white text-lg font-bold leading-normal">
                    Non-Functional Requirements
                  </p>
                  <span 
                    onClick={(e) => {
                      e.stopPropagation();
                      handleEditSection('nonFunctional');
                    }}
                    className="material-symbols-outlined text-slate-400 hover:text-primary text-lg cursor-pointer transition-colors"
                  >
                    edit
                  </span>
                </div>
                <p className="text-slate-500 dark:text-slate-400 text-sm font-normal leading-normal">
                  System qualities like performance, security, and usability.
                </p>
              </div>
              <span className="material-symbols-outlined text-slate-500 dark:text-slate-400 group-open:rotate-180 transition-transform">
                expand_more
              </span>
            </summary>
            
            <div className="flex flex-col gap-3 pb-4">
              {requirements.nonFunctional.map((req) => (
                <div key={req.id} className="p-4 rounded-lg bg-background-light dark:bg-background-dark/50 border border-transparent dark:border-white/5">
                  <p className="text-slate-500 dark:text-slate-400 font-mono text-xs mb-1">
                    {req.id}
                  </p>
                  <p className="text-slate-800 dark:text-slate-200 text-sm mb-3">
                    {req.description}
                  </p>
                  <div className="flex gap-2 flex-wrap">
                    {req.tags.map((tag, idx) => (
                      <span 
                        key={idx}
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${getTagColorClasses(tag.color)}`}
                      >
                        {tag.label}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </details>

          {/* Actors */}
          <details className="flex flex-col rounded-xl border border-[#d3cee8]/50 dark:border-white/10 bg-white dark:bg-background-dark px-4 group">
            <summary className="flex cursor-pointer items-center justify-between gap-6 py-4 list-none">
              <div className="flex flex-col">
                <div className="flex items-center gap-2">
                  <p className="text-slate-900 dark:text-white text-lg font-bold leading-normal">
                    Actors
                  </p>
                  <span 
                    onClick={(e) => {
                      e.stopPropagation();
                      handleEditSection('actors');
                    }}
                    className="material-symbols-outlined text-slate-400 hover:text-primary text-lg cursor-pointer transition-colors"
                  >
                    edit
                  </span>
                </div>
                <p className="text-slate-500 dark:text-slate-400 text-sm font-normal leading-normal">
                  Roles that interact with the system.
                </p>
              </div>
              <span className="material-symbols-outlined text-slate-500 dark:text-slate-400 group-open:rotate-180 transition-transform">
                expand_more
              </span>
            </summary>
            
            <div className="flex flex-col gap-3 pb-4">
              {requirements.actors.map((actor) => (
                <div key={actor.id} className="p-4 rounded-lg bg-background-light dark:bg-background-dark/50 border border-transparent dark:border-white/5">
                  <p className="text-slate-500 dark:text-slate-400 font-mono text-xs mb-1">
                    {actor.id}
                  </p>
                  <p className="text-slate-800 dark:text-slate-200 text-sm">
                    {actor.description}
                  </p>
                </div>
              ))}
            </div>
          </details>

          
        </div>
      </div>

      {/* Approval Modal */}
      <RequirementsApprovalModal
        open={showApprovalModal}
        onApprove={handleApprove}
        onClose={handleCloseModal}
      />

      {/* Edit Modal */}
      <RequirementsEditModal
        open={showEditModal}
        onClose={() => {
          setShowEditModal(false);
          setEditingSection(null);
        }}
        onSave={handleSaveRequirements}
        sectionData={editingSection ? requirements[editingSection] : null}
        sectionType={editingSection}
      />
    </>
  );
}
