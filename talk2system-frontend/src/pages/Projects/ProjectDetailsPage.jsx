// export default ProjectDetailsPage;

import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

const ProjectDetailsPage = () => {
  const navigate = useNavigate();
  const { id: projectId } = useParams();

  const [sessions, setSessions] = useState([]);
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);

  // =========================
  // 📥 FETCH DATA
  // =========================
  useEffect(() => {
    const fetchData = async () => {
      try {
        // sessions
        const sessionsRes = await fetch(`http://localhost:8000/api/sessions/project/${projectId}`);
        const sessionsData = await sessionsRes.json();
        setSessions(sessionsData);

        // project
        const projectRes = await fetch(`http://localhost:8000/api/projects/getproject/${projectId}`);
        const projectData = await projectRes.json();
        setProject(projectData);

      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [projectId]);

  const handleStartMeetingSession = () => {
    navigate(`/projects/${projectId}/recording`);
  };

  return (
    <div className="w-full">
      {/* Main Content */}
      <div className="px-4 sm:px-6 lg:px-10 flex flex-1 justify-center py-8">
        <div className="layout-content-container flex flex-col w-full max-w-5xl flex-1">

          {/* Project Header */}
          <div className="flex flex-wrap justify-between items-start gap-4 p-4">
            <div className="flex min-w-72 flex-col gap-3">
              <p className="text-gray-900 dark:text-white text-4xl font-black leading-tight tracking-[-0.033em]">
                {project?.name || "Loading..."}
              </p>
              <p className="text-gray-500 dark:text-gray-400 text-base font-normal leading-normal">
                {project?.description || "A project to redesign the core user experience."}
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button 
                onClick={() => navigate(`/projects/${projectId}/add-participant`)}
                className="flex min-w-[84px] max-w-[480px] cursor-pointer items-center justify-center overflow-hidden rounded-lg h-12 px-6 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 text-sm font-bold leading-normal tracking-[0.015em] gap-2 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                <span className="material-symbols-outlined">person_add</span>
                <span className="truncate">Add Participants</span>
              </button>

              <button 
                onClick={handleStartMeetingSession}
                className="flex min-w-[84px] max-w-[480px] cursor-pointer items-center justify-center overflow-hidden rounded-lg h-12 px-6 bg-primary text-white text-sm font-bold leading-normal tracking-[0.015em] gap-2 shadow-sm hover:opacity-90 transition-opacity"
              >
                <span className="material-symbols-outlined text-lg">mic</span>
                <span className="truncate">Start Meeting Session</span>
              </button>
            </div>
          </div>

          {/* Project Tags (UNCHANGED DESIGN, NOW DYNAMIC) */}
          <div className="flex gap-3 px-4 pt-2 pb-4 overflow-x-auto">
            <div className="flex h-8 shrink-0 items-center justify-center gap-x-2 rounded-full bg-primary/10 dark:bg-primary/20 pl-3 pr-3">
              <p className="text-primary dark:text-indigo-300 text-sm font-medium leading-normal">
                Created: {project?.created_at
                  ? new Date(project.created_at).toLocaleDateString()
                  : "Loading..."}
              </p>
            </div>

            <div className="flex h-8 shrink-0 items-center justify-center gap-x-2 rounded-full bg-primary/10 dark:bg-primary/20 pl-3 pr-3">
              <p className="text-primary dark:text-indigo-300 text-sm font-medium leading-normal">
                Status: {project?.project_status || "Loading..."}
              </p>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex flex-col mt-4">
            <div className="border-b border-gray-200 dark:border-gray-700 px-4">
              <div className="flex gap-8">
                <button 
                  onClick={() => navigate(`/projects/${projectId}`)}
                  className="flex flex-col items-center justify-center border-b-[3px] border-b-primary text-gray-900 dark:text-white pb-[13px] pt-4"
                >
                  <p className="text-sm font-bold leading-normal tracking-[0.015em]">Sessions</p>
                </button>

                <button 
                  onClick={() => navigate(`/projects/${projectId}/requirements`)}
                  className="flex flex-col items-center justify-center border-b-[3px] border-b-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 pb-[13px] pt-4"
                >
                  <p className="text-sm font-bold leading-normal tracking-[0.015em]">Requirements</p>
                </button>

                <button 
                  onClick={() => navigate('/results')}
                  className="flex flex-col items-center justify-center border-b-[3px] border-b-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 pb-[13px] pt-4"
                >
                  <p className="text-sm font-bold leading-normal tracking-[0.015em]">Artifacts</p>
                </button>
              </div>
            </div>

            {/* Sessions Grid */}
            <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {loading ? (
                <p>Loading sessions...</p>
              ) : sessions.length === 0 ? (
                <p>No sessions yet</p>
              ) : (
                sessions.map((session) => (
                  <div
                    key={session.id}
                    onClick={() => navigate(`/transcript/${session.id}/requirements`)}
                    className="flex flex-col gap-4 p-5 bg-white dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition-shadow cursor-pointer"
                  >
                    <div className="flex justify-between items-start">
                      <h3 className="font-bold text-lg text-gray-800 dark:text-gray-100">
                        {session.title || `Session #${session.id}`}
                      </h3>

                      <span className="inline-flex items-center rounded-md bg-green-50 dark:bg-green-900/50 px-2 py-1 text-xs font-medium text-green-700 dark:text-green-300 ring-1 ring-inset ring-green-600/20 dark:ring-green-600/30">
                        {session.status}
                      </span>
                    </div>

                    <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
                      <div className="flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-base">calendar_today</span>
                        <span>
                          {new Date(session.created_at).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

          </div>
        </div>
      </div>
    </div>
  );
};

export default ProjectDetailsPage;