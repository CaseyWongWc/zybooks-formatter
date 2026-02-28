import { useState, useCallback, useMemo, useEffect, useRef } from "react";
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
import { Copy, Check, Trash2, FileText, ArrowRight, Download, ExternalLink, Loader2, Send, X, ChevronDown, Eye, EyeOff, Bookmark, Zap } from "lucide-react";
import { SiNotion } from "react-icons/si";
import { marked } from "marked";
import DOMPurify from "dompurify";

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
  const [showPreviews, setShowPreviews] = useState(false);
  const [showBookmarklet, setShowBookmarklet] = useState(false);
  const [bookmarkletPolling, setBookmarkletPolling] = useState(false);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const { toast } = useToast();

  const appUrl = typeof window !== "undefined" ? window.location.origin : "";

  const bookmarkletCode = `javascript:void((function(){var d=document,h=d.documentElement.outerHTML;var x=new XMLHttpRequest();x.open('POST','${appUrl}/api/bookmarklet',true);x.setRequestHeader('Content-Type','application/json');x.onload=function(){if(x.status===200){var b=d.createElement('div');b.style.cssText='position:fixed;top:20px;right:20px;background:#22c55e;color:white;padding:12px 20px;border-radius:8px;font:14px sans-serif;z-index:99999;box-shadow:0 4px 12px rgba(0,0,0,0.3)';b.textContent='Sent to zyBooks Formatter!';d.body.appendChild(b);setTimeout(function(){b.remove()},3000)}else{alert('Error sending to formatter')}};x.onerror=function(){alert('Could not reach zyBooks Formatter app')};x.send(JSON.stringify({html:h}))})())`;

  const startPolling = useCallback(() => {
    if (pollingRef.current) return;
    setBookmarkletPolling(true);
    pollingRef.current = setInterval(async () => {
      try {
        const res = await fetch("/api/bookmarklet/pending");
        const data = await res.json();
        if (data.html) {
          setInput(data.html);
          setPasteMode("html");
          const formatted = formatZybooksText(data.html, "html");
          setOutput(formatted);
          if (pollingRef.current) {
            clearInterval(pollingRef.current);
            pollingRef.current = null;
          }
          setBookmarkletPolling(false);
          toast({ title: "zyBooks page received!", description: "Content auto-formatted from bookmarklet. Click 'Start Listening' again for another page." });
        }
      } catch {}
    }, 2000);
  }, [toast]);

  const stopPolling = useCallback(() => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
    setBookmarkletPolling(false);
  }, []);

  useEffect(() => {
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, []);

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

  const renderedMarkdown = useMemo(() => {
    if (!output || !showPreviews) return "";
    const raw = marked.parse(output, { async: false }) as string;
    return DOMPurify.sanitize(raw);
  }, [output, showPreviews]);

  const htmlPreviewSrcdoc = useMemo(() => {
    if (!showPreviews || pasteMode !== "html" || !input.trim()) return "";
    const sanitizedHtml = DOMPurify.sanitize(input, { ALLOW_UNKNOWN_PROTOCOLS: false, FORBID_TAGS: ['script', 'iframe', 'object', 'embed'] });
    return `<!DOCTYPE html><html><head><style>
      body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; font-size: 14px; padding: 16px; color: #333; line-height: 1.6; }
      .code, pre { background: #f5f5f5; padding: 8px; border-radius: 4px; overflow-x: auto; font-family: monospace; font-size: 13px; }
      .console pre { background: #1e1e1e; color: #d4d4d4; padding: 8px; border-radius: 4px; }
      table { border-collapse: collapse; width: 100%; }
      td { vertical-align: top; padding: 4px; }
      .activity-title-bar { background: #f0f4ff; padding: 8px 12px; border-radius: 4px; margin: 8px 0; }
      .activity-type { font-size: 11px; text-transform: uppercase; color: #666; }
      .activity-title { font-weight: 600; }
      .term { font-weight: bold; }
      .static-container-title { font-weight: 600; color: #555; }
      .question-set-question { margin: 12px 0; padding: 8px; border-left: 3px solid #ddd; }
      .label { font-weight: bold; margin-right: 4px; }
      .zb-nav-menu, .top-toolbar, .zb-feedback, .assignment-completion-summary-card, .section-announcement, .osano-cm-window { display: none !important; }
      h1 { font-size: 1.5em; } h3 { font-size: 1.2em; }
      code { background: #f0f0f0; padding: 2px 4px; border-radius: 3px; font-size: 0.9em; }
      .highlight span { font-family: monospace; }
    </style></head><body>${sanitizedHtml}</body></html>`;
  }, [input, showPreviews, pasteMode]);

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
              onClick={() => setShowBookmarklet(!showBookmarklet)}
              data-testid="button-toggle-bookmarklet"
            >
              <Bookmark className="w-4 h-4 mr-1.5" />
              Bookmarklet
            </Button>
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

      {showBookmarklet && (
        <div className="border-b bg-muted/30 px-6 py-4" data-testid="panel-bookmarklet">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-start gap-4">
              <div className="flex-1">
                <h3 className="text-sm font-semibold mb-2 flex items-center gap-2">
                  <Zap className="w-4 h-4 text-yellow-500" />
                  One-Click Import from zyBooks
                </h3>
                <p className="text-xs text-muted-foreground mb-3">
                  Drag the button below to your bookmarks bar. Then visit any zyBooks section page and click it — the page content will be sent here and auto-formatted.
                </p>
                <div className="flex items-center gap-3 flex-wrap">
                  <a
                    href={bookmarkletCode}
                    onClick={(e) => e.preventDefault()}
                    draggable
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-primary text-primary-foreground text-xs font-medium shadow-sm cursor-grab active:cursor-grabbing hover:opacity-90 transition-opacity no-underline"
                    title="Drag this to your bookmarks bar"
                    data-testid="link-bookmarklet"
                  >
                    <Bookmark className="w-3.5 h-3.5" />
                    zyBooks → Formatter
                  </a>
                  <span className="text-xs text-muted-foreground">← Drag this to your bookmarks bar</span>
                </div>
                <div className="mt-3 flex items-center gap-2">
                  {bookmarkletPolling ? (
                    <Button size="sm" variant="outline" onClick={stopPolling} data-testid="button-stop-listening">
                      <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                      Listening for zyBooks pages... (click to stop)
                    </Button>
                  ) : (
                    <Button size="sm" variant="default" onClick={startPolling} data-testid="button-start-listening">
                      <Zap className="w-3.5 h-3.5 mr-1.5" />
                      Start Listening
                    </Button>
                  )}
                  {bookmarkletPolling && (
                    <span className="text-xs text-green-600 dark:text-green-400 flex items-center gap-1" data-testid="text-listening-status">
                      <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                      Ready to receive
                    </span>
                  )}
                </div>
              </div>
              <div className="hidden md:block text-xs text-muted-foreground bg-background border rounded-md p-3 max-w-xs">
                <p className="font-medium mb-1">How it works:</p>
                <ol className="list-decimal list-inside space-y-0.5">
                  <li>Drag the bookmarklet to your bookmarks bar</li>
                  <li>Click "Start Listening" here</li>
                  <li>Go to any zyBooks section page</li>
                  <li>Click the bookmarklet in your bookmarks bar</li>
                  <li>Content auto-fills and formats here!</li>
                </ol>
              </div>
            </div>
          </div>
        </div>
      )}

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
                      onClick={() => { setPasteMode("regular"); setShowPreviews(false); }}
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
                      onClick={() => { setPasteMode("markdown"); setShowPreviews(false); }}
                      className={`px-3 py-1.5 transition-colors border-l border-input ${
                        pasteMode === "markdown"
                          ? "bg-primary text-primary-foreground"
                          : "bg-background text-muted-foreground hover:bg-muted"
                      }`}
                      data-testid="button-mode-markdown"
                    >
                      Copy as Markdown
                    </button>
                    <button
                      type="button"
                      onClick={() => setPasteMode("html")}
                      className={`px-3 py-1.5 transition-colors border-l border-input ${
                        pasteMode === "html"
                          ? "bg-primary text-primary-foreground"
                          : "bg-background text-muted-foreground hover:bg-muted"
                      }`}
                      data-testid="button-mode-html"
                    >
                      HTML Paste
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
                    : pasteMode === "markdown"
                    ? "Paste content from the 'Copy as Markdown' browser extension..."
                    : "Paste raw HTML from zyBooks page source (View Source or Inspect)..."
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

          {pasteMode === "html" && (
            <div className="mt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowPreviews(!showPreviews)}
                data-testid="button-toggle-previews"
                className="gap-1.5"
              >
                {showPreviews ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                {showPreviews ? "Hide Previews" : "Show Previews"}
              </Button>

              {showPreviews && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-3" data-testid="preview-panels">
                  <div className="flex flex-col gap-2 border rounded-lg overflow-hidden">
                    <div className="bg-muted px-3 py-2 text-sm font-medium flex items-center gap-2 border-b" data-testid="label-html-preview">
                      <Eye className="w-4 h-4 text-muted-foreground" />
                      HTML Preview (Original)
                    </div>
                    <iframe
                      sandbox=""
                      srcDoc={htmlPreviewSrcdoc}
                      className="w-full min-h-[400px] bg-white"
                      title="HTML Preview"
                      data-testid="iframe-html-preview"
                    />
                  </div>
                  <div className="flex flex-col gap-2 border rounded-lg overflow-hidden">
                    <div className="bg-muted px-3 py-2 text-sm font-medium flex items-center gap-2 border-b" data-testid="label-markdown-preview">
                      <FileText className="w-4 h-4 text-muted-foreground" />
                      Markdown Preview (Formatted)
                    </div>
                    <div
                      className="w-full min-h-[400px] p-4 prose prose-sm max-w-none dark:prose-invert overflow-auto bg-white dark:bg-background"
                      data-testid="div-markdown-preview"
                      dangerouslySetInnerHTML={{ __html: renderedMarkdown || '<p class="text-gray-400">Format content to see rendered markdown preview...</p>' }}
                    />
                  </div>
                </div>
              )}
            </div>
          )}
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
