import { BrowserRouter, Routes, Route } from "react-router-dom";
import "bootstrap/dist/css/bootstrap.min.css";
import Login from "./pages/Login/Login";
import { AuthContextProvider } from "./context/AuthContext";
import GenerateQR from "./components/GenerateQr.jsx";
import ScanQR from "./components/ScanAttendance.jsx";

function App() {
  return (
    <BrowserRouter>
      <AuthContextProvider>
        <Routes>
          <Route path="/loginEmployee" element={<Login />} />
          <Route path="/generate-qr" element={<GenerateQR />} />
          <Route path="/scan-qr" element={<ScanQR />} />
        </Routes>
      </AuthContextProvider>
    </BrowserRouter>
  );
}

export default App;