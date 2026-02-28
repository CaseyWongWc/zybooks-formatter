import { useState, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { formatZybooksText } from "@/lib/zybooks-formatter";
import type { PasteMode } from "@/lib/zybooks-formatter";
import {
  markdownToNotebook,
  downloadNotebook,
  generateFilename,
} from "@/lib/notebook-generator";
import { Copy, Check, Trash2, FileText, ArrowRight, Download, ExternalLink, Loader2, Send, X, ChevronDown } from "lucide-react";
import { SiNotion } from "react-icons/si";

export default function Home() {
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");
  const [copied, setCopied] = useState(false);
  const [colabLoading, setColabLoading] = useState(false);
  const [notionLoading, setNotionLoading] = useState(false);
  const [notionModalOpen, setNotionModalOpen] = useState(false);
  const [notionPages, setNotionPages] = useState<{ id: string; title: string }[]>([]);
  const [selectedParentPage, setSelectedParentPage] = useState<string>("");
  const [notionPagesLoading, setNotionPagesLoading] = useState(false);
  const [pasteMode, setPasteMode] = useState<PasteMode>("regular");
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
    const formatted = formatZybooksText(input, pasteMode);
    setOutput(formatted);
  }, [input, pasteMode, toast]);

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

  const handleDownloadNotebook = useCallback(() => {
    if (!output.trim()) return;
    try {
      const notebook = markdownToNotebook(output);
      const filename = generateFilename(output);
      downloadNotebook(notebook, filename);
      toast({ title: "Notebook downloaded", description: filename });
    } catch {
      toast({
        title: "Generation failed",
        description: "Could not create notebook file.",
        variant: "destructive",
      });
    }
  }, [output, toast]);

  const handleOpenInColab = useCallback(async () => {
    if (!output.trim()) return;
    setColabLoading(true);
    try {
      const notebook = markdownToNotebook(output);
      const filename = generateFilename(output);
      const res = await fetch("/api/create-colab-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notebook, filename }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to create gist");
      }
      window.open(data.colabUrl, "_blank");
      toast({ title: "Opening in Colab", description: "Notebook gist created" });
    } catch (err: any) {
      toast({
        title: "Could not open in Colab",
        description: err.message || "Failed to create GitHub Gist",
        variant: "destructive",
      });
    } finally {
      setColabLoading(false);
    }
  }, [output, toast]);

  const loadNotionPages = useCallback(async () => {
    setNotionPagesLoading(true);
    try {
      const res = await fetch("/api/notion/pages");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setNotionPages(data.pages || []);
    } catch (err: any) {
      toast({
        title: "Could not load Notion pages",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setNotionPagesLoading(false);
    }
  }, [toast]);

  const handleNotionOpen = useCallback(() => {
    if (!output.trim()) return;
    setNotionModalOpen(true);
    loadNotionPages();
  }, [output, loadNotionPages]);

  const handleSendToNotion = useCallback(async () => {
    if (!output.trim()) return;
    setNotionLoading(true);
    try {
      const titleMatch = output.match(/^#\s+(.+)$/m);
      const title = titleMatch ? titleMatch[1].trim() : "zyBooks Section";
      const res = await fetch("/api/notion/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          markdown: output,
          title,
          parentPageId: selectedParentPage || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setNotionModalOpen(false);
      toast({ title: "Sent to Notion!", description: "Page created successfully." });
      if (data.pageUrl) {
        window.open(data.pageUrl, "_blank");
      }
    } catch (err: any) {
      toast({
        title: "Failed to send to Notion",
        description: err.message || "Check your Notion connection.",
        variant: "destructive",
      });
    } finally {
      setNotionLoading(false);
    }
  }, [output, selectedParentPage, toast]);

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
                Clean zyBooks pastes into markdown &amp; Colab notebooks
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
                <div className="flex items-center gap-2">
                  <div className="flex rounded-md border border-input overflow-hidden text-xs" data-testid="toggle-paste-mode">
                    <button
                      type="button"
                      onClick={() => setPasteMode("regular")}
                      className={`px-3 py-1.5 transition-colors ${
                        pasteMode === "regular"
                          ? "bg-primary text-primary-foreground"
                          : "bg-background text-muted-foreground hover:bg-muted"
                      }`}
                      data-testid="button-mode-regular"
                    >
                      Regular Paste
                    </button>
                    <button
                      type="button"
                      onClick={() => setPasteMode("markdown")}
                      className={`px-3 py-1.5 transition-colors border-l border-input ${
                        pasteMode === "markdown"
                          ? "bg-primary text-primary-foreground"
                          : "bg-background text-muted-foreground hover:bg-muted"
                      }`}
                      data-testid="button-mode-markdown"
                    >
                      Copy as Markdown
                    </button>
                  </div>
                  <span className="text-xs text-muted-foreground" data-testid="text-input-lines">
                    {inputLineCount} lines
                  </span>
                </div>
              </div>
              <Textarea
                id="input-area"
                data-testid="input-raw-text"
                placeholder={
                  pasteMode === "regular"
                    ? "Paste your zyBooks content here (Ctrl+A, Ctrl+C from zyBooks)..."
                    : "Paste content from the 'Copy as Markdown' browser extension..."
                }
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
                <div className="flex items-center gap-2 flex-wrap">
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
                  <Button
                    variant="default"
                    size="sm"
                    onClick={handleDownloadNotebook}
                    disabled={!output}
                    data-testid="button-download-notebook"
                  >
                    <Download className="w-4 h-4 mr-1.5" />
                    Download .ipynb
                  </Button>
                  <Button
                    variant="default"
                    size="sm"
                    onClick={handleOpenInColab}
                    disabled={!output || colabLoading}
                    data-testid="button-open-colab"
                  >
                    {colabLoading ? (
                      <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
                    ) : (
                      <ExternalLink className="w-4 h-4 mr-1.5" />
                    )}
                    {colabLoading ? "Creating..." : "Open in Colab"}
                  </Button>
                  <Button
                    variant="default"
                    size="sm"
                    onClick={handleNotionOpen}
                    disabled={!output}
                    data-testid="button-send-notion"
                  >
                    <SiNotion className="w-4 h-4 mr-1.5" />
                    Send to Notion
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
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-2 text-xs text-muted-foreground flex-wrap">
          <span data-testid="text-footer-info">Strips navigation, metadata, UI controls, and animation descriptions</span>
          <span data-testid="text-footer-preserves">Keeps participation &amp; challenge activity headers</span>
        </div>
      </footer>

      {notionModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" data-testid="modal-notion">
          <div className="bg-background border rounded-lg shadow-lg w-full max-w-md mx-4 p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <SiNotion className="w-5 h-5" />
                <h2 className="text-lg font-semibold">Send to Notion</h2>
              </div>
              <button
                onClick={() => setNotionModalOpen(false)}
                className="text-muted-foreground hover:text-foreground"
                data-testid="button-close-notion-modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mb-4">
              <label className="text-sm font-medium mb-2 block">Parent Page</label>
              <p className="text-xs text-muted-foreground mb-2">
                Choose which Notion page to create the new page under.
              </p>
              {notionPagesLoading ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground py-2" data-testid="text-notion-loading">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Loading pages...
                </div>
              ) : (
                <select
                  value={selectedParentPage}
                  onChange={(e) => setSelectedParentPage(e.target.value)}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  data-testid="select-notion-parent"
                >
                  <option value="">First available page</option>
                  {notionPages.map((page) => (
                    <option key={page.id} value={page.id}>
                      {page.title}
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setNotionModalOpen(false)}
                data-testid="button-cancel-notion"
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleSendToNotion}
                disabled={notionLoading}
                data-testid="button-confirm-notion"
              >
                {notionLoading ? (
                  <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
                ) : (
                  <Send className="w-4 h-4 mr-1.5" />
                )}
                {notionLoading ? "Sending..." : "Send"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
