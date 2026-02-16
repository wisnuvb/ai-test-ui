import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Button,
  Alert,
  AlertDescription,
  Textarea,
  Input,
} from "../components/ui";
import { useAudio, useAPI, useHistory } from "../hooks";
import { apiService } from "../services/api";
import { Loading } from "../components/common/Loading";
import { Volume2, Play, Trash2, Download, Copy } from "lucide-react";

export const TTSPage = () => {
  const { playAudio, isPlaying } = useAudio();
  const { isLoading, error, execute, reset } = useAPI();
  const { history, addEntry, clearHistory } = useHistory();
  const [text, setText] = useState("");
  const [language, setLanguage] = useState("en");
  const [speaker, setSpeaker] = useState("default");
  const [audioURL, setAudioURL] = useState<string | null>(null);
  const [baseURL] = useState(
    localStorage.getItem("api-base-url") || "http://localhost:8000",
  );

  useEffect(() => {
    apiService.setBaseURL(baseURL);
  }, [baseURL]);

  useEffect(() => {
    return () => {
      if (audioURL && audioURL.startsWith("blob:")) {
        URL.revokeObjectURL(audioURL);
      }
    };
  }, [audioURL]);

  const handleSynthesize = async () => {
    if (!text.trim()) return;

    try {
      const result = await execute(() =>
        apiService.synthesize({
          text,
          language,
          speaker,
        }),
      );
      setAudioURL(result.audioUrl);
      addEntry({
        type: "tts",
        input: text,
        output: result.audioUrl,
        metadata: {
          language,
          speaker,
          duration: result.duration,
        },
      });
    } catch (err) {
      console.error("Synthesis failed:", err);
    }
  };

  const handlePlayAudio = () => {
    if (audioURL) {
      playAudio(audioURL);
    }
  };

  const handleCopyText = () => {
    navigator.clipboard.writeText(text);
  };

  const historyTTS = history.filter((entry) => entry.type === "tts");

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Input Section */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Text to Speech (Piper)</CardTitle>
            <CardDescription>Convert text to audio</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {/* Text Input */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Text to Synthesize</label>
              <Textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Enter text to convert to speech..."
                className="min-h-32"
              />
            </div>

            {/* Parameters */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Language</label>
                <select
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                  className="w-full px-3 py-2 border rounded-md text-sm bg-background"
                >
                  <option value="en">English</option>
                  <option value="es">Spanish</option>
                  <option value="fr">French</option>
                  <option value="de">German</option>
                  <option value="id">Indonesian</option>
                  <option value="zh">Chinese</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Speaker</label>
                <Input
                  type="text"
                  value={speaker}
                  onChange={(e) => setSpeaker(e.target.value)}
                  placeholder="default"
                />
              </div>
            </div>

            {/* Buttons */}
            <div className="flex gap-2">
              <Button
                onClick={handleSynthesize}
                disabled={isLoading || !text.trim()}
                className="gap-2 flex-1"
              >
                {isLoading ? (
                  <>
                    <Loading />
                    Synthesizing...
                  </>
                ) : (
                  <>
                    <Volume2 className="w-4 h-4" />
                    Synthesize
                  </>
                )}
              </Button>
              <Button
                onClick={() => {
                  setText("");
                  setAudioURL(null);
                  reset();
                }}
                variant="outline"
                size="icon"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* History Section */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">History</CardTitle>
            <CardDescription>Recent syntheses</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 max-h-96 overflow-y-auto">
            {historyTTS.length === 0 ? (
              <p className="text-sm text-muted-foreground">No syntheses yet</p>
            ) : (
              historyTTS.map((entry) => (
                <div
                  key={entry.id}
                  className="p-3 rounded-lg bg-muted text-sm space-y-1 hover:bg-muted/80 transition"
                >
                  <p className="font-medium line-clamp-2">{entry.input}</p>
                  <button
                    onClick={() => playAudio(entry.output)}
                    className="text-xs text-primary hover:underline"
                  >
                    Play Audio
                  </button>
                  <p className="text-xs text-muted-foreground">
                    {new Date(entry.timestamp).toLocaleTimeString()}
                  </p>
                </div>
              ))
            )}
            {historyTTS.length > 0 && (
              <Button
                onClick={clearHistory}
                variant="ghost"
                size="sm"
                className="w-full mt-4"
              >
                Clear History
              </Button>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Audio Playback Section */}
      {audioURL && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Audio Output</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-muted p-4 rounded-lg">
              <audio
                key={audioURL}
                controls
                className="w-full"
                src={audioURL}
              />
            </div>
            <div className="flex gap-2">
              <Button
                onClick={handlePlayAudio}
                variant="outline"
                className="gap-2 flex-1"
                disabled={isPlaying}
              >
                <Play className="w-4 h-4" />
                {isPlaying ? "Playing..." : "Play"}
              </Button>
              <Button
                onClick={() => {
                  const element = document.createElement("a");
                  element.setAttribute("href", audioURL);
                  element.setAttribute("download", `audio-${Date.now()}.wav`);
                  element.style.display = "none";
                  document.body.appendChild(element);
                  element.click();
                  document.body.removeChild(element);
                }}
                variant="outline"
                className="gap-2 flex-1"
              >
                <Download className="w-4 h-4" />
                Download
              </Button>
            </div>

            {/* Show input text */}
            <div className="mt-4 pt-4 border-t">
              <label className="text-sm font-medium mb-2 block">
                Input Text
              </label>
              <Textarea value={text} readOnly className="min-h-24 bg-muted" />
              <Button
                onClick={handleCopyText}
                variant="ghost"
                size="sm"
                className="mt-2 gap-2"
              >
                <Copy className="w-4 h-4" />
                Copy Text
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
