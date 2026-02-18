import { useState, useEffect, useMemo } from "react";
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

type MarkdownTextProps = {
  text: string;
  className?: string;
};

function formatMarkdownToHtml(text: string): string {
  if (!text) return "";
  let html = text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  html = html.replace(/```([\s\S]*?)```/g, (_, code: string) => {
    const trimmed = code.replace(/^\n+|\n+$/g, "");
    return `<pre class="rounded-md bg-muted px-3 py-2 text-[11px] overflow-x-auto"><code>${trimmed}</code></pre>`;
  });

  html = html.replace(
    /^### (.*)$/gm,
    '<h3 class="font-semibold mt-3 mb-1 text-xs">$1</h3>',
  );
  html = html.replace(
    /^## (.*)$/gm,
    '<h2 class="font-semibold mt-3 mb-1 text-xs">$1</h2>',
  );
  html = html.replace(
    /^# (.*)$/gm,
    '<h1 class="font-semibold mt-3 mb-1 text-xs">$1</h1>',
  );

  html = html.replace(/^\s*[-*] (.*)$/gm, '<li class="ml-4 list-disc">$1</li>');
  html = html.replace(/(<li[^>]*>.*<\/li>\s*)+/g, (match) => {
    return `<ul class="my-1">${match}</ul>`;
  });

  html = html.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  html = html.replace(
    /`([^`]+)`/g,
    '<code class="px-1 py-0.5 rounded bg-muted text-[11px]">$1</code>',
  );

  html = html.replace(/\n{2,}/g, "</p><p>");
  html = `<p>${html}</p>`;

  return html;
}

const MarkdownText = ({ text, className }: MarkdownTextProps) => {
  const html = useMemo(() => formatMarkdownToHtml(text), [text]);

  return (
    <div
      className={`prose prose-sm max-w-none break-words text-xs text-muted-foreground ${className ?? ""}`}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
};

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
                  <MarkdownText
                    text={entry.output}
                    className="mt-1 line-clamp-4"
                  />
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
            <MarkdownText text={response} className="mt-1 text-base" />
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
