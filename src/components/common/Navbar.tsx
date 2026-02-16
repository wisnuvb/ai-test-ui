import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Button } from "../ui";
import {
  Mic,
  MessageSquare,
  Volume2,
  Settings,
  PenTool,
  QrCode,
} from "lucide-react";

export const Navbar = () => {
  const location = useLocation();
  const [serverStatus, setServerStatus] = useState<"online" | "offline">(
    "offline",
  );
  const [showSettings, setShowSettings] = useState(false);

  const isActive = (path: string) => location.pathname === path;

  return (
    <nav className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          <div className="flex items-center gap-8">
            <div className="flex items-center gap-2 font-bold text-lg">
              <span>🤖 Gurubot AI Test</span>
            </div>
            <div className="flex gap-2">
              <Link to="/stt">
                <Button
                  variant={isActive("/stt") ? "default" : "ghost"}
                  size="sm"
                  className="gap-2"
                >
                  <Mic className="w-4 h-4" />
                  STT
                </Button>
              </Link>
              <Link to="/tts">
                <Button
                  variant={isActive("/tts") ? "default" : "ghost"}
                  size="sm"
                  className="gap-2"
                >
                  <Volume2 className="w-4 h-4" />
                  TTS
                </Button>
              </Link>
              <Link to="/llm">
                <Button
                  variant={isActive("/llm") ? "default" : "ghost"}
                  size="sm"
                  className="gap-2"
                >
                  <MessageSquare className="w-4 h-4" />
                  LLM
                </Button>
              </Link>
              <Link to="/gesture">
                <Button
                  variant={isActive("/gesture") ? "default" : "ghost"}
                  size="sm"
                  className="gap-2"
                >
                  <PenTool className="w-4 h-4" />
                  Gesture
                </Button>
              </Link>
              <Link to="/qr">
                <Button
                  variant={isActive("/qr") ? "default" : "ghost"}
                  size="sm"
                  className="gap-2"
                >
                  <QrCode className="w-4 h-4" />
                  QR Code
                </Button>
              </Link>
            </div>
          </div>

          <div className="flex items-center gap-4 hidden">
            <div className="flex items-center gap-2">
              <div
                className={`w-3 h-3 rounded-full ${
                  serverStatus === "online" ? "bg-green-500" : "bg-red-500"
                }`}
              />
              <span className="text-sm text-muted-foreground">
                {serverStatus === "online" ? "Online" : "Offline"}
              </span>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowSettings(!showSettings)}
            >
              <Settings className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      {showSettings && (
        <div className="border-t bg-muted/50 px-4 py-4">
          <ServerSettings
            onClose={() => setShowSettings(false)}
            onStatusChange={setServerStatus}
          />
        </div>
      )}
    </nav>
  );
};

interface ServerSettingsProps {
  onClose: () => void;
  onStatusChange: (status: "online" | "offline") => void;
}

const ServerSettings = ({ onClose, onStatusChange }: ServerSettingsProps) => {
  const [baseURL, setBaseURL] = useState(
    localStorage.getItem("api-base-url") || "http://localhost:8000",
  );

  const handleSave = async () => {
    localStorage.setItem("api-base-url", baseURL);
    // Test connection
    try {
      const controller = new AbortController();
      const id = window.setTimeout(() => controller.abort(), 5000);
      const response = await fetch(`${baseURL}/health`, {
        signal: controller.signal,
      });
      window.clearTimeout(id);
      onStatusChange(response.ok ? "online" : "offline");
    } catch {
      onStatusChange("offline");
    }
    onClose();
  };

  return (
    <div className="max-w-md">
      <label className="text-sm font-medium">Server Base URL</label>
      <div className="flex gap-2 mt-2">
        <input
          type="text"
          value={baseURL}
          onChange={(e) => setBaseURL(e.target.value)}
          placeholder="http://localhost:8000"
          className="flex-1 px-3 py-2 border rounded-md text-sm"
        />
        <Button size="sm" onClick={handleSave}>
          Save
        </Button>
      </div>
    </div>
  );
};
