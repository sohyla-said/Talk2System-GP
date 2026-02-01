// src/routes/AppRoutes.jsx
import AppLayout from "../components/layout/AppLayout";
import { Routes, Route } from "react-router-dom";
import SrsPage from "../pages/srs/SRSPage";
import UMLPage from "../pages/uml/UmlPage";
import Home from "../pages/Home";
import TranscriptPage from "../pages/transcript/TranscriptPage";
import ProjectDetailsPage from "../pages/projectdetails/ProjectDetailsPage"; 
import RecordingSessionPage from "../pages/recordingsession/RecordingSessionPage";
import EmptyProjectsPage from  "../pages/emptyprojects/EmptyProjectsPage"; 
import DashboardPage from "../pages/Dashboard/DashboardPage";
import ProjectsPage from "../pages/Projects/ProjectsPage";
import AddProjectDetailsPage from "../pages/AddProjectDetails/AddProjectDetailsPage";
import SignupPage from "../pages/Signup/SignupPage";
import LoginPage from "../pages/login/LoginPage";
import PendingApprovalPage from "../pages/UserRoleApproval/PendingApprovalPage";
import RoleApprovalPage from "../pages/UserRoleApproval/role-approval";
export default function AppRoutes() {
  return (
    <AppLayout>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/srs" element={<SrsPage />} />
        <Route path="/uml" element={<UMLPage />} />
        <Route path="/transcript" element={<TranscriptPage />} />
        <Route path="/project-details" element={<ProjectDetailsPage />} />
        <Route path="/recording-session" element={<RecordingSessionPage />} />
        <Route path="/emptyprojects" element={<EmptyProjectsPage />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/projects" element={<ProjectsPage />} />
        <Route path="/add-project-details" element={<AddProjectDetailsPage />} />
        <Route path="/signup" element={<SignupPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/pending-approval" element={<PendingApprovalPage />} />
        <Route path="/role-approval" element={<RoleApprovalPage />} />
      </Routes>
    </AppLayout>
  );
}
