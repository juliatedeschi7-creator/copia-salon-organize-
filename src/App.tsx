import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { SalonProvider } from "@/contexts/SalonContext";

export default function App() {
  return (
    <AuthProvider>
      <SalonProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<div>AUTH + SALON OK</div>} />
          </Routes>
        </BrowserRouter>
      </SalonProvider>
    </AuthProvider>
  );
}
