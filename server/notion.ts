// Notion integration via Replit connector (conn_notion_01KBSDYSFRNDYQGDCYTS324AKY)
import { Client } from '@notionhq/client';

let connectionSettings: any;

async function getAccessToken() {
  if (connectionSettings && connectionSettings.settings.expires_at && new Date(connectionSettings.settings.expires_at).getTime() > Date.now()) {
    return connectionSettings.settings.access_token;
  }

  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
  const xReplitToken = process.env.REPL_IDENTITY
    ? 'repl ' + process.env.REPL_IDENTITY
    : process.env.WEB_REPL_RENEWAL
    ? 'depl ' + process.env.WEB_REPL_RENEWAL
    : null;

  if (!xReplitToken) {
    throw new Error('X-Replit-Token not found for repl/depl');
  }

  connectionSettings = await fetch(
    'https://' + hostname + '/api/v2/connection?include_secrets=true&connector_names=notion',
    {
      headers: {
        'Accept': 'application/json',
        'X-Replit-Token': xReplitToken
      }
    }
  ).then(res => res.json()).then(data => data.items?.[0]);

  const accessToken = connectionSettings?.settings?.access_token || connectionSettings.settings?.oauth?.credentials?.access_token;

  if (!connectionSettings || !accessToken) {
    throw new Error('Notion not connected');
  }
  return accessToken;
}

// WARNING: Never cache this client.
export async function getUncachableNotionClient() {
  const accessToken = await getAccessToken();
  return new Client({ auth: accessToken });
}

type NotionBlock = any;

function markdownToNotionBlocks(markdown: string): NotionBlock[] {
  const lines = markdown.split('\n');
  const blocks: NotionBlock[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    if (line.trim() === '') {
      i++;
      continue;
    }

    if (line.startsWith('```')) {
      const lang = line.slice(3).trim() || 'plain text';
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].startsWith('```')) {
        codeLines.push(lines[i]);
        i++;
      }
      i++;
      const codeText = codeLines.join('\n');
      if (codeText.trim()) {
        blocks.push({
          object: 'block',
          type: 'code',
          code: {
            rich_text: [{ type: 'text', text: { content: codeText.substring(0, 2000) } }],
            language: lang === 'python' ? 'python' : 'plain text',
          }
        });
      }
      continue;
    }

    if (line.startsWith('# ')) {
      blocks.push({
        object: 'block',
        type: 'heading_1',
        heading_1: { rich_text: parseInlineFormatting(line.slice(2).trim()) }
      });
      i++;
      continue;
    }

    if (line.startsWith('### ')) {
      blocks.push({
        object: 'block',
        type: 'heading_3',
        heading_3: { rich_text: parseInlineFormatting(line.slice(4).trim()) }
      });
      i++;
      continue;
    }

    if (line.startsWith('## ')) {
      blocks.push({
        object: 'block',
        type: 'heading_2',
        heading_2: { rich_text: parseInlineFormatting(line.slice(3).trim()) }
      });
      i++;
      continue;
    }

    if (/^[-*]\s+/.test(line)) {
      const bulletLines: string[] = [];
      while (i < lines.length && /^[-*]\s+/.test(lines[i])) {
        bulletLines.push(lines[i].replace(/^[-*]\s+/, ''));
        i++;
      }
      for (const bLine of bulletLines) {
        blocks.push({
          object: 'block',
          type: 'bulleted_list_item',
          bulleted_list_item: { rich_text: parseInlineFormatting(bLine) }
        });
      }
      continue;
    }

    if (/^\d+\.\s+/.test(line)) {
      const numLines: string[] = [];
      while (i < lines.length && /^\d+\.\s+/.test(lines[i])) {
        numLines.push(lines[i].replace(/^\d+\.\s+/, ''));
        i++;
      }
      for (const nLine of numLines) {
        blocks.push({
          object: 'block',
          type: 'numbered_list_item',
          numbered_list_item: { rich_text: parseInlineFormatting(nLine) }
        });
      }
      continue;
    }

    const paraLines: string[] = [line];
    i++;
    while (i < lines.length && lines[i].trim() !== '' && !lines[i].startsWith('#') && !lines[i].startsWith('```') && !/^[-*]\s+/.test(lines[i]) && !/^\d+\.\s+/.test(lines[i])) {
      paraLines.push(lines[i]);
      i++;
    }
    const paraText = paraLines.join('\n');
    blocks.push({
      object: 'block',
      type: 'paragraph',
      paragraph: { rich_text: parseInlineFormatting(paraText) }
    });
  }

  return blocks;
}

function parseInlineFormatting(text: string): any[] {
  const parts: any[] = [];
  const regex = /(\*\*(.+?)\*\*)|(`([^`]+?)`)|(_([^_]+?)_)/g;
  let lastIndex = 0;
  let match;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push({
        type: 'text',
        text: { content: text.slice(lastIndex, match.index) },
      });
    }

    if (match[1]) {
      parts.push({
        type: 'text',
        text: { content: match[2] },
        annotations: { bold: true },
      });
    } else if (match[3]) {
      parts.push({
        type: 'text',
        text: { content: match[4] },
        annotations: { code: true },
      });
    } else if (match[5]) {
      parts.push({
        type: 'text',
        text: { content: match[6] },
        annotations: { italic: true },
      });
    }

    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) {
    parts.push({
      type: 'text',
      text: { content: text.slice(lastIndex) },
    });
  }

  if (parts.length === 0) {
    parts.push({ type: 'text', text: { content: text } });
  }

  return parts;
}

export async function listNotionPages(): Promise<{ id: string; title: string }[]> {
  const notion = await getUncachableNotionClient();
  const response = await notion.search({
    filter: { property: 'object', value: 'page' },
    page_size: 50,
  });
  return response.results.map((page: any) => {
    const titleProp = page.properties?.title?.title?.[0]?.plain_text
      || page.properties?.Name?.title?.[0]?.plain_text
      || 'Untitled';
    return { id: page.id, title: titleProp };
  });
}

export async function sendToNotion(
  markdown: string,
  title: string,
  parentPageId?: string
): Promise<{ pageUrl: string }> {
  const notion = await getUncachableNotionClient();
  const blocks = markdownToNotionBlocks(markdown);

  let parent: any;
  if (parentPageId) {
    parent = { page_id: parentPageId };
  } else {
    const searchRes = await notion.search({
      filter: { property: 'object', value: 'page' },
      page_size: 1,
    });
    if (searchRes.results.length > 0) {
      parent = { page_id: searchRes.results[0].id };
    } else {
      throw new Error('No Notion pages found. Please share at least one page with the integration.');
    }
  }

  const batchSize = 100;
  const firstBatch = blocks.slice(0, batchSize);

  const page = await notion.pages.create({
    parent,
    properties: {
      title: [{ type: 'text', text: { content: title } }],
    },
    children: firstBatch,
  });

  for (let start = batchSize; start < blocks.length; start += batchSize) {
    const batch = blocks.slice(start, start + batchSize);
    await notion.blocks.children.append({
      block_id: page.id,
      children: batch,
    });
  }

  return { pageUrl: page.url };
}
