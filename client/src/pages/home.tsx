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
import {
  loadSession, saveSession, clearSession, createSession,
  detectActivityLabel, detectSectionTitle, computeSimilarity, combineActivities,
  type SessionState, type ActivityBlock,
} from "@/lib/session";
import { convertZybooksJson, type ZyBooksSectionResponse } from "@/lib/json-converter";
import { Copy, Check, Trash2, FileText, ArrowRight, Download, ExternalLink, Loader2, Send, X, ChevronDown, Eye, EyeOff, Bookmark, Zap, Plus, Square, ListPlus, RotateCcw, Database } from "lucide-react";
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

  const [session, setSession] = useState<SessionState | null>(null);
  const [sessionStartModalOpen, setSessionStartModalOpen] = useState(false);
  const [sessionSectionId, setSessionSectionId] = useState("");

  const [showResumePrompt, setShowResumePrompt] = useState(false);
  const pendingSessionRef = useRef<SessionState | null>(null);

  const [apiToken, setApiToken] = useState(() => {
    if (typeof window !== "undefined") return localStorage.getItem("zybooks_api_token") || "";
    return "";
  });
  const [apiZybookCode, setApiZybookCode] = useState(() => {
    if (typeof window !== "undefined") return localStorage.getItem("zybooks_zybook_code") || "CPPCS2520NguyenSpring2026";
    return "CPPCS2520NguyenSpring2026";
  });
  const [apiChapter, setApiChapter] = useState("6");
  const [apiSection, setApiSection] = useState("1");
  const [apiFetching, setApiFetching] = useState(false);

  useEffect(() => {
    const saved = loadSession();
    if (saved && saved.activities.length > 0) {
      pendingSessionRef.current = saved;
      setShowResumePrompt(true);
    } else if (saved) {
      setSession(saved);
    }
  }, []);

  const handleStartSession = useCallback(() => {
    if (!sessionSectionId.trim()) return;
    const newSession = createSession(sessionSectionId.trim());
    setSession(newSession);
    saveSession(newSession);
    setSessionStartModalOpen(false);
    setSessionSectionId("");
    setOutput("");
    toast({ title: "Session started", description: `Capturing activities for Section ${newSession.sectionId}` });
  }, [sessionSectionId, toast]);

  const handleEndSession = useCallback(() => {
    if (!session || session.activities.length === 0) {
      clearSession();
      setSession(null);
      toast({ title: "Session ended", description: "No activities were captured." });
      return;
    }
    const combined = combineActivities(session);
    setOutput(combined);
    setInput("");
    clearSession();
    setSession(null);
    toast({ title: "Session complete!", description: `${session.activities.length} activities combined. Use export buttons to save.` });
  }, [session, toast]);

  const handleDiscardSession = useCallback(() => {
    clearSession();
    setSession(null);
    setOutput("");
    toast({ title: "Session discarded" });
  }, [toast]);

  const handleRemoveActivity = useCallback((index: number) => {
    if (!session) return;
    const updated = {
      ...session,
      activities: session.activities.filter((_, i) => i !== index).map((a, i) => ({ ...a, index: i + 1 })),
    };
    setSession(updated);
    saveSession(updated);
    if (updated.activities.length > 0) {
      setOutput(combineActivities(updated));
    } else {
      setOutput("");
    }
  }, [session]);

  const addToSession = useCallback((formatted: string, rawInput: string, mode: PasteMode) => {
    if (!session) return;

    const lastActivity = session.activities[session.activities.length - 1];
    if (lastActivity) {
      const similarity = computeSimilarity(lastActivity.formattedOutput, formatted);
      if (similarity > 0.8) {
        if (!window.confirm("This looks very similar to the last captured activity. Add anyway?")) {
          return;
        }
      }
    }

    const label = detectActivityLabel(formatted);
    if (!session.sectionTitle) {
      const title = detectSectionTitle(formatted);
      if (title) session.sectionTitle = title;
    }

    const activity: ActivityBlock = {
      index: session.activities.length + 1,
      label: label || `Activity ${session.activities.length + 1}`,
      rawInput,
      formattedOutput: formatted,
      pasteMode: mode,
      capturedAt: new Date().toISOString(),
    };

    const updated = {
      ...session,
      activities: [...session.activities, activity],
    };
    setSession(updated);
    saveSession(updated);
    setOutput(combineActivities(updated));
    toast({ title: "Activity captured!", description: `${activity.label} added (${updated.activities.length} total)` });
  }, [session, toast]);

  const defaultAppUrl = typeof window !== "undefined" ? window.location.origin : "";
  const [bookmarkletUrl, setBookmarkletUrl] = useState(defaultAppUrl);

  const bookmarkletCode = `javascript:void((function(){var u='${bookmarkletUrl}/api/bookmarklet';var h=document.documentElement.outerHTML;var t=null;try{var s=localStorage.getItem('ember_simple_auth-session-5');if(s){var p=JSON.parse(s);t=p&&p.authenticated&&p.authenticated.session&&p.authenticated.session.auth_token||null}}catch(e){}var payload={html:h};if(t)payload.auth_token=t;fetch(u,{method:'POST',mode:'cors',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)}).then(function(r){if(r.ok){var b=document.createElement('div');b.style.cssText='position:fixed;top:20px;right:20px;background:%2322c55e;color:white;padding:12px 20px;border-radius:8px;font:14px sans-serif;z-index:99999;box-shadow:0 4px 12px rgba(0,0,0,0.3)';b.textContent=t?'Sent to Formatter (with auth token!)':'Sent to zyBooks Formatter!';document.body.appendChild(b);setTimeout(function(){b.remove()},3000)}else{alert('Error: '+r.status+' '+r.statusText)}}).catch(function(e){alert('Could not reach zyBooks Formatter app. URL: '+u+' Error: '+e.message)})})())`;

  const startPolling = useCallback(() => {
    if (pollingRef.current) return;
    setBookmarkletPolling(true);
    pollingRef.current = setInterval(async () => {
      try {
        const res = await fetch("/api/bookmarklet/pending");
        const data = await res.json();
        if (data.auth_token) {
          setApiToken(data.auth_token);
          localStorage.setItem("zybooks_auth_token", data.auth_token);
        }
        if (data.html) {
          let formatted: string;
          let isApiMode = false;
          try {
            const parsed = JSON.parse(data.html);
            if (parsed._apiMode && parsed.data) {
              isApiMode = true;
              formatted = convertZybooksJson(parsed.data, parsed.chapter, parsed.section);
            } else {
              formatted = formatZybooksText(data.html, "html");
            }
          } catch {
            formatted = formatZybooksText(data.html, "html");
          }
          if (data.auth_token) {
            toast({ title: "Auth token captured!", description: "Your zyBooks token has been auto-filled in API Mode." });
          }
          if (session?.active) {
            addToSession(formatted, data.html, isApiMode ? "api" : "html");
            setInput("");
            toast({ title: "Activity captured from bookmarklet!", description: `${session.activities.length + 1} activities in session. Send another or click 'End Session'.` });
          } else {
            if (!isApiMode) {
              setInput(data.html);
              setPasteMode("html");
            }
            setOutput(formatted);
            if (pollingRef.current) {
              clearInterval(pollingRef.current);
              pollingRef.current = null;
            }
            setBookmarkletPolling(false);
            toast({ title: "zyBooks page received!", description: "Content auto-formatted from bookmarklet. Click 'Start Listening' again for another page." });
          }
        }
      } catch {}
    }, 2000);
  }, [toast, session, addToSession]);

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
    if (session?.active) {
      addToSession(formatted, input, pasteMode);
      setInput("");
    } else {
      setOutput(formatted);
    }
  }, [input, pasteMode, toast, session, addToSession]);

  const handleApiFetch = useCallback(async () => {
    if (!apiChapter.trim() || !apiSection.trim()) {
      toast({ title: "Missing fields", description: "Please fill in chapter and section.", variant: "destructive" });
      return;
    }
    if (apiToken.trim()) localStorage.setItem("zybooks_api_token", apiToken);
    localStorage.setItem("zybooks_zybook_code", apiZybookCode);
    setApiFetching(true);
    try {
      const hasLocalToken = apiToken.trim().length > 0;

      if (hasLocalToken) {
        const params = new URLSearchParams({
          auth_token: apiToken,
          zybook_code: apiZybookCode,
          chapter: apiChapter,
          section: apiSection,
        });
        const res = await fetch(`/api/zybooks-section?${params}`);
        const rawText = await res.text();
        let data: any;
        try {
          data = JSON.parse(rawText);
        } catch {
          throw new Error(`Invalid JSON response from server:\n${rawText.substring(0, 500)}`);
        }
        if (!res.ok) throw new Error(data.error || `Server returned ${res.status}`);
        if (data.success === false || data.error) {
          const errMsg = data.error?.message || data.error || "Unknown zyBooks error";
          throw new Error(`zyBooks API: ${errMsg}`);
        }

        const sectionData = data.section;
        if (!sectionData) {
          throw new Error(`No 'section' key in response. Top-level keys: [${Object.keys(data).join(', ')}]`);
        }
        const resources = sectionData.content_resources;
        if (!resources || !Array.isArray(resources)) {
          throw new Error(`No 'content_resources' array in section.`);
        }

        const resourceTypes = resources.map((r: any) => r.type || 'unknown');
        const typeCounts: Record<string, number> = {};
        for (const t of resourceTypes) typeCounts[t] = (typeCounts[t] || 0) + 1;

        const formatted = convertZybooksJson(data as ZyBooksSectionResponse, parseInt(apiChapter), parseInt(apiSection));
        const debugInfo = `\n\n---\n_API Debug: ${resources.length} resources fetched. Types: ${Object.entries(typeCounts).map(([t,c]) => `${t}(${c})`).join(', ')}_`;
        const finalOutput = formatted ? formatted + debugInfo : `[Empty conversion result]\n\nAPI returned ${resources.length} content_resources`;

        if (session?.active) {
          addToSession(formatted || finalOutput, JSON.stringify(data), "api");
          toast({ title: "Section fetched & captured!", description: `Chapter ${apiChapter}.${apiSection} — ${resources.length} resources.` });
        } else {
          setOutput(finalOutput);
          toast({ title: "Section fetched!", description: `Chapter ${apiChapter}.${apiSection} — ${resources.length} resources converted.` });
        }
      } else {
        const params = new URLSearchParams({
          zybook_code: apiZybookCode,
          chapter: apiChapter,
          section: apiSection,
          format: 'json',
        });
        const res = await fetch(`/api/zybooks-markdown?${params}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || `Server returned ${res.status}`);

        const markdown = data.markdown;
        if (!markdown) throw new Error("No markdown in response");

        if (session?.active) {
          addToSession(markdown, "", "api");
          toast({ title: "Section fetched & captured!", description: `Chapter ${apiChapter}.${apiSection}` });
        } else {
          setOutput(markdown);
          toast({ title: "Section fetched!", description: `Chapter ${apiChapter}.${apiSection} converted via server token.` });
        }
      }
    } catch (err: any) {
      const errorText = `ERROR: ${err.message}\n\nTroubleshooting:\n- If no auth token is set, the server uses its stored token (check /api/token/status)\n- Or paste your auth_token from zyBooks localStorage\n- Verify the zybook code, chapter, and section are correct`;
      setOutput(errorText);
      toast({ title: "API fetch failed", description: err.message, variant: "destructive" });
    } finally {
      setApiFetching(false);
    }
  }, [apiToken, apiZybookCode, apiChapter, apiSection, session, addToSession, toast]);

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
      const titleMatch = output.match(/^#{1,3}\s+(.+)$/m);
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
            {!session?.active ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSessionStartModalOpen(true)}
                data-testid="button-start-session"
              >
                <ListPlus className="w-4 h-4 mr-1.5" />
                Session Mode
              </Button>
            ) : (
              <div className="flex items-center gap-2" data-testid="session-controls">
                <span className="text-xs font-medium px-2 py-1 rounded bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 flex items-center gap-1.5" data-testid="text-session-status">
                  <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                  Session: {session.sectionId} ({session.activities.length} captured)
                </span>
                <Button variant="default" size="sm" onClick={handleEndSession} data-testid="button-end-session">
                  <Square className="w-3.5 h-3.5 mr-1.5" />
                  End Session
                </Button>
                <Button variant="ghost" size="sm" onClick={handleDiscardSession} data-testid="button-discard-session" className="text-destructive hover:text-destructive">
                  <Trash2 className="w-3.5 h-3.5 mr-1.5" />
                  Discard
                </Button>
              </div>
            )}
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
                <div className="flex items-center gap-2 mb-3">
                  <label className="text-xs text-muted-foreground whitespace-nowrap">App URL:</label>
                  <input
                    type="text"
                    value={bookmarkletUrl}
                    onChange={(e) => setBookmarkletUrl(e.target.value.replace(/\/+$/, ''))}
                    className="flex-1 max-w-md text-xs px-2 py-1 border rounded-md bg-background"
                    placeholder="https://your-app.replit.app"
                    data-testid="input-bookmarklet-url"
                  />
                  {bookmarkletUrl.includes('.picard.replit.dev') && (
                    <span className="text-xs text-yellow-600 dark:text-yellow-400">⚠ Dev URL — may not work from zyBooks. Use your published .replit.app URL.</span>
                  )}
                </div>
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
                  <span className="text-xs text-muted-foreground">← Drag this to your bookmarks bar (auto-grabs auth token!)</span>
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

      {session?.active && session.activities.length > 0 && (
        <div className="border-b bg-muted/20 px-6 py-3" data-testid="panel-session-activities">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold flex items-center gap-2">
                <ListPlus className="w-4 h-4" />
                Captured Activities ({session.activities.length})
              </h3>
              <span className="text-xs text-muted-foreground">
                {session.sectionTitle ? `${session.sectionId} — ${session.sectionTitle}` : `Section ${session.sectionId}`}
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              {session.activities.map((activity, i) => (
                <div
                  key={i}
                  className="flex items-center gap-1.5 text-xs bg-background border rounded-md px-2.5 py-1.5"
                  data-testid={`session-activity-${i}`}
                >
                  <span className="font-medium">{activity.label}</span>
                  <span className="text-muted-foreground">
                    {new Date(activity.capturedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                  <button
                    onClick={() => handleRemoveActivity(i)}
                    className="ml-1 text-muted-foreground hover:text-destructive transition-colors"
                    title="Remove this activity"
                    data-testid={`button-remove-activity-${i}`}
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
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
                    <button
                      type="button"
                      onClick={() => { setPasteMode("api"); setShowPreviews(false); }}
                      className={`px-3 py-1.5 transition-colors border-l border-input ${
                        pasteMode === "api"
                          ? "bg-primary text-primary-foreground"
                          : "bg-background text-muted-foreground hover:bg-muted"
                      }`}
                      data-testid="button-mode-api"
                    >
                      API Mode
                    </button>
                  </div>
                  <span className="text-xs text-muted-foreground" data-testid="text-input-lines">
                    {inputLineCount} lines
                  </span>
                </div>
              </div>
              {pasteMode === "api" ? (
                <div className="flex-1 min-h-[400px] lg:min-h-[600px] border rounded-md p-4 bg-muted/20 flex flex-col gap-4" data-testid="panel-api-mode">
                  <div>
                    <label className="text-xs font-medium text-muted-foreground block mb-1">Auth Token <span className="text-muted-foreground/60">(optional — server has stored token)</span></label>
                    <input
                      type="password"
                      value={apiToken}
                      onChange={(e) => setApiToken(e.target.value)}
                      placeholder="Leave empty to use server token, or paste your own..."
                      className="w-full text-xs px-3 py-2 border rounded-md bg-background font-mono"
                      data-testid="input-api-token"
                    />
                    <p className="text-xs text-muted-foreground mt-1">Leave blank to use the server's stored token (auto-refreshes). Or paste from zyBooks localStorage.</p>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground block mb-1">Zybook Code</label>
                    <input
                      type="text"
                      value={apiZybookCode}
                      onChange={(e) => setApiZybookCode(e.target.value)}
                      placeholder="e.g. CPPCS2520NguyenSpring2026"
                      className="w-full text-xs px-3 py-2 border rounded-md bg-background font-mono"
                      data-testid="input-api-zybook-code"
                    />
                  </div>
                  <div className="flex gap-3">
                    <div className="flex-1">
                      <label className="text-xs font-medium text-muted-foreground block mb-1">Chapter</label>
                      <input
                        type="number"
                        min="1"
                        value={apiChapter}
                        onChange={(e) => setApiChapter(e.target.value)}
                        placeholder="6"
                        className="w-full text-xs px-3 py-2 border rounded-md bg-background"
                        data-testid="input-api-chapter"
                      />
                    </div>
                    <div className="flex-1">
                      <label className="text-xs font-medium text-muted-foreground block mb-1">Section</label>
                      <input
                        type="number"
                        min="1"
                        value={apiSection}
                        onChange={(e) => setApiSection(e.target.value)}
                        placeholder="1"
                        className="w-full text-xs px-3 py-2 border rounded-md bg-background"
                        data-testid="input-api-section"
                      />
                    </div>
                  </div>
                  <Button
                    onClick={handleApiFetch}
                    disabled={apiFetching || !apiChapter.trim() || !apiSection.trim()}
                    className="gap-1.5"
                    data-testid="button-api-fetch"
                  >
                    {apiFetching ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Fetching...
                      </>
                    ) : (
                      <>
                        <Database className="w-4 h-4" />
                        {session?.active ? "Fetch & Capture" : "Fetch & Format"}
                      </>
                    )}
                  </Button>
                  <div className="flex-1 flex flex-col justify-end">
                    <div className="text-xs text-muted-foreground bg-background border rounded-md p-3 space-y-1">
                      <p className="font-medium">How API Mode works:</p>
                      <ol className="list-decimal list-inside space-y-0.5">
                        <li>Just enter chapter & section numbers, then click Fetch</li>
                        <li>The server uses its stored token (auto-refreshes)</li>
                        <li>No auth token needed on your end!</li>
                      </ol>
                      <p className="mt-2 text-muted-foreground/80">Works on mobile — no bookmarklet required. Optionally paste your own auth_token to override.</p>
                    </div>
                  </div>
                </div>
              ) : (
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
              )}
            </div>

            {pasteMode !== "api" && (
              <div className="flex lg:flex-col items-center justify-center gap-2 py-2">
                <Button
                  onClick={handleFormat}
                  disabled={!input.trim()}
                  data-testid="button-format"
                  className="gap-1.5"
                >
                  {session?.active ? "Capture" : "Format"}
                  {session?.active ? <Plus className="w-4 h-4" /> : <ArrowRight className="w-4 h-4" />}
                </Button>
              </div>
            )}

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

      {showResumePrompt && pendingSessionRef.current && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" data-testid="modal-resume-session">
          <div className="bg-background border rounded-lg shadow-lg w-full max-w-sm mx-4 p-6">
            <div className="flex items-center gap-2 mb-3">
              <RotateCcw className="w-5 h-5" />
              <h2 className="text-lg font-semibold">Resume Session?</h2>
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              You have an unfinished session for Section {pendingSessionRef.current.sectionId} with {pendingSessionRef.current.activities.length} captured activities.
            </p>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  clearSession();
                  pendingSessionRef.current = null;
                  setShowResumePrompt(false);
                }}
                data-testid="button-discard-resume"
              >
                <Trash2 className="w-4 h-4 mr-1.5" />
                Discard
              </Button>
              <Button
                size="sm"
                onClick={() => {
                  const s = pendingSessionRef.current!;
                  setSession(s);
                  setOutput(combineActivities(s));
                  pendingSessionRef.current = null;
                  setShowResumePrompt(false);
                }}
                data-testid="button-resume-session"
              >
                <RotateCcw className="w-4 h-4 mr-1.5" />
                Resume
              </Button>
            </div>
          </div>
        </div>
      )}

      {sessionStartModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" data-testid="modal-start-session">
          <div className="bg-background border rounded-lg shadow-lg w-full max-w-sm mx-4 p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <ListPlus className="w-5 h-5" />
                <h2 className="text-lg font-semibold">Start Session</h2>
              </div>
              <button
                onClick={() => setSessionStartModalOpen(false)}
                className="text-muted-foreground hover:text-foreground"
                data-testid="button-close-session-modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              Session mode captures multiple pastes and combines them into one document. Great for multi-level CAs or building a complete section notebook.
            </p>
            <div className="mb-4">
              <label className="text-sm font-medium mb-2 block">Section ID</label>
              <input
                type="text"
                value={sessionSectionId}
                onChange={(e) => setSessionSectionId(e.target.value)}
                placeholder="e.g., 6.3"
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                data-testid="input-session-section-id"
                autoFocus
                onKeyDown={(e) => { if (e.key === 'Enter') handleStartSession(); }}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => setSessionStartModalOpen(false)} data-testid="button-cancel-session">
                Cancel
              </Button>
              <Button size="sm" onClick={handleStartSession} disabled={!sessionSectionId.trim()} data-testid="button-confirm-start-session">
                <Plus className="w-4 h-4 mr-1.5" />
                Start
              </Button>
            </div>
          </div>
        </div>
      )}

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
