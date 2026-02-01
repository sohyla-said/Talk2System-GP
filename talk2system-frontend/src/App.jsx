import { BrowserRouter } from "react-router-dom";
import AppRoutes from "./routes/AppRoutes";

export default function App() {
  console.log("App component rendering");
  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  );
}
