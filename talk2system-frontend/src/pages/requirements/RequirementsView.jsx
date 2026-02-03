import { useState } from "react";
import { useNavigate } from "react-router-dom";
import RequirementsApprovalModal from "../../components/modals/RequirementsApprovalModal";
import RequirementsEditModal from "../../components/modals/RequirementsEditModal";

export default function RequirementsView() {
  const [approved, setApproved] = useState(false);
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [pendingNavigation, setPendingNavigation] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingSection, setEditingSection] = useState(null);
  const navigate = useNavigate();

  // Mock requirements data - replace with actual data from API/context later
  const [requirements, setRequirements] = useState({
    functional: [
      {
        id: "FR-001",
        description: "The system must allow users to register for a new account using their email address and a password.",
        tags: [
          { label: "Actor: User", color: "blue" },
          { label: "Feature: Authentication", color: "purple" }
        ]
      },
      {
        id: "FR-002",
        description: "Registered users must be able to log in with their credentials.",
        tags: [
          { label: "Actor: User", color: "blue" },
          { label: "Feature: Authentication", color: "purple" }
        ]
      }
    ],
    nonFunctional: [
      {
        id: "NFR-001",
        description: "All pages should load in under 2 seconds on a standard internet connection.",
        tags: [
          { label: "Category: Performance", color: "green" }
        ]
      }
    ],
    actors: [
      {
        id: "A-001",
        description: "User: A standard user who can register, log in, and use the core features of the application."
      }
    ],
    features: [
      {
        id: "F-001",
        description: "Authentication: The process of verifying a user's identity, including registration and login."
      }
    ]
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
  const handleApprove = () => {
    setApproved(true);
    setShowApprovalModal(false);
    
    // Navigate to pending path if exists
    if (pendingNavigation) {
      navigate(pendingNavigation);
      setPendingNavigation(null);
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
  const handleSaveRequirements = (sectionType, updatedData) => {
    setRequirements({
      ...requirements,
      [sectionType]: updatedData
    });
    setShowEditModal(false);
    setEditingSection(null);
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
                onClick={() => navigate("/projects/1")}
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
            <button
              onClick={() => setApproved(true)}
              className={`flex min-w-[140px] items-center justify-center gap-2 h-12 px-6 rounded-lg text-sm font-bold transition-all ${
                approved
                  ? 'bg-green-600 text-white cursor-default'
                  : 'bg-primary text-white hover:bg-primary/90'
              }`}
              disabled={approved}
            >
              <span className="material-symbols-outlined text-lg">
                {approved ? 'check_circle' : 'approval'}
              </span>
              <span>{approved ? 'Approved' : 'Approve Requirements'}</span>
            </button>
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
            onClick={() => handleNavigation("/artifacts/uml")}
            className="text-slate-500 dark:text-slate-400 pb-3 text-sm font-medium leading-normal hover:text-slate-800 dark:hover:text-slate-200 transition-colors whitespace-nowrap"
          >
            Diagrams
          </button>
          <button 
            onClick={() => handleNavigation("/artifacts/srs")}
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

          {/* Features */}
          <details className="flex flex-col rounded-xl border border-[#d3cee8]/50 dark:border-white/10 bg-white dark:bg-background-dark px-4 group">
            <summary className="flex cursor-pointer items-center justify-between gap-6 py-4 list-none">
              <div className="flex flex-col">
                <div className="flex items-center gap-2">
                  <p className="text-slate-900 dark:text-white text-lg font-bold leading-normal">
                    Features
                  </p>
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
            
            <div className="flex flex-col gap-3 pb-4">
              {requirements.features.map((feature) => (
                <div key={feature.id} className="p-4 rounded-lg bg-background-light dark:bg-background-dark/50 border border-transparent dark:border-white/5">
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
