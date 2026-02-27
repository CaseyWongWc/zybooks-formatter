import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { formatZybooksText } from "@/lib/zybooks-formatter";
import { Copy, Check, Trash2, FileText, ArrowRight } from "lucide-react";

export default function Home() {
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  const handleFormat = useCallback(() => {
    if (!input.trim()) {
      toast({
        title: "Nothing to format",
        description: "Paste some zyBooks content first.",
        variant: "destructive",
      });
      return;
    }
    const formatted = formatZybooksText(input);
    setOutput(formatted);
  }, [input, toast]);

  const handleCopy = useCallback(async () => {
    if (!output) return;
    try {
      await navigator.clipboard.writeText(output);
      setCopied(true);
      toast({ title: "Copied to clipboard" });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast({
        title: "Copy failed",
        description: "Your browser blocked clipboard access.",
        variant: "destructive",
      });
    }
  }, [output, toast]);

  const handleClear = useCallback(() => {
    setInput("");
    setOutput("");
    setCopied(false);
  }, []);

  const inputLineCount = input ? input.split("\n").length : 0;
  const outputLineCount = output ? output.split("\n").length : 0;

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <header className="border-b px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-md bg-primary flex items-center justify-center">
              <FileText className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-lg font-semibold leading-tight" data-testid="text-app-title">
                zyBooks Formatter
              </h1>
              <p className="text-xs text-muted-foreground leading-tight" data-testid="text-app-description">
                Clean zyBooks pastes into readable markdown
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleClear}
              disabled={!input && !output}
              data-testid="button-clear"
            >
              <Trash2 className="w-4 h-4 mr-1.5" />
              Clear
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1 p-6">
        <div className="max-w-7xl mx-auto flex flex-col h-full gap-4">
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto_1fr] gap-4 flex-1 min-h-0">
            <div className="flex flex-col gap-2 min-h-0">
              <div className="flex items-center justify-between gap-2">
                <label className="text-sm font-medium" htmlFor="input-area" data-testid="label-input">
                  Raw zyBooks Paste
                </label>
                <span className="text-xs text-muted-foreground" data-testid="text-input-lines">
                  {inputLineCount} lines
                </span>
              </div>
              <Textarea
                id="input-area"
                data-testid="input-raw-text"
                placeholder="Paste your zyBooks content here..."
                className="flex-1 min-h-[400px] lg:min-h-[600px] font-mono text-sm resize-none"
                value={input}
                onChange={(e) => setInput(e.target.value)}
              />
            </div>

            <div className="flex lg:flex-col items-center justify-center gap-2 py-2">
              <Button
                onClick={handleFormat}
                disabled={!input.trim()}
                data-testid="button-format"
                className="gap-1.5"
              >
                Format
                <ArrowRight className="w-4 h-4" />
              </Button>
            </div>

            <div className="flex flex-col gap-2 min-h-0">
              <div className="flex items-center justify-between gap-2">
                <label className="text-sm font-medium" htmlFor="output-area" data-testid="label-output">
                  Clean Markdown
                </label>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground" data-testid="text-output-lines">
                    {outputLineCount} lines
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleCopy}
                    disabled={!output}
                    data-testid="button-copy"
                  >
                    {copied ? (
                      <Check className="w-4 h-4 mr-1.5 text-green-500" />
                    ) : (
                      <Copy className="w-4 h-4 mr-1.5" />
                    )}
                    {copied ? "Copied" : "Copy"}
                  </Button>
                </div>
              </div>
              <Textarea
                id="output-area"
                data-testid="output-formatted-text"
                placeholder="Formatted output will appear here..."
                className="flex-1 min-h-[400px] lg:min-h-[600px] font-mono text-sm resize-none"
                value={output}
                readOnly
              />
            </div>
          </div>
        </div>
      </main>

      <footer className="border-t px-6 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between text-xs text-muted-foreground">
          <span data-testid="text-footer-info">Strips navigation, metadata, UI controls, and animation descriptions</span>
          <span data-testid="text-footer-preserves">Keeps participation &amp; challenge activity headers</span>
        </div>
      </footer>
    </div>
  );
}
