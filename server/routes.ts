import type { Express } from "express";
import express from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { sendToNotion, listNotionPages } from "./notion";

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

let pendingBookmarkletHtml: { html: string; timestamp: number } | null = null;

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
    const { html } = req.body;
    if (!html || typeof html !== "string") {
      return res.status(400).json({ error: "Missing html" });
    }
    pendingBookmarkletHtml = { html, timestamp: Date.now() };
    return res.json({ ok: true });
  });

  app.get("/api/bookmarklet/pending", (_req, res) => {
    if (pendingBookmarkletHtml && Date.now() - pendingBookmarkletHtml.timestamp < 60000) {
      const html = pendingBookmarkletHtml.html;
      pendingBookmarkletHtml = null;
      return res.json({ html });
    }
    return res.json({ html: null });
  });
  app.get("/api/zybooks-section", async (req, res) => {
    try {
      const { auth_token, zybook_code, chapter, section } = req.query;
      if (!auth_token || !zybook_code || !chapter || !section) {
        return res.status(400).json({ error: "Missing required params: auth_token, zybook_code, chapter, section" });
      }
      const url = `https://zyserver.zybooks.com/v1/zybook/${zybook_code}/chapter/${chapter}/section/${section}?auth_token=${auth_token}`;
      const apiRes = await fetch(url, {
        headers: { "Accept": "application/json" },
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
  if (!html.trim()) { status.className="status error"; status.textContent="Content is empty."; return; }
  btn.disabled = true; btn.textContent = "Submitting...";
  status.className="status"; status.style.display="none";
  try {
    const res = await fetch("/api/bookmarklet", {
      method: "POST",
      headers: {"Content-Type": "application/json"},
      body: JSON.stringify({ html: html, url: url || undefined })
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

  return httpServer;
}
