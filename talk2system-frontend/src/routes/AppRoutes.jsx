import { Routes, Route } from "react-router-dom";

import AppLayout from "../components/layout/AppLayout";
import AuthLayout from "../components/layout/AuthLayout";

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

// Recording & Transcript
import RecordingSession from "../pages/recordingsession/RecordingSessionPage";
import TranscriptView from "../pages/transcript/TranscriptPage";
import TranscriptSummary from "../pages/transcript/Summary";

// Requirements & Artifacts
import RequirementsView from "../pages/requirements/RequirementsView";
import SRSDocument from "../pages/artifacts/SrsPage";
import UMLDiagrams from "../pages/artifacts/UmlPage";

// Results
import Results from "../pages/results/Results";

export default function AppRoutes() {
  return (
    <Routes>
      {/* Public */}
      <Route element={<AuthLayout />}>
        <Route path="/" element={<Home />} />
      </Route>
      

      {/* Auth */}
      <Route element={<AuthLayout />}>
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/pending-approval" element={<PendingApproval />} />
        <Route path="/role-approval" element={<RoleApproval />} />
      </Route>

      {/* App */}
      <Route element={<AppLayout />}>
        <Route path="/dashboard" element={<Dashboard />} />

        <Route path="/projects">
          <Route index element={<ProjectsPage />} />
          <Route path="new" element={<AddProject />} />
          <Route path=":id" element={<ProjectDetails />} />
          <Route path=":id/add-participant" element={<AddParticipant />} />
          <Route path="empty" element={<EmptyProjectsPage />} />
        </Route>

        <Route path="/recording" element={<RecordingSession />} />

        <Route path="/transcript">
          <Route index element={<TranscriptView />} />
          <Route path="summary" element={<TranscriptSummary />} />
        </Route>

        <Route path="/requirements" element={<RequirementsView />} />
        <Route path="/artifacts/srs" element={<SRSDocument />} />
        <Route path="/artifacts/uml" element={<UMLDiagrams />} />

        <Route path="/results" element={<Results />} />
        
      </Route>
    </Routes>
  );
}
