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
import { useAPI, useHistory } from "../hooks";
import { apiService } from "../services/api";
import { Loading } from "../components/common/Loading";
import { Send, Copy, Download, RotateCcw } from "lucide-react";

export const LLMPage = () => {
  const { isLoading, error, execute, reset } = useAPI();
  const { history, addEntry, clearHistory } = useHistory();
  const [prompt, setPrompt] = useState("");
  const [response, setResponse] = useState("");
  const [temperature, setTemperature] = useState(0.7);
  const [maxTokens, setMaxTokens] = useState(2048);
  const [baseURL] = useState(
    localStorage.getItem("api-base-url") || "http://localhost:8000",
  );

  useEffect(() => {
    apiService.setBaseURL(baseURL);
  }, [baseURL]);

  const handleGenerateResponse = async () => {
    if (!prompt.trim()) return;

    try {
      const result = await execute(() =>
        apiService.generateResponse({
          prompt,
          temperature,
          max_tokens: maxTokens,
        }),
      );
      setResponse(result.response);
      addEntry({
        type: "llm",
        input: prompt,
        output: result.response,
        metadata: {
          temperature,
          maxTokens,
          tokensUsed: result.tokens_used,
        },
      });
    } catch (err) {
      console.error("Generation failed:", err);
    }
  };

  const handleCopyResponse = () => {
    navigator.clipboard.writeText(response);
  };

  const handleClear = () => {
    setPrompt("");
    setResponse("");
    reset();
  };

  const historyLLM = history.filter((entry) => entry.type === "llm");

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Input Section */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Large Language Model (Qwen)</CardTitle>
            <CardDescription>
              Generate text responses from prompts
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {/* Prompt Input */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Prompt</label>
              <Textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Enter your prompt here..."
                className="min-h-32"
              />
            </div>

            {/* Parameters */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Temperature</label>
                <div className="flex items-center gap-2">
                  <input
                    type="range"
                    min="0"
                    max="2"
                    step="0.1"
                    value={temperature}
                    onChange={(e) => setTemperature(parseFloat(e.target.value))}
                    className="flex-1"
                  />
                  <span className="text-sm font-mono w-10">
                    {temperature.toFixed(1)}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Lower = more deterministic, Higher = more creative
                </p>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Max Tokens</label>
                <Input
                  type="number"
                  min="1"
                  max="4096"
                  value={maxTokens}
                  onChange={(e) => setMaxTokens(parseInt(e.target.value))}
                />
              </div>
            </div>

            {/* Buttons */}
            <div className="flex gap-2">
              <Button
                onClick={handleGenerateResponse}
                disabled={isLoading || !prompt.trim()}
                className="gap-2 flex-1"
              >
                {isLoading ? (
                  <>
                    <Loading />
                    Generating...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    Generate Response
                  </>
                )}
              </Button>
              <Button onClick={handleClear} variant="outline" size="icon">
                <RotateCcw className="w-4 h-4" />
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* History Section */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">History</CardTitle>
            <CardDescription>Recent generations</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 max-h-96 overflow-y-auto">
            {historyLLM.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No generations yet
              </p>
            ) : (
              historyLLM.map((entry) => (
                <div
                  key={entry.id}
                  className="p-3 rounded-lg bg-muted text-sm space-y-1 hover:bg-muted/80 transition cursor-pointer"
                  onClick={() => {
                    setPrompt(entry.input);
                    setResponse(entry.output);
                  }}
                >
                  <p className="font-medium line-clamp-2">{entry.input}</p>
                  <p className="text-xs text-muted-foreground">
                    {entry.output}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(entry.timestamp).toLocaleTimeString()}
                  </p>
                </div>
              ))
            )}
            {historyLLM.length > 0 && (
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

      {/* Response Section */}
      {response && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Response</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Textarea
              value={response}
              onChange={(e) => setResponse(e.target.value)}
              className="min-h-40"
              placeholder="Response will appear here"
            />
            <div className="flex gap-2">
              <Button
                onClick={handleCopyResponse}
                variant="outline"
                className="gap-2 flex-1"
              >
                <Copy className="w-4 h-4" />
                Copy Response
              </Button>
              <Button
                onClick={() => {
                  const element = document.createElement("a");
                  element.setAttribute(
                    "href",
                    "data:text/plain;charset=utf-8," +
                      encodeURIComponent(response),
                  );
                  element.setAttribute("download", "response.txt");
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
