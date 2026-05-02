import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useState, useEffect } from "react";
import AppLayout from "../components/layout/AppLayout";
import AuthLayout from "../components/layout/AuthLayout";
import { isLoggedIn, getCurrentUser } from "../api/authApi";
import NotificationsPage from "../notifications/NotificationsPage";

// Pages
import Home from "../pages/Home";

// Auth
import Login from "../pages/auth/LoginPage";
import Signup from "../pages/auth/SignupPage";
import PendingApproval from "../pages/auth/PendingApprovalPage";
import RoleApproval from "../pages/auth/role-approval";

// Dashboard
import Dashboard from "../pages/dashboard/DashboardPage";

// Projects
import ProjectsPage from "../pages/projects/ProjectsPage";
import ProjectDetails from "../pages/projects/ProjectDetailsPage";
import AddProject from "../pages/projects/AddProjectDetailsPage";
import AddParticipant from "../pages/projects/AddParticipantPage";
import EmptyProjectsPage from "../pages/projects/EmptyProjectsPage";
import AdminAddProject from "../pages/projects/AdminAddProjectPage";
import AdminSystemProjectsPage from "../pages/projects/AdminSystemProjectsPage"; 
import AllUsersPage from "../pages/admin/AllUsersPage";

//sessions
import SessionDetailsPage from "../pages/sessions/SessionDetailsPage";
import StartSessionPage from "../pages/Sessions/StartSessionPage";
// Recording & Transcript
import RecordingSession from "../pages/recordingsession/RecordingSessionPage";
import TranscriptInput from "../pages/recordingsession/TranscriptInputPage"
import TranscriptView from "../pages/transcript/TranscriptPage";
import TranscriptSummary from "../pages/transcript/Summary";

// Requirements & Artifacts
import RequirementsSessionView from "../pages/requirements/Requirements_session_view";
import RequirementsProjectView from "../pages/requirements/Requirements_project_view";
import RequirementsChoicePage from "../pages/requirements/Requirements_choice_page";
import SrsPage from "../pages/artifacts/SrsPage";
import SrsProjectView from "../pages/artifacts/SrsProjectView";
import SrsSessionView from "../pages/artifacts/SrsSessionView";
import UmlPage from "../pages/artifacts/UmlPage";
import UmlProjectViewPage from "../pages/artifacts/UmlProjectView";
import UmlSessionViewPage from "../pages/artifacts/UmlSessionView";
import ProjectResults from "../pages/results/ProjectResults";
import SessionResults from "../pages/results/SessionResults";

function ProtectedRoute({ children, requireAdmin = false }) {
  const user = getCurrentUser(); 
  
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (requireAdmin && user.role !== "admin") {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}

function GuestRoute({ children }) {
  const user = getCurrentUser(); 
  
  if (user) {
    return <Navigate to="/dashboard" replace />;
  }
  return children;
}

export default function AppRoutes() {
  const [, setTick] = useState(0);

  useEffect(() => {
    // Check token every 60 seconds
    const interval = setInterval(() => {
      setTick((t) => t + 1);
    }, 60000);

    return () => clearInterval(interval);
  }, []);

  return (
    <Routes>
      <Route path="/" element={<Home />} />


       {/* Auth pages */}
      <Route element={<AuthLayout />}>
        <Route path="/login" element={
          <GuestRoute><Login /></GuestRoute>      
        } />
        <Route path="/signup" element={
          <GuestRoute><Signup /></GuestRoute>     
        } />
        <Route path="/pending-approval" element={<PendingApproval />} />
      </Route>
      <Route path="/role-approval" element={
          <ProtectedRoute><RoleApproval /></ProtectedRoute>  
        } />
      {/* Protected app pages — redirect to /login if not logged in */}
      <Route element={
        <ProtectedRoute><AppLayout /></ProtectedRoute>
      }></Route>

      {/* App */}
      <Route element={<AppLayout />}>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/notifications" element={<NotificationsPage />} />
        <Route path="/admin/all-users" element={
          <ProtectedRoute requireAdmin><AllUsersPage /></ProtectedRoute>
        } />

        <Route path="/projects">
          <Route index element={<ProjectsPage />} />
          <Route path="system-projects" element={
            <ProtectedRoute requireAdmin><AdminSystemProjectsPage /></ProtectedRoute>
          } />
          <Route path="new" element={<AddProject />} />
          <Route path="new-admin" element={<AdminAddProject />} />
          <Route path="new" element={<AddProject />} />
          <Route path=":id" element={<ProjectDetails />} />
          <Route path=":id/add-participant" element={<AddParticipant />} />
          <Route path="empty" element={<EmptyProjectsPage />} />
          <Route path=":id/recording" element={<RecordingSession />} />
          <Route path=":id/transcript-input" element={<TranscriptInput />} />
          <Route path=":id/requirements" element={<RequirementsProjectView />} />
          <Route path=":id/srs/generate" element={<SrsPage />} />
          <Route path=":id/sessions/:sessionId/srs/generate" element={<SrsPage />} />
          <Route path=":id/artifacts/srs" element={<SrsProjectView />} />
          <Route path=":id/artifacts/uml" element={<UmlPage />} />
          <Route path=":id/results" element={<ProjectResults />} />
          <Route path=":id/artifacts/uml-view" element={<UmlProjectViewPage />} />
          <Route path=":id/start-session" element={<StartSessionPage />} />
        </Route>


        <Route path="/transcript">
          <Route path=":sessionId" element={<TranscriptView />} />
          <Route path=":sessionId/requirements" element={<RequirementsSessionView />} />
          <Route path=":sessionId/requirements/choice" element={<RequirementsChoicePage />} />
        </Route>

        <Route path="/projects/:projectId/sessions/:sessionId" >
          <Route path="sessiondetails" element={<SessionDetailsPage/>}/>
          <Route path="artifacts" element={<SessionResults />} />
          <Route path="artifacts/uml" element={<UmlSessionViewPage />} />
          <Route path="artifacts/srs" element={<SrsSessionView />} />
        </Route>
        
        {/* Summary */}
        <Route path="/summary/:sessionId" element={<TranscriptSummary />} />
      </Route>
      {/* Catch-all */}
      <Route path="*" element={
        isLoggedIn()
          ? <Navigate to="/dashboard" replace />
          : <Navigate to="/login" replace />
      } />

    </Routes>
    
  );
}
