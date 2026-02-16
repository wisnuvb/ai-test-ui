/* eslint-disable @typescript-eslint/no-explicit-any */
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
import { Mic, Square, Play, Trash2, Download, Copy } from "lucide-react";

export const STTPage = () => {
  const {
    isRecording,
    recordedBlob,
    recordedURL,
    startRecording,
    stopRecording,
    playAudio,
    isPlaying,
    error: audioError,
    clearRecording,
  } = useAudio();
  const { isLoading, error, execute } = useAPI();
  const { history, addEntry, clearHistory } = useHistory();
  const [transcribedText, setTranscribedText] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [baseURL] = useState(
    localStorage.getItem("api-base-url") || "http://localhost:8000",
  );

  useEffect(() => {
    apiService.setBaseURL(baseURL);
  }, [baseURL]);

  const handleTranscribeRecording = async () => {
    if (!recordedBlob) return;

    try {
      const result = await execute(() =>
        apiService.transcribe(recordedBlob as any),
      );
      setTranscribedText(result.text);
      addEntry({
        type: "stt",
        input: "Audio Recording",
        output: result.text,
        metadata: {
          duration: result.duration,
          confidence: result.confidence,
        },
      });
    } catch (err) {
      console.error("Transcription failed:", err);
    }
  };

  const handleTranscribeFile = async () => {
    if (!selectedFile) return;

    try {
      const result = await execute(() => apiService.transcribe(selectedFile));
      setTranscribedText(result.text);
      addEntry({
        type: "stt",
        input: selectedFile.name,
        output: result.text,
        metadata: {
          duration: result.duration,
          confidence: result.confidence,
        },
      });
    } catch (err) {
      console.error("Transcription failed:", err);
    }
  };

  const handleCopyText = () => {
    navigator.clipboard.writeText(transcribedText);
  };

  const historySTT = history.filter((entry) => entry.type === "stt");

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recording Section */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Speech to Text (Whisper)</CardTitle>
            <CardDescription>
              Record audio or upload file to transcribe
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {(audioError || error) && (
              <Alert variant="destructive">
                <AlertDescription>{audioError || error}</AlertDescription>
              </Alert>
            )}

            {/* Recording Controls */}
            <div className="space-y-4">
              <div className="flex gap-2">
                {!isRecording ? (
                  <Button
                    onClick={startRecording}
                    variant="default"
                    className="gap-2 flex-1"
                  >
                    <Mic className="w-4 h-4" />
                    Start Recording
                  </Button>
                ) : (
                  <Button
                    onClick={stopRecording}
                    variant="destructive"
                    className="gap-2 flex-1"
                  >
                    <Square className="w-4 h-4" />
                    Stop Recording
                  </Button>
                )}
              </div>

              {recordedURL && (
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">
                    Recorded Audio:
                  </p>
                  <div className="flex gap-2">
                    <Button
                      onClick={() => playAudio(recordedURL)}
                      variant="outline"
                      className="gap-2 flex-1"
                      disabled={isPlaying}
                    >
                      <Play className="w-4 h-4" />
                      {isPlaying ? "Playing..." : "Play Recording"}
                    </Button>
                    <Button
                      onClick={clearRecording}
                      variant="ghost"
                      size="icon"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              )}
            </div>

            {/* File Upload */}
            <div className="border-t pt-6">
              <label className="text-sm font-medium mb-2 block">
                Or upload audio file:
              </label>
              <div className="flex gap-2">
                <Input
                  type="file"
                  accept="audio/*"
                  onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                  className="flex-1"
                />
                {selectedFile && (
                  <Button
                    onClick={() => setSelectedFile(null)}
                    variant="ghost"
                    size="icon"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                )}
              </div>
              {selectedFile && (
                <p className="text-xs text-muted-foreground mt-2">
                  Selected: {selectedFile.name}
                </p>
              )}
            </div>

            {/* Transcribe Buttons */}
            <div className="flex gap-2 pt-4">
              {recordedBlob && (
                <Button
                  onClick={handleTranscribeRecording}
                  disabled={isLoading}
                  className="flex-1"
                >
                  {isLoading ? <Loading /> : "Transcribe Recording"}
                </Button>
              )}
              {selectedFile && (
                <Button
                  onClick={handleTranscribeFile}
                  disabled={isLoading}
                  className="flex-1"
                >
                  {isLoading ? <Loading /> : "Transcribe File"}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* History Section */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">History</CardTitle>
            <CardDescription>Recent transcriptions</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 max-h-96 overflow-y-auto">
            {historySTT.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No transcriptions yet
              </p>
            ) : (
              historySTT.map((entry) => (
                <div
                  key={entry.id}
                  className="p-3 rounded-lg bg-muted text-sm space-y-1 hover:bg-muted/80 transition"
                >
                  <p className="font-medium">{entry.input}</p>
                  <p className="text-xs text-muted-foreground line-clamp-2">
                    {entry.output}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(entry.timestamp).toLocaleTimeString()}
                  </p>
                </div>
              ))
            )}
            {historySTT.length > 0 && (
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

      {/* Results Section */}
      {transcribedText && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Transcription Result</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Textarea
              value={transcribedText}
              onChange={(e) => setTranscribedText(e.target.value)}
              className="min-h-32"
              placeholder="Transcribed text will appear here"
            />
            <div className="flex gap-2">
              <Button
                onClick={handleCopyText}
                variant="outline"
                className="gap-2 flex-1"
              >
                <Copy className="w-4 h-4" />
                Copy Text
              </Button>
              <Button
                onClick={() => {
                  const element = document.createElement("a");
                  element.setAttribute(
                    "href",
                    "data:text/plain;charset=utf-8," +
                      encodeURIComponent(transcribedText),
                  );
                  element.setAttribute("download", "transcription.txt");
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
          </CardContent>
        </Card>
      )}
    </div>
  );
};
