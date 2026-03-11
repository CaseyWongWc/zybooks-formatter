import type { Express } from "express";
import express from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { sendToNotion, listNotionPages } from "./notion";
import { convertZybooksJson, type ConvertOptions } from "../client/src/lib/json-converter";
import fs from "fs";
import path from "path";

async function getGitHubToken(): Promise<{ token: string; login: string } | null> {
  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
  if (!hostname) return null;

  const xReplitToken = process.env.REPL_IDENTITY
    ? "repl " + process.env.REPL_IDENTITY
    : process.env.WEB_REPL_RENEWAL
    ? "depl " + process.env.WEB_REPL_RENEWAL
    : null;
  if (!xReplitToken) return null;

  const connRes = await fetch(
    `https://${hostname}/api/v2/connection?include_secrets=true&connector_names=github`,
    { headers: { Accept: "application/json", "X-Replit-Token": xReplitToken } }
  );
  const connData = await connRes.json();
  const conn = connData.items?.[0];
  const token =
    conn?.settings?.access_token ||
    conn?.settings?.oauth?.credentials?.access_token;
  if (!token) return null;

  const userRes = await fetch("https://api.github.com/user", {
    headers: { Authorization: `token ${token}`, Accept: "application/vnd.github.v3+json" },
  });
  if (!userRes.ok) return null;
  const userData = await userRes.json();

  return { token, login: userData.login };
}

let pendingBookmarkletHtml: { html: string; timestamp: number; auth_token?: string | null } | null = null;

interface TokenStore {
  auth_token: string;
  refresh_token: string;
  expiry_date: string;
  user_id: number;
}

const TOKEN_FILE = '.data/zybooks_tokens.json';

function loadTokensFromDisk(): TokenStore | null {
  try {
    const filePath = path.resolve(TOKEN_FILE);
    if (fs.existsSync(filePath)) {
      const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
      console.log(`[Token] Loaded from disk. Expires: ${data.expiry_date}`);
      return data;
    }
  } catch (e: any) {
    console.error(`[Token] Failed to load from disk:`, e.message);
  }
  return null;
}

function saveTokensToDisk(tokens: TokenStore | null) {
  try {
    const dir = path.dirname(path.resolve(TOKEN_FILE));
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    if (tokens) {
      fs.writeFileSync(path.resolve(TOKEN_FILE), JSON.stringify(tokens, null, 2));
      console.log(`[Token] Saved to disk.`);
    } else {
      const filePath = path.resolve(TOKEN_FILE);
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
      console.log(`[Token] Removed from disk.`);
    }
  } catch (e: any) {
    console.error(`[Token] Failed to save to disk:`, e.message);
  }
}

let storedTokens: TokenStore | null = loadTokensFromDisk();

async function refreshZybooksToken(refresh_token: string): Promise<TokenStore | null> {
  try {
    const res = await fetch(
      `https://zyserver.zybooks.com/v1/refresh?refresh_token=${encodeURIComponent(refresh_token)}`,
      {
        headers: {
          "Origin": "https://learn.zybooks.com",
          "Referer": "https://learn.zybooks.com/",
        },
      }
    );
    const data = await res.json();
    if (data.success && data.session) {
      const tokens: TokenStore = {
        auth_token: data.session.auth_token,
        refresh_token: data.session.refresh_token,
        expiry_date: data.session.expiry_date,
        user_id: data.session.user_id,
      };
      storedTokens = tokens;
      saveTokensToDisk(tokens);
      console.log(`[Token] Refreshed. Expires: ${tokens.expiry_date}`);
      return tokens;
    }
    console.error(`[Token] Refresh failed:`, data.error);
    return null;
  } catch (err: any) {
    console.error(`[Token] Refresh error:`, err.message);
    return null;
  }
}

