import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<div>AUTH OK</div>} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
