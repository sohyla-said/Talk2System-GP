import { useState, useRef, useEffect } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import RequirementsApprovalModal from "../../components/modals/RequirementsApprovalModal";
import RequirementsEditModal from "../../components/modals/RequirementsEditModal";
import { getToken } from "../../api/authApi";

export default function RequirementsSessionView() {
  const [approved, setApproved] = useState(false);
  const [showApprovalModal, setShowApprovalModal] = useState(false);  // controls visibility of the approval modal
  const [pendingNavigation, setPendingNavigation] = useState(null);   // Stores target route temporarily when user tries to move to another tab before approval.
  const [showEditModal, setShowEditModal] = useState(false);  // controls whether the edit modal is opened
  const [editingSection, setEditingSection] = useState(null); // Stores which section is being edited, such as functional, nonFunctional, actors, features.
  const [versions, setVersions] = useState([]); // Holds all available versions for the current session requirement set (for dropdown).
  const [selectedVersionId, setSelectedVersionId] = useState(null); // Tracks currently selected version in the dropdown.
  const navigate = useNavigate();
  const { sessionId } = useParams();
  const location = useLocation();
  const [projectId, setProjectId] = useState(location.state?.projectId ?? null);
  const [currentRequirementId, setCurrentRequirementId] = useState(location.state?.requirementId ?? null);  // Primary requirement id currently displayed/edited/approved.

  const initialData = location.state?.groupedData;
  const [chosenRunType, setChosenRunType] = useState(location.state?.preferredType ?? null);
  const [requirementId, setRequirementId] = useState(location.state?.requirementId ?? null);  // Fallback requirement id, mostly used together with currentRequirementId when approving.
  const [requirements, setRequirements] = useState({
    functional: [],
    nonFunctional: [],
    actors: [],
    features: []
  }); // Normalized UI data object used for rendering sections: functional, nonFunctional, actors and features
  const [projectName, setProjectName] = useState(null);
  const [sessionName, setSessionName] = useState(null);
  // multi select state for bulk deletion
  const [selectionMode, setSelectionMode] = useState({
    functional: false,
    nonFunctional: false,
    actors: false,
    features: false
  });
  // track selected items for deletion per sesction
  const [selectedItems, setSelectedItems] = useState({
    functional: [],
    nonFunctional: [],
    actors: [],
    features: []
  });

  const getAuthHeaders = (includeJson = false) => {
    const token = getToken();
    return {
      ...(includeJson ? { "Content-Type": "application/json" } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    };
  };

  const latestVersionIdRef = useRef(null);

  useEffect(() => {
    if (!sessionId) return;
    fetchSessionMeta();
  }, [sessionId]);

  useEffect(() => {
    if (!projectId || !sessionId) return;

    fetchProjectName();
    fetchVersions();

    if (initialData) {
      mapBackendData(initialData);
      setCurrentRequirementId(location.state?.requirementId);
    } else {
      fetchLatestRequirements();
    }
  }, [initialData, projectId, sessionId]);

  // useEffect(() => {
  //   if (versions.length > 0) {
  //     const latest = versions[0]; // already sorted DESC
  //     setSelectedVersionId(latest.id);
  //     fetchRequirementById(latest.id);
  //   }
  // }, [versions]);

  // poll for versions changes to support multi-user live sync
  useEffect(() => {
    if (!projectId || !sessionId) return;

    const pollLatestVersion = async () => {
      try{
        const response = await fetch(
          `http://localhost:8000/api/projects/${projectId}/session/${sessionId}/requirements/versions`,
          {
            headers: getAuthHeaders()
          }
        );
        const data = await response.json();
        if (!response.ok){
          throw new Error(data.detail || "Failed to load versions");
        }
        setVersions(data);

        if (Array.isArray(data) && data.length > 0){
          const latest = data[0]

          if (latestVersionIdRef.current !== latest.id){
            latestVersionIdRef.current = latest.id;
            setSelectedVersionId(latest.id);
            fetchRequirementById(latest.id);
          }
        }
      }catch (err) {
        console.error("Polling failed:", err);
      }
    };
    pollLatestVersion();
    const intervalId = setInterval(pollLatestVersion, 7000);

    return () => clearInterval(intervalId);
  }, [projectId, sessionId]);


// if project id is missed but session id exists, call an endpoint to fetch project id
  const fetchSessionMeta = async () => {
    try {
      const response = await fetch(`http://127.0.0.1:8000/api/sessions/${sessionId}`, {
        headers: getAuthHeaders()
      });
      const data = await response.json();
        if (!response.ok) {
         throw new Error(data.detail || "Failed to load session data");
       }
       // set projectId only if it's missing
      setProjectId((prev) => prev ?? data.project_id ?? null);
      setSessionName(data.title ?? null);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchProjectName = async () =>{
    try{
        const projectRes = await fetch(`http://localhost:8000/api/projects/getproject/${projectId}`, {
          headers: getAuthHeaders()
        });
        const projectData = await projectRes.json();
        setProjectName(projectData.name)
    }
    catch (err) {
        console.error(err);
      } 
  };

  // fetch the latest requirement version in the session
  const fetchLatestRequirements = async () => {
    if (!projectId || !sessionId) return;

    try{
      const response = await fetch (
        `http://127.0.0.1:8000/api/projects/${projectId}/session/${sessionId}/requirements`, {
          headers: getAuthHeaders(true),
        }
      );
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.detail || "Failed to load requirements");
      }

      setRequirementId(data.id ?? null);
      setCurrentRequirementId(data.id ?? null);
      setApproved(data.approval_status === "approved");
      setChosenRunType(data.preferred_type ?? location.state?.preferredType ?? null);
      mapBackendData(data.data || data);
    }
    catch (err) {
      console.error(err);
    }
  };

  // Loads session requirement versions list for the dropdown.
  const fetchVersions = async () => {
    if (!projectId || !sessionId) return;

    try {
      const response = await fetch (
        `http://localhost:8000/api/projects/${projectId}/session/${sessionId}/requirements/versions`,
        {
          headers: getAuthHeaders()
        }
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


  // Loads one specific version by requirement id and updates UI accordingly.
  const fetchRequirementById = async (id) => {
    try{
      const response = await fetch (
        `http://localhost:8000/api/sessions/requirements/${id}`,
        {
          headers: getAuthHeaders()
        }
      );
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.detail || "Failed to load requirement version");
      }

      setCurrentRequirementId(data.id);
      setRequirementId(data.id);
      setApproved(data.approval_status === "approved");
      setChosenRunType(data.preferred_type ?? chosenRunType ?? null);
      mapBackendData(data.data);
    }
    catch (err) {
      console.error(err);
    }
  };


    const hasExtractedRequirements =
    requirements.functional.length > 0 ||
    requirements.nonFunctional.length > 0 ||
    requirements.actors.length > 0 ||
    requirements.features.length > 0;

  // Transforms backend grouped payload into UI shape
  const mapBackendData = (grouped) => {
    if (!grouped || typeof grouped !== "object") {
      setRequirements({
        functional: [],
        nonFunctional: [],
        actors: [],
        features: []
      });
      setSelectionMode({
        functional: false,
        nonFunctional: false,
        actors: false,
        features: false
      });
      setSelectedItems({
        functional: [],
        nonFunctional: [],
        actors: [],
        features: []
      });
      return;
    }
    // builds FR/NFR display cards + tags
    const functionalList = Array.isArray(grouped.functional_requirements)
      ? grouped.functional_requirements
      : [];
    const nonFunctionalList = Array.isArray(grouped.nonfunctional_requirements)
      ? grouped.nonfunctional_requirements
      : Array.isArray(grouped.non_functional_requirements)
        ? grouped.non_functional_requirements
        : [];
    // builds actor/feature lists
    const actorsList = Array.isArray(grouped.actors) ? grouped.actors : [];
    const featuresList = Array.isArray(grouped.features) ? grouped.features : [];

    const functional = functionalList.map((fr, index) => ({
      id: `FR-${index + 1}`,
      description: fr.text,
      tags: [
        ...(fr.actor ? [{ label: `Actor: ${fr.actor}`, color: "blue" }] : []),
        ...(fr.feature ? [{ label: `Feature: ${fr.feature}`, color: "purple" }] : [])
      ]
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

    const features = featuresList.map((feature, index) => ({
      id: `F-${index + 1}`,
      description: feature
    }));

    // writes into requirements state
    setRequirements({
      functional,
      nonFunctional,
      actors,
      features
    });
    setSelectionMode({
      functional: false,
      nonFunctional: false,
      actors: false,
      features: false
    });
    setSelectedItems({
      functional: [],
      nonFunctional: [],
      actors: [],
      features: []
    });
  };

  // converts current UI-edited state back to backend payload structure before save
  const buildGroupedFromUI = (sectionType, updatedData) => {
    const mergedRequirements = {
      ...requirements,
      [sectionType]: updatedData
    };

    return {
      functional_requirements: mergedRequirements.functional.map((fr) => ({
        text: fr.description,
        actor: extractActor(fr.tags),
        feature: extractFeature(fr.tags)
      })),
      non_functional_requirements: mergedRequirements.nonFunctional.map((nfr) => ({
        text: nfr.description,
        category: extractCategory(nfr.tags)
      })),
      actors: mergedRequirements.actors.map((a) => a.description),
      features: mergedRequirements.features.map((f) => f.description)
    };
  };

  // reads Actor tag value from a tag array.
  const extractActor = (tags) => {
    const tag = (tags || []).find(t => t.label.startsWith("Actor:"));
    return tag ? tag.label.replace("Actor: ", "") : null;
  };

  // reads Feature tag value from a tag array.
  const extractFeature = (tags) => {
    const tag = (tags || []).find(t => t.label.startsWith("Feature:"));
    return tag ? tag.label.replace("Feature: ", "") : null;
  };

  // reads Category tag value from a tag array.
  const extractCategory = (tags) => {
    const tag = (tags || []).find(t => t.label.startsWith("Category:"));
    return tag ? tag.label.replace("Category: ", "") : null;
  };

  // turn selection mode on/off for 1 section (fr, nfr, actors, features)
  // prevents stale selected checkboxes when user exits selection mode
  const toggleSelectionMode = (sectionType) => {
    // read current mode for this sesction and flip it
    setSelectionMode((prev) => {
      const nextIsOn = !prev[sectionType];
      if (!nextIsOn) {
        setSelectedItems((old) => ({ ...old, [sectionType]: [] }));
      }
      return { ...prev, [sectionType]: nextIsOn };
    });
  };

  // add/remove 1 item id from the selected list for a section
  const toggleItemSelection = (sectionType, itemId) => {
    // Gets current selected IDs for the section.
    // If itemId is already selected, removes it.
    //If not selected, appends it.
    setSelectedItems((prev) => {
      const current = prev[sectionType] || [];
      const exists = current.includes(itemId);
      return {
        ...prev,
        [sectionType]: exists ? current.filter((id) => id !== itemId) : [...current, itemId]
      };
    });
  };

  // delete all currently selected items in one shot for that section.
  const handleBulkDelete = async (sectionType) => {
    // reads selected ids
    const selected = selectedItems[sectionType] || [];
    if (!selected.length) return;

    // ask for user confirmation
    const confirmDelete = window.confirm(`Delete ${selected.length} selected item(s)?`);
    if (!confirmDelete) return;

    // builds updatedSection by filtering out selected IDs from requirements[sectionType]
    const updatedSection = (requirements[sectionType] || []).filter(
      (item) => !selected.includes(item.id)
    );

    // persist the update in the backend
    await handleSaveRequirements(sectionType, updatedSection);
    // Resets section selection mode and clears selected IDs
    setSelectionMode((prev) => ({ ...prev, [sectionType]: false }));
    setSelectedItems((prev) => ({ ...prev, [sectionType]: [] }));
  };


const handleApprove = async () => {
  const targetRequirementId = currentRequirementId ?? requirementId;

  if (!targetRequirementId) {
    console.error("No requirement ID available for approval");
    return;
  }

  try {
    const response = await fetch(
      `http://localhost:8000/api/sessions/requirements/${targetRequirementId}/approve`,
      {
        method: 'PATCH',
        headers: getAuthHeaders()
      }
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
      const { path, state } = typeof pendingNavigation === "string"
        ? { path: pendingNavigation, state: null }
        : pendingNavigation;
      navigate(path, state ? { state } : undefined);
      setPendingNavigation(null);
    }
  } catch (err) {
    console.error(err);
  }
};

  // Closes approval modal and clears pending navigation.
  const handleCloseModal = () => {
    setShowApprovalModal(false);
    setPendingNavigation(null);
  };

  // Opens edit modal for a selected section.
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
        `http://localhost:8000/api/sessions/requirements/${currentRequirementId}`,
        {
          method: "PUT",
          headers: getAuthHeaders(true),
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
      setChosenRunType(data.preferred_type ?? chosenRunType ?? null);
      mapBackendData(data.data);

      // Refresh versions list
      fetchVersions();

      setShowEditModal(false);

    } catch (err) {
      console.error(err);
    }
  };

  const handleNavigation = (path, state = null) => {
    if (!approved) {
      setPendingNavigation({ path, state });
      setShowApprovalModal(true);
    } else {
      navigate(path, state ? { state } : undefined);
    }
  };


  const handleGenerate = (type) => {
    if (!approved) {
      setPendingNavigation(type);
      setShowModal(true);
      return;
    }
    if (type == 'uml') handleNavigation(`/projects/${projectId}/artifacts/uml`);
    if (type == 'srs') handleNavigation(`/projects/${projectId}/artifacts/srs`);
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
                {projectName}
              </button>
              <span className="text-text-dark/50 dark:text-text-light/50 font-medium leading-normal">/</span>
              <button 
                onClick={() => navigate(`/transcript/${sessionId}`)}
                className="text-primary-accent dark:text-secondary-accent font-medium leading-normal"
              >
                {sessionName}
              </button>
              <span className="text-text-dark/50 dark:text-text-light/50 font-medium leading-normal">/</span>
              <span className="text-text-dark dark:text-text-light font-medium leading-normal">Requirements</span>
            </div>
        {/* Page Header */}
        <div className="flex flex-wrap justify-between gap-3 p-4">
          <div className="flex min-w-72 flex-col gap-3">
            <h1 className="text-slate-900 dark:text-white text-4xl font-black leading-tight tracking-[-0.033em]">
              {sessionName} - Requirements
            </h1>
            <p className="text-slate-500 dark:text-slate-400 text-base font-normal leading-normal">
              Review, filter, and manage requirements generated from your brainstorming session.
            </p>
            <p className="text-slate-500 dark:text-slate-400 text-base font-normal leading-normal">
              These requirements are choosen from the <strong>{chosenRunType || "selected extractor"}</strong>.
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
            onClick={() => navigate(`/transcript/${sessionId}`)}
            className="text-slate-500 dark:text-slate-400 pb-3 text-sm font-medium leading-normal hover:text-slate-800 dark:hover:text-slate-200 transition-colors whitespace-nowrap"
          >
            Transcript
          </button>
          <button 
            onClick={() => navigate(`/projects/${projectId}/sessions/${sessionId}/artifacts`)}
            className="text-slate-500 dark:text-slate-400 pb-3 text-sm font-medium leading-normal hover:text-slate-800 dark:hover:text-slate-200 transition-colors whitespace-nowrap"
          >
            Artifacts
          </button>
        </div>
        {hasExtractedRequirements ? (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 px-4 pb-4">
              <button
                onClick={() => handleGenerate("uml")}
                className="flex w-full items-center justify-center gap-3 rounded-lg bg-primary px-4 py-3 font-bold text-white shadow-soft transition-colors hover:bg-primary/90"
              >
                <span className="material-symbols-outlined text-xl">schema</span>
                Generate UML Diagrams
              </button>
              <button
                onClick={() => handleGenerate("srs")}
                className="flex w-full items-center justify-center gap-3 rounded-lg bg-primary px-4 py-3 font-bold text-white shadow-soft transition-colors hover:bg-primary/90"
              >
                <span className="material-symbols-outlined text-xl">description</span>
                Generate SRS
              </button>
            </div>

            {/* Search and Filter Bar
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
            </div> */}

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
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleSelectionMode("functional");
                        }}
                        className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-md bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-600"
                      >
                        <span className="material-symbols-outlined text-sm leading-none">delete</span>
                        {selectionMode.functional ? "Cancel" : "Select"}
                      </button>
                      {selectionMode.functional && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleBulkDelete("functional");
                          }}
                          disabled={(selectedItems.functional || []).length === 0}
                          className="text-xs px-2 py-1 rounded-md bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300 disabled:opacity-50"
                        >
                          Delete Selected ({(selectedItems.functional || []).length})
                        </button>
                      )}
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
                      {selectionMode.functional && (
                        <label className="inline-flex items-center gap-2 mb-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={(selectedItems.functional || []).includes(req.id)}
                            onChange={() => toggleItemSelection("functional", req.id)}
                          />
                          <span className="text-xs text-slate-500 dark:text-slate-400">Select</span>
                        </label>
                      )}
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
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleSelectionMode("nonFunctional");
                        }}
                        className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-md bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-600"
                      >
                        <span className="material-symbols-outlined text-sm leading-none">delete</span>
                        {selectionMode.nonFunctional ? "Cancel" : "Select"}
                      </button>
                      {selectionMode.nonFunctional && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleBulkDelete("nonFunctional");
                          }}
                          disabled={(selectedItems.nonFunctional || []).length === 0}
                          className="text-xs px-2 py-1 rounded-md bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300 disabled:opacity-50"
                        >
                          Delete Selected ({(selectedItems.nonFunctional || []).length})
                        </button>
                      )}
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
                      {selectionMode.nonFunctional && (
                        <label className="inline-flex items-center gap-2 mb-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={(selectedItems.nonFunctional || []).includes(req.id)}
                            onChange={() => toggleItemSelection("nonFunctional", req.id)}
                          />
                          <span className="text-xs text-slate-500 dark:text-slate-400">Select</span>
                        </label>
                      )}
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
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleSelectionMode("actors");
                        }}
                        className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-md bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-600"
                      >
                        <span className="material-symbols-outlined text-sm leading-none">delete</span>
                        {selectionMode.actors ? "Cancel" : "Select"}
                      </button>
                      {selectionMode.actors && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleBulkDelete("actors");
                          }}
                          disabled={(selectedItems.actors || []).length === 0}
                          className="text-xs px-2 py-1 rounded-md bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300 disabled:opacity-50"
                        >
                          Delete Selected ({(selectedItems.actors || []).length})
                        </button>
                      )}
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

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pb-4">
                  {requirements.actors.map((actor) => (
                    <div key={actor.id} className="p-4 rounded-lg bg-background-light dark:bg-background-dark/50 border border-transparent dark:border-white/5">
                      {selectionMode.actors && (
                        <label className="inline-flex items-center gap-2 mb-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={(selectedItems.actors || []).includes(actor.id)}
                            onChange={() => toggleItemSelection("actors", actor.id)}
                          />
                          <span className="text-xs text-slate-500 dark:text-slate-400">Select</span>
                        </label>
                      )}
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

              {/* Features */}
              <details className="flex flex-col rounded-xl border border-[#d3cee8]/50 dark:border-white/10 bg-white dark:bg-background-dark px-4 group">
                <summary className="flex cursor-pointer items-center justify-between gap-6 py-4 list-none">
                  <div className="flex flex-col">
                    <div className="flex items-center gap-2">
                      <p className="text-slate-900 dark:text-white text-lg font-bold leading-normal">
                        Features
                      </p>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleSelectionMode("features");
                        }}
                        className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-md bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-600"
                      >
                        <span className="material-symbols-outlined text-sm leading-none">delete</span>
                        {selectionMode.features ? "Cancel" : "Select"}
                      </button>
                      {selectionMode.features && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleBulkDelete("features");
                          }}
                          disabled={(selectedItems.features || []).length === 0}
                          className="text-xs px-2 py-1 rounded-md bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300 disabled:opacity-50"
                        >
                          Delete Selected ({(selectedItems.features || []).length})
                        </button>
                      )}
                      <span
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEditSection('features');
                        }}
                        className="material-symbols-outlined text-slate-400 hover:text-primary text-lg cursor-pointer transition-colors"
                      >
                        edit
                      </span>
                    </div>
                    <p className="text-slate-500 dark:text-slate-400 text-sm font-normal leading-normal">
                      High-level capabilities of the system.
                    </p>
                  </div>
                  <span className="material-symbols-outlined text-slate-500 dark:text-slate-400 group-open:rotate-180 transition-transform">
                    expand_more
                  </span>
                </summary>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pb-4">
                  {requirements.features.map((feature) => (
                    <div key={feature.id} className="p-4 rounded-lg bg-background-light dark:bg-background-dark/50 border border-transparent dark:border-white/5">
                      {selectionMode.features && (
                        <label className="inline-flex items-center gap-2 mb-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={(selectedItems.features || []).includes(feature.id)}
                            onChange={() => toggleItemSelection("features", feature.id)}
                          />
                          <span className="text-xs text-slate-500 dark:text-slate-400">Select</span>
                        </label>
                      )}
                      <p className="text-slate-500 dark:text-slate-400 font-mono text-xs mb-1">
                        {feature.id}
                      </p>
                      <p className="text-slate-800 dark:text-slate-200 text-sm">
                        {feature.description}
                      </p>
                    </div>
                  ))}
                </div>
              </details>
            </div>
          </>
        ) : (
          <div className="px-4 pb-4">
            <div className="rounded-xl border border-[#d3cee8]/50 dark:border-white/10 bg-white dark:bg-background-dark p-8 text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                <span className="material-symbols-outlined">info</span>
              </div>
              <h3 className="text-slate-900 dark:text-white text-xl font-bold mb-2">No requirements extracted yet</h3>
              <p className="text-slate-500 dark:text-slate-400 mb-6">
                This session does not have extracted requirements yet. Go to the transcript page to extract and review requirements first.
              </p>
              <button
                onClick={() => navigate(`/transcript/${sessionId}`)}
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-5 py-3 font-bold text-white transition-colors hover:bg-primary/90"
              >
                <span className="material-symbols-outlined text-lg">description</span>
                Go To Transcript
              </button>
            </div>
          </div>
        )}
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
