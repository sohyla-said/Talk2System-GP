// src/routes/AppRoutes.jsx
import AppLayout from "../components/layout/AppLayout";
import { Routes, Route } from "react-router-dom";
import SrsPage from "../pages/srs/SRSPage";
import UMLPage from "../pages/uml/UMLPage"; 
import Home from "../pages/Home";
import TranscriptPage from "../pages/transcript/TranscriptPage";
import ProjectDetailsPage from "../pages/projectdetails/ProjectDetailsPage"; // ← ADD THIS LINE
import RecordingSessionPage from "../pages/recordingsession/RecordingSessionPage";

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
      </Routes>
    </AppLayout>
  );
}
