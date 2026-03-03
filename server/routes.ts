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