async function getValidAuthToken(): Promise<string | null> {
  if (!storedTokens) return null;

  const expiry = new Date(storedTokens.expiry_date).getTime();
  const now = Date.now();
  const bufferMs = 10 * 60 * 1000;

  if (now + bufferMs < expiry) {
    return storedTokens.auth_token;
  }

  console.log(`[Token] Auth token expiring soon, refreshing...`);
  const refreshed = await refreshZybooksToken(storedTokens.refresh_token);
  return refreshed?.auth_token || null;
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  app.options("/api/bookmarklet", (_req, res) => {
    res.set("Access-Control-Allow-Origin", "*");
    res.set("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.set("Access-Control-Allow-Headers", "Content-Type");
    res.set("Access-Control-Max-Age", "86400");
    return res.sendStatus(204);
  });

  app.post("/api/bookmarklet", express.json({ limit: "5mb" }), (req, res) => {
    res.set("Access-Control-Allow-Origin", "*");
    const { html, auth_token } = req.body;
    if (!html || typeof html !== "string") {
      return res.status(400).json({ error: "Missing html" });
    }
    pendingBookmarkletHtml = { html, timestamp: Date.now(), auth_token: auth_token || null };
    return res.json({ ok: true });
  });

  app.get("/api/bookmarklet/pending", (_req, res) => {
    if (pendingBookmarkletHtml && Date.now() - pendingBookmarkletHtml.timestamp < 60000) {
      const { html, auth_token } = pendingBookmarkletHtml;
      pendingBookmarkletHtml = null;
      return res.json({ html, auth_token: auth_token || null });
    }
    return res.json({ html: null, auth_token: null });
  });
  const adminKey = process.env.SESSION_SECRET || '';

  function requireAdmin(req: any, res: any): boolean {
    const provided = req.headers['x-admin-key'] || req.query.admin_key;
    if (!adminKey || !provided || provided !== adminKey) {
      res.status(403).json({ error: "Forbidden — provide X-Admin-Key header" });
      return false;
    }
    return true;
  }

  app.post("/api/token", express.json(), async (req, res) => {
    if (!requireAdmin(req, res)) return;
    try {
      const { refresh_token } = req.body;
      if (!refresh_token) {
        return res.status(400).json({ error: "Missing refresh_token" });
      }

      const refreshed = await refreshZybooksToken(refresh_token);
      if (!refreshed) {
        return res.status(401).json({ error: "Failed to refresh token — refresh_token may be invalid" });
      }
      return res.json({
        ok: true,
        expires: refreshed.expiry_date,
        user_id: refreshed.user_id,
      });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  });

  app.get("/api/token/status", (_req, res) => {
    if (!storedTokens) {
      return res.json({ configured: false });
    }
    const expiry = new Date(storedTokens.expiry_date);
    const now = new Date();
    return res.json({
      configured: true,
      user_id: storedTokens.user_id,
      expires: storedTokens.expiry_date,
      expires_in_hours: Math.max(0, (expiry.getTime() - now.getTime()) / (1000 * 60 * 60)).toFixed(1),
      is_valid: expiry.getTime() > now.getTime(),
    });
  });

  app.delete("/api/token", (req, res) => {
    if (!requireAdmin(req, res)) return;
    storedTokens = null;
    saveTokensToDisk(null);
    return res.json({ ok: true });
  });

  app.get("/api/zybooks-section", async (req, res) => {
    try {
      const { auth_token, zybook_code, chapter, section } = req.query;
      if (!auth_token || !zybook_code || !chapter || !section) {
        return res.status(400).json({ error: "Missing required params: auth_token, zybook_code, chapter, section" });
      }
      const url = `https://zyserver.zybooks.com/v1/zybook/${zybook_code}/chapter/${chapter}/section/${section}`;
      const apiRes = await fetch(url, {
        headers: {
          "Accept": "application/json, text/javascript, */*; q=0.01",
          "Authorization": `Bearer ${auth_token}`,
          "Origin": "https://learn.zybooks.com",
          "Referer": "https://learn.zybooks.com/",
          "User-Agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
        },
      });
      if (apiRes.status === 401) {
        return res.status(401).json({ error: "Invalid or expired auth token. Please refresh your zyBooks session and try again." });
      }
      if (apiRes.status === 404) {
        return res.status(404).json({ error: `Section ${chapter}.${section} not found in ${zybook_code}.` });
      }
      if (!apiRes.ok) {
        return res.status(502).json({ error: `zyBooks server returned ${apiRes.status}` });
      }
      const data = await apiRes.json();
      if (data.success === false || data.error) {
        const errMsg = data.error?.message || data.error || "Unknown zyBooks error";
        const errCode = data.error?.code || apiRes.status;
        return res.status(errCode >= 400 && errCode < 600 ? errCode : 400).json({ error: errMsg });
      }
      return res.json(data);
    } catch (err: any) {
      return res.status(502).json({ error: err.message || "Failed to reach zyBooks server" });
    }
  });

  app.post("/api/zybooks-json", express.json({ limit: "5mb" }), (req, res) => {
    const { json, chapter, section } = req.body;
    if (!json) {
      return res.status(400).json({ error: "Missing json field" });
    }
    try {
      const parsed = typeof json === 'string' ? JSON.parse(json) : json;
      pendingBookmarkletHtml = {
        html: JSON.stringify({ _apiMode: true, data: parsed, chapter, section }),
        timestamp: Date.now(),
      };
      return res.json({ ok: true });
    } catch (err: any) {
      return res.status(400).json({ error: "Invalid JSON: " + err.message });
    }
  });

  app.get("/submit", (_req, res) => {
    res.type("html").send(`<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>ZyBooks Formatter — Submit Content</title>
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:system-ui,-apple-system,sans-serif;background:#0a0a0a;color:#e5e5e5;min-height:100vh;display:flex;flex-direction:column;align-items:center;padding:2rem}
h1{font-size:1.5rem;margin-bottom:.5rem}
p.sub{color:#a3a3a3;font-size:.875rem;margin-bottom:1.5rem;text-align:center;max-width:500px}
form{width:100%;max-width:640px;display:flex;flex-direction:column;gap:1rem}
label{font-size:.875rem;font-weight:500}
textarea{width:100%;min-height:300px;background:#171717;border:1px solid #333;border-radius:8px;color:#e5e5e5;padding:12px;font-family:monospace;font-size:.8rem;resize:vertical}
textarea:focus{outline:none;border-color:#3b82f6}
input[type="text"]{width:100%;background:#171717;border:1px solid #333;border-radius:8px;color:#e5e5e5;padding:10px 12px;font-size:.875rem}
input[type="text"]:focus{outline:none;border-color:#3b82f6}
select{background:#171717;border:1px solid #333;border-radius:8px;color:#e5e5e5;padding:10px 12px;font-size:.875rem}
select:focus{outline:none;border-color:#3b82f6}
button{background:#3b82f6;color:white;border:none;border-radius:8px;padding:12px 24px;font-size:1rem;font-weight:600;cursor:pointer;transition:background .15s}
button:hover{background:#2563eb}
button:disabled{background:#333;color:#666;cursor:not-allowed}
.status{padding:12px;border-radius:8px;font-size:.875rem;display:none}
.status.success{display:block;background:#052e16;border:1px solid #166534;color:#4ade80}
.status.error{display:block;background:#350a0a;border:1px solid #991b1b;color:#f87171}
.row{display:flex;gap:1rem;align-items:end}
.row>*{flex:1}
</style>
</head>
<body>
<h1>Submit Content to Formatter</h1>
<p class="sub">Paste zyBooks page content below and click Submit. The content will be sent to the formatter app for processing. Works with browser control automation.</p>
<form id="submitForm">
  <div>
    <label for="contentArea">Page Content</label>
    <textarea id="contentArea" name="html" placeholder="Paste zyBooks content here..." data-testid="input-submit-content"></textarea>
  </div>
  <div>
    <label for="authToken">Auth Token (auto-detected if on zyBooks)</label>
    <input type="text" id="authToken" name="auth_token" placeholder="Auto-extracted from zyBooks localStorage..." data-testid="input-submit-token">
  </div>
  <div class="row">
    <div>
      <label for="sourceUrl">Source URL (optional)</label>
      <input type="text" id="sourceUrl" name="url" placeholder="https://learn.zybooks.com/..." data-testid="input-submit-url">
    </div>
    <div>
      <label for="pasteMode">Paste Mode</label>
      <select id="pasteMode" name="mode" data-testid="select-submit-mode">
        <option value="html">HTML Paste</option>
        <option value="regular">Regular Paste</option>
        <option value="markdown">Copy as Markdown</option>
      </select>
    </div>
  </div>
  <button type="submit" id="submitBtn" data-testid="button-submit-content">Submit to Formatter</button>
  <div id="status" class="status"></div>
</form>
<script>
document.getElementById("submitForm").addEventListener("submit", async function(e) {
  e.preventDefault();
  const btn = document.getElementById("submitBtn");
  const status = document.getElementById("status");
  const html = document.getElementById("contentArea").value;
  const url = document.getElementById("sourceUrl").value;
  const authToken = document.getElementById("authToken").value;
  if (!html.trim()) { status.className="status error"; status.textContent="Content is empty."; return; }
  btn.disabled = true; btn.textContent = "Submitting...";
  status.className="status"; status.style.display="none";
  try {
    var payload = { html: html, url: url || undefined };
    if (authToken) payload.auth_token = authToken;
    const res = await fetch("/api/bookmarklet", {
      method: "POST",
      headers: {"Content-Type": "application/json"},
      body: JSON.stringify(payload)
    });
    if (!res.ok) throw new Error("Server returned " + res.status);
    status.className="status success";
    status.textContent="Content submitted! Switch to the formatter tab — it will pick up the content automatically if listening is enabled.";
  } catch(err) {
    status.className="status error";
    status.textContent="Error: " + err.message;
  } finally {
    btn.disabled = false; btn.textContent = "Submit to Formatter";
  }
});
</script>
</body>
</html>`);
  });

  app.post("/api/create-colab-link", async (req, res) => {
    try {
      const { notebook, filename } = req.body;
      if (!notebook || !filename) {
        return res.status(400).json({ error: "Missing notebook or filename" });
      }

      const gh = await getGitHubToken();
      if (!gh) {
        return res.status(500).json({ error: "GitHub integration not available" });
      }

      const repo = "zybooks-formatter";
      const path = `notebooks/${filename}`;
      const content = Buffer.from(JSON.stringify(notebook, null, 2)).toString("base64");

      let existingSha: string | undefined;
      const getRes = await fetch(
        `https://api.github.com/repos/${gh.login}/${repo}/contents/${path}?ref=main2`,
        {
          headers: {
            Authorization: `token ${gh.token}`,
            Accept: "application/vnd.github.v3+json",
          },
        }
      );
      if (getRes.ok) {
        const existing = await getRes.json();
        existingSha = existing.sha;
      }

      const putRes = await fetch(
        `https://api.github.com/repos/${gh.login}/${repo}/contents/${path}`,
        {
          method: "PUT",
          headers: {
            Authorization: `token ${gh.token}`,
            Accept: "application/vnd.github.v3+json",
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            message: `Add notebook: ${filename}`,
            content,
            branch: "main2",
            ...(existingSha ? { sha: existingSha } : {}),
          }),
        }
      );

      if (!putRes.ok) {
        const errText = await putRes.text();
        return res.status(500).json({ error: `GitHub API error: ${errText}` });
      }

      const colabUrl = `https://colab.research.google.com/github/${gh.login}/${repo}/blob/main2/${path}`;

      return res.json({ colabUrl });
    } catch (err: any) {
      return res.status(500).json({ error: err.message || "Failed to create notebook" });
    }
  });

  app.get("/api/zybooks-markdown", async (req, res) => {
    try {
      let auth_token = req.query.auth_token as string || (req.headers.authorization?.startsWith('Bearer ') ? req.headers.authorization.slice(7) : null);
      const { zybook_code, chapter, section } = req.query;

      if (!auth_token) {
        const storedToken = await getValidAuthToken();
        if (storedToken) {
          auth_token = storedToken;
        }
      }

      if (!auth_token || !zybook_code || !chapter || !section) {
        return res.status(400).json({ error: !auth_token ? "No auth token provided and no stored token configured. POST to /api/token with your refresh_token first." : "Missing required parameters: zybook_code, chapter, section" });
      }
      const url = `https://zyserver.zybooks.com/v1/zybook/${zybook_code}/chapter/${chapter}/section/${section}`;
      const apiRes = await fetch(url, {
        headers: {
          "Accept": "application/json, text/javascript, */*; q=0.01",
          "Authorization": `Bearer ${auth_token}`,
          "Origin": "https://learn.zybooks.com",
          "Referer": "https://learn.zybooks.com/",
          "User-Agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
        },
      });
      const usedStoredToken = !req.query.auth_token && !req.headers.authorization;
      if (apiRes.status === 401 && storedTokens && usedStoredToken) {
        console.log(`[Token] Got 401, attempting refresh...`);
        const refreshed = await refreshZybooksToken(storedTokens.refresh_token);
        if (refreshed) {
          auth_token = refreshed.auth_token;
          const retryRes = await fetch(url, {
            headers: {
              "Accept": "application/json, text/javascript, */*; q=0.01",
              "Authorization": `Bearer ${auth_token}`,
              "Origin": "https://learn.zybooks.com",
              "Referer": "https://learn.zybooks.com/",
            },
          });
          if (!retryRes.ok) {
            return res.status(retryRes.status).json({ error: `zyBooks returned ${retryRes.status} after token refresh` });
          }
          const data = await retryRes.json();
          if (data.success === false || data.error) {
            return res.status(400).json({ error: data.error?.message || data.error || "Unknown error" });
          }
          const convertOpts: ConvertOptions = { resolveTemplates: req.query.resolve_templates !== 'false' };
          const markdown = convertZybooksJson(data, Number(chapter), Number(section), convertOpts);
          const title = data.section?.title || `Section ${chapter}.${section}`;
          const format = req.query.format || 'json';
          if (format === 'text') {
            return res.type('text/plain').send(markdown);
          }
          return res.json({ markdown, title, chapter: Number(chapter), section: Number(section) });
        }
        return res.status(401).json({ error: "Auth token expired and refresh failed" });
      }
      if (apiRes.status === 401) {
        return res.status(401).json({ error: "Invalid or expired auth token" });
      }
      if (apiRes.status === 404) {
        return res.status(404).json({ error: `Section ${chapter}.${section} not found` });
      }
      if (!apiRes.ok) {
        return res.status(502).json({ error: `zyBooks server returned ${apiRes.status}` });
      }
      const data = await apiRes.json();
      if (data.success === false || data.error) {
        return res.status(400).json({ error: data.error?.message || data.error || "Unknown error" });
      }
      const convertOpts2: ConvertOptions = { resolveTemplates: req.query.resolve_templates !== 'false' };
      const markdown = convertZybooksJson(data, Number(chapter), Number(section), convertOpts2);
      const title = data.section?.title || `Section ${chapter}.${section}`;
      const format = req.query.format || 'json';
      if (format === 'text') {
        res.type('text/plain').send(markdown);
      } else {
        res.json({ markdown, title, chapter: Number(chapter), section: Number(section) });
      }
    } catch (err: any) {
      return res.status(502).json({ error: err.message || "Failed to fetch/convert section" });
    }
  });

  app.get("/api/notebook-template", (req, res) => {
    const appUrl = `https://${req.headers.host || 'zy-books-formatter.replit.app'}`;
    const notebook = generateColabNotebook(appUrl);
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', 'attachment; filename="zybooks_study_notebook.ipynb"');
    res.send(JSON.stringify(notebook, null, 2));
  });

  app.get("/api/notion/pages", async (_req, res) => {
    try {
      const pages = await listNotionPages();
      return res.json({ pages });
    } catch (err: any) {
      return res.status(500).json({ error: err.message || "Failed to list Notion pages" });
    }
  });

  app.post("/api/notion/send", async (req, res) => {
    try {
      const { markdown, title, parentPageId } = req.body;
      if (!markdown || !title) {
        return res.status(400).json({ error: "Missing markdown or title" });
      }
      const result = await sendToNotion(markdown, title, parentPageId);
      return res.json(result);
    } catch (err: any) {
      return res.status(500).json({ error: err.message || "Failed to send to Notion" });
    }
  });

  app.get("/api", (_req, res) => {
    const baseUrl = `https://${_req.headers.host || 'zy-books-formatter.replit.app'}`;
    res.json({
      name: "zyBooks Formatter API",
      description: "Converts zyBooks textbook sections into clean, readable Markdown. Supports auto token refresh.",
      endpoints: {
        "POST /api/token": {
          description: "Store a zyBooks refresh token for auto-authentication. Only needed once — the app will auto-refresh the auth token.",
          body: { refresh_token: "string (required)", auth_token: "string (optional, current auth token)" },
          example: `curl -X POST ${baseUrl}/api/token -H "Content-Type: application/json" -d '{"refresh_token":"YOUR_REFRESH_TOKEN"}'`,
        },
        "GET /api/token/status": {
          description: "Check if a token is configured and when it expires.",
          example: `curl ${baseUrl}/api/token/status`,
        },
        "GET /api/zybooks-markdown": {
          description: "Fetch and convert a zyBooks section to Markdown. Uses stored token if no auth provided.",
          params: {
            zybook_code: "string (required) — e.g. CPPCS2520NguyenSpring2026",
            chapter: "number (required)",
            section: "number (required)",
            format: "string (optional) — 'json' (default) or 'text' for raw markdown",
            resolve_templates: "string (optional) — 'true' (default) resolves ${...} placeholders to concrete example values; 'false' keeps raw templates",
          },
          auth: "Optional. Bearer token in Authorization header, or auth_token query param. Falls back to stored token.",
          example: `curl "${baseUrl}/api/zybooks-markdown?zybook_code=CPPCS2520NguyenSpring2026&chapter=7&section=1"`,
          example_text: `curl "${baseUrl}/api/zybooks-markdown?zybook_code=CPPCS2520NguyenSpring2026&chapter=7&section=1&format=text"`,
        },
        "GET /api/notebook-template": {
          description: "Download a Colab-ready Jupyter notebook with study helpers.",
          example: `curl -O ${baseUrl}/api/notebook-template`,
        },
        "POST /api/notion/send": {
          description: "Publish markdown content to Notion.",
          body: { markdown: "string (required)", title: "string (required)", parentPageId: "string (optional)" },
        },
      },
      quickstart: [
        `1. Set your refresh token once: curl -X POST ${baseUrl}/api/token -H "Content-Type: application/json" -d '{"refresh_token":"YOUR_TOKEN"}'`,
        `2. Fetch any section: curl "${baseUrl}/api/zybooks-markdown?zybook_code=CPPCS2520NguyenSpring2026&chapter=7&section=1&format=text"`,
        "3. The app auto-refreshes auth tokens — no manual token management needed.",
      ],
    });
  });

  return httpServer;
}

function generateColabNotebook(appUrl: string) {
  const cells = [
    {
      cell_type: "markdown",
      metadata: {},
      source: [
        "# zyBooks Study Notebook\n",
        "\n",
        "This notebook fetches formatted zyBooks content from the **zyBooks Formatter** app and lets you study interactively with Gemini.\n",
        "\n",
        "**Setup:** Run the first cell to configure your connection, then use the helper functions to fetch any section.\n",
        "\n",
        "---"
      ]
    },
    {
      cell_type: "code",
      metadata: {},
      source: [
        "import requests\n",
        "import json\n",
        "from IPython.display import Markdown, display, HTML\n",
        "import os\n",
        "\n",
        "# === CONFIGURATION ===\n",
        `FORMATTER_URL = "${appUrl}"\n`,
        'ZYBOOK_CODE = "CPPCS2520NguyenSpring2026"\n',
        "\n",
        "# Option 1: Store your refresh token on the server (recommended, auto-refreshes)\n",
        "#   Run this once: requests.post(f'{FORMATTER_URL}/api/token', json={'refresh_token': 'YOUR_TOKEN'})\n",
        "# Option 2: Set auth token manually (expires in ~24h)\n",
        'AUTH_TOKEN = ""  # Leave empty to use server-stored token\n',
        "\n",
        "def fetch_section(chapter, section, display_markdown=True):\n",
        '    """Fetch a formatted zyBooks section as markdown."""\n',
        "    params = {\n",
        '        "zybook_code": ZYBOOK_CODE,\n',
        '        "chapter": chapter,\n',
        '        "section": section\n',
        "    }\n",
        '    headers = {"Authorization": f"Bearer {AUTH_TOKEN}"} if AUTH_TOKEN else {}\n',
        '    resp = requests.get(f"{FORMATTER_URL}/api/zybooks-markdown", params=params, headers=headers)\n',
        "    if resp.status_code != 200:\n",
        '        print(f"Error {resp.status_code}: {resp.json().get(\'error\', \'Unknown error\')}")\n',
        "        return None\n",
        "    data = resp.json()\n",
        "    md = data['markdown']\n",
        "    if display_markdown:\n",
        "        display(Markdown(md))\n",
        "    return md\n",
        "\n",
        "def fetch_chapter(chapter, sections=None):\n",
        '    """Fetch all sections of a chapter. Returns dict of section->markdown."""\n',
        "    results = {}\n",
        "    sec = 1\n",
        "    if sections:\n",
        "        for s in sections:\n",
        "            md = fetch_section(chapter, s, display_markdown=False)\n",
        "            if md:\n",
        "                results[s] = md\n",
        "    else:\n",
        "        while True:\n",
        "            md = fetch_section(chapter, sec, display_markdown=False)\n",
        "            if md is None:\n",
        "                break\n",
        "            results[sec] = md\n",
        "            sec += 1\n",
        '    print(f"Fetched {len(results)} sections from Chapter {chapter}")\n',
        "    return results\n",
        "\n",
        "def save_chapter_md(chapter, sections_dict, filename=None):\n",
        '    """Save chapter content to a markdown file."""\n',
        '    fname = filename or f"Chapter_{chapter}.md"\n',
        '    combined = "\\n\\n---\\n\\n".join(sections_dict.values())\n',
        '    with open(fname, "w") as f:\n',
        "        f.write(combined)\n",
        '    print(f"Saved {fname} ({len(combined):,} characters)")\n',
        "    return fname\n",
        "\n",
        "def publish_to_notion(title, markdown, parent_page_id=None):\n",
        '    """Publish markdown content as a new Notion page."""\n',
        '    resp = requests.post(f"{FORMATTER_URL}/api/notion/send", json={\n',
        '        "markdown": markdown,\n',
        '        "title": title,\n',
        '        "parentPageId": parent_page_id\n',
        "    })\n",
        "    if resp.status_code != 200:\n",
        '        print(f"Error: {resp.json().get(\'error\', \'Unknown error\')}")\n',
        "        return None\n",
        "    result = resp.json()\n",
        '    print(f"Published to Notion: {result.get(\'url\', \'(no URL returned)\')}")\n',
        "    return result\n",
        "\n",
        'print("zyBooks Formatter connected!")\n',
        'print(f"App: {FORMATTER_URL}")\n',
        'print(f"Book: {ZYBOOK_CODE}")\n',
        'status = requests.get(f"{FORMATTER_URL}/api/token/status").json()\n',
        'if status.get("configured"):\n',
        '    print(f"Server token: ✓ configured (expires in {status[\'expires_in_hours\']}h)")\n',
        'elif AUTH_TOKEN:\n',
        '    print("Using manual AUTH_TOKEN")\n',
        'else:\n',
        '    print("⚠ No token configured! Set AUTH_TOKEN above or run: requests.post(f\'{FORMATTER_URL}/api/token\', json={\'refresh_token\': \'YOUR_TOKEN\'})")'
      ],
      execution_count: null,
      outputs: []
    },
    {
      cell_type: "markdown",
      metadata: {},
      source: [
        "## Quick Start\n",
        "\n",
        "Run any of these to get started:"
      ]
    },
    {
      cell_type: "code",
      metadata: {},
      source: [
        "# Fetch a single section and display it\n",
        "fetch_section(7, 5)"
      ],
      execution_count: null,
      outputs: []
    },
    {
      cell_type: "code",
      metadata: {},
      source: [
        "# Fetch an entire chapter\n",
        "ch7 = fetch_chapter(7)\n",
        "\n",
        "# Display a specific section\n",
        "if 1 in ch7:\n",
        "    display(Markdown(ch7[1]))"
      ],
      execution_count: null,
      outputs: []
    },
    {
      cell_type: "code",
      metadata: {},
      source: [
        "# Save chapter to a .md file (accessible in Colab's file browser)\n",
        "ch7 = fetch_chapter(7)\n",
        'save_chapter_md(7, ch7, "Chapter_7.md")'
      ],
      execution_count: null,
      outputs: []
    },
    {
      cell_type: "markdown",
      metadata: {},
      source: [
        "## Publish to Notion\n",
        "\n",
        "Send your study notes or formatted content to Notion:"
      ]
    },
    {
      cell_type: "code",
      metadata: {},
      source: [
        "# Publish a single section to Notion\n",
        "md = fetch_section(7, 5, display_markdown=False)\n",
        'publish_to_notion("7.5 LAB: Checker for integer string", md)'
      ],
      execution_count: null,
      outputs: []
    },
    {
      cell_type: "code",
      metadata: {},
      source: [
        "# Publish an entire chapter to Notion\n",
        "ch7 = fetch_chapter(7)\n",
        'combined = "\\n\\n---\\n\\n".join(ch7.values())\n',
        'publish_to_notion("Chapter 7: String Slicing", combined)'
      ],
      execution_count: null,
      outputs: []
    },
    {
      cell_type: "markdown",
      metadata: {},
      source: [
        "## Study with Gemini\n",
        "\n",
        "After fetching content, you can ask Gemini (in the sidebar) questions about it!\n",
        "\n",
        "**Tips:**\n",
        "- Fetch a section, then ask Gemini to explain a concept\n",
        "- Ask Gemini to create practice problems based on the content\n",
        "- Use the test cases from LAB activities to check your solutions\n",
        "- Ask Gemini to walk through participation activities step by step"
      ]
    },
    {
      cell_type: "code",
      metadata: {},
      source: [
        "# Load a section and save it so Gemini can read it\n",
        "md = fetch_section(7, 1, display_markdown=False)\n",
        'with open("current_section.md", "w") as f:\n',
        "    f.write(md)\n",
        'print("Section saved to current_section.md - ask Gemini about it!")\n',
        "display(Markdown(md))"
      ],
      execution_count: null,
      outputs: []
    }
  ];

  return {
    nbformat: 4,
    nbformat_minor: 0,
    metadata: {
      colab: {
        provenance: [],
        name: "zyBooks Study Notebook"
      },
      kernelspec: {
        name: "python3",
        display_name: "Python 3"
      },
      language_info: {
        name: "python"
      }
    },
    cells
  };
}
