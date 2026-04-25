import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

import AppLayout from "../components/layout/AppLayout";
import AuthLayout from "../components/layout/AuthLayout";
import { isLoggedIn, getCurrentUser } from "../api/authApi";

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
import PMNotificationsPage from "../pages/projects/PMNotificationsPage";
import AdminAddProject from "../pages/projects/AdminAddProjectPage";
import AdminSystemProjectsPage from "../pages/projects/AdminSystemProjectsPage"; 
import AllUsersPage from "../pages/admin/AllUsersPage";

//sessions
// import SessionDetailsPage from "../pages/sessions/SessionDetailsPage";
// Recording & Transcript
import RecordingSession from "../pages/recordingsession/RecordingSessionPage";
import TranscriptInput from "../pages/recordingsession/TranscriptInputPage"
import TranscriptView from "../pages/transcript/TranscriptPage";
import TranscriptSummary from "../pages/transcript/Summary";

// Requirements & Artifacts
import RequirementsSessionView from "../pages/requirements/Requirements_session_view";
import RequirementsProjectView from "../pages/requirements/Requirements_project_view";
import RequirementsChoicePage from "../pages/requirements/Requirements_choice_page";
import SRSDocument from "../pages/artifacts/SrsPage";
import UMLDiagrams from "../pages/artifacts/UmlPage";
import UmlProjectViewPage from "../pages/artifacts/UmlProjectView";
import UmlSessionViewPage from "../pages/artifacts/UmlSessionView";
import ProjectResults from "../pages/results/ProjectResults";
import SessionResults from "../pages/results/SessionResults";

// If not logged in → redirect to /login
// If logged in → render the page
function ProtectedRoute({ children }) {
  if (!isLoggedIn()) {
    return <Navigate to="/login" replace />;
  }
  return children;
}

//  Auth guard 
// If already logged in → redirect to /dashboard (no need to see login again)
function GuestRoute({ children }) {
  if (isLoggedIn()) {
    return <Navigate to="/dashboard" replace />;
  }
  return children;
}

export default function AppRoutes() {
  return (
    <Routes>
      {/* Public */}
      <Route element={<AuthLayout />}>
        <Route path="/" element={<Home />} />
      </Route>
      

       {/* Auth pages */}
      <Route element={<AuthLayout />}>
        <Route path="/login" element={
          <GuestRoute><Login /></GuestRoute>      
        } />
        <Route path="/signup" element={
          <GuestRoute><Signup /></GuestRoute>     
        } />
        <Route path="/pending-approval" element={<PendingApproval />} />
        <Route path="/role-approval" element={
          <ProtectedRoute><RoleApproval /></ProtectedRoute>  
        } />
      </Route>
      
      {/* Protected app pages — redirect to /login if not logged in */}
      <Route element={
        <ProtectedRoute><AppLayout /></ProtectedRoute>
      }></Route>
      <Route path="/notifications" element={<PMNotificationsPage />} />

      {/* App */}
      <Route element={<AppLayout />}>
        <Route path="/dashboard" element={<Dashboard />} />
       
        <Route path="/admin/all-users" element={<AllUsersPage />} />

        <Route path="/projects">
          <Route index element={<ProjectsPage />} />
          <Route path="system-projects" element={<AdminSystemProjectsPage />} />
          <Route path="new" element={<AddProject />} />
          <Route path="new-admin" element={<AdminAddProject />} />
          <Route path="new" element={<AddProject />} />
          <Route path=":id" element={<ProjectDetails />} />
          <Route path=":id/add-participant" element={<AddParticipant />} />
          <Route path="empty" element={<EmptyProjectsPage />} />
          <Route path=":id/recording" element={<RecordingSession />} />
          <Route path=":id/transcript-input" element={<TranscriptInput />} />
          <Route path=":id/requirements" element={<RequirementsProjectView />} />
          <Route path=":id/artifacts/srs" element={<SRSDocument />} />
          <Route path=":id/artifacts/uml" element={<UMLDiagrams />} />
          <Route path=":id/results" element={<ProjectResults />} />
          <Route path=":id/artifacts/uml-view" element={<UmlProjectViewPage />} />
        </Route>


        <Route path="/transcript">
          <Route path=":sessionId" element={<TranscriptView />} />
          <Route path=":sessionId/requirements" element={<RequirementsSessionView />} />
          <Route path=":sessionId/requirements/choice" element={<RequirementsChoicePage />} />
        </Route>

        <Route path="/projects/:projectId/sessions/:sessionId">
          <Route path="artifacts" element={<SessionResults />} />
          <Route path="artifacts/uml" element={<UmlSessionViewPage />} />
        </Route>

        {/* <Route path="/requirements" element={<RequirementsView />} /> */}
        
        {/* Summary */}
        <Route path="/summary/:sessionId" element={<TranscriptSummary />} />
        
        {/* <Route path=":projectId/sessions/:sessionId" element={<SessionDetailsPage />} /> */}     
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
