import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Navbar } from "./components/common/Navbar";
import { STTPage } from "./pages/STTPage";
import { LLMPage } from "./pages/LLMPage";
import { TTSPage } from "./pages/TTSPage";
import { GesturePage } from "./pages/GesturePage";
import { QRCodePage } from "./pages/QRCodePage";
import "./index.css";

function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <main className="flex-1">
          <Routes>
            <Route path="/stt" element={<STTPage />} />
            <Route path="/llm" element={<LLMPage />} />
            <Route path="/tts" element={<TTSPage />} />
            <Route path="/gesture" element={<GesturePage />} />
            <Route path="/qr" element={<QRCodePage />} />
            <Route path="/" element={<Navigate to="/stt" replace />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}

export default App;
