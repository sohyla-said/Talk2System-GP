// src/routes/AppRoutes.jsx
import AppLayout from "../components/layout/AppLayout";
import { Routes, Route } from "react-router-dom";
import SrsPage from "../pages/srs/SRSPage";
import UMLPage from "../pages/uml/UMLPage"; 
import Home from "../pages/Home";

export default function AppRoutes() {
  return (
    <AppLayout>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/srs" element={<SrsPage />} />
        <Route path="/uml" element={<UMLPage />} />
      </Routes>
    </AppLayout>
  );
}
