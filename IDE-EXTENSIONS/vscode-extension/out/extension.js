"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/chat/MemoryChatParticipant.ts
var MemoryChatParticipant_exports = {};
__export(MemoryChatParticipant_exports, {
  CHAT_PARTICIPANT_ID: () => CHAT_PARTICIPANT_ID,
  SLASH_COMMANDS: () => SLASH_COMMANDS,
  registerMemoryChatParticipant: () => registerMemoryChatParticipant
});
function registerMemoryChatParticipant(context, memoryService) {
  const participant = vscode14.chat.createChatParticipant(
    CHAT_PARTICIPANT_ID,
    createChatRequestHandler(memoryService)
  );
  participant.iconPath = vscode14.Uri.joinPath(context.extensionUri, "images", "icon.png");
  participant.onDidReceiveFeedback((feedback) => {
    console.log("[MemoryChatParticipant] Received feedback:", feedback.kind);
  });
  context.subscriptions.push(participant);
  console.log("[MemoryChatParticipant] @lanonasis chat participant registered");
  return participant;
}
function createChatRequestHandler(memoryService) {
  return async (request, context, stream, token) => {
    const { prompt, command } = request;
    try {
      if (command) {
        return await handleSlashCommand(command, prompt, memoryService, stream, token);
      }
      return await handleSemanticQuery(prompt, memoryService, stream, context, token);
    } catch (error) {
      stream.markdown(`\u274C **Error:** ${error instanceof Error ? error.message : "An unexpected error occurred"}`);
      return { errorDetails: { message: error instanceof Error ? error.message : "Unknown error" } };
    }
  };
}
async function handleSlashCommand(command, prompt, memoryService, stream, token) {
  switch (command) {
    case "recall":
      return await handleRecallCommand(prompt, memoryService, stream, token);
    case "save":
      return await handleSaveCommand(prompt, stream);
    case "list":
      return await handleListCommand(memoryService, stream, token);
    case "context":
      return await handleContextCommand(prompt, memoryService, stream, token);
    case "refine":
      return await handleRefineCommand(prompt, memoryService, stream, token);
    default:
      stream.markdown(`Unknown command: \`/${command}\`. Available commands: ${SLASH_COMMANDS.map((c) => `/${c.name}`).join(", ")}`);
      return {};
  }
}
async function handleRecallCommand(query, memoryService, stream, token) {
  if (!query.trim()) {
    stream.markdown("Please provide a search query. Example: `@lanonasis /recall how to deploy to production`");
    return {};
  }
  stream.progress("Searching memories...");
  const results = await memoryService.searchMemories(query, { limit: 5 });
  if (token.isCancellationRequested) {
    return { errorDetails: { message: "Search cancelled" } };
  }
  if (results.length === 0) {
    stream.markdown(`No memories found for "${query}". Try a different search term or create new memories.`);
    stream.button({
      command: "lanonasis.createMemoryFromFile",
      title: "\u{1F4DD} Create Memory"
    });
    return {};
  }
  stream.markdown(`## \u{1F9E0} Found ${results.length} relevant memories

`);
  results.forEach((result, index) => {
    stream.markdown(`### ${index + 1}. ${result.title}
`);
    stream.markdown(`${result.content.substring(0, 300)}${result.content.length > 300 ? "..." : ""}

`);
    if (result.tags && result.tags.length > 0) {
      stream.markdown(`*Tags: ${result.tags.join(", ")}*

`);
    }
    stream.markdown("---\n\n");
  });
  stream.button({
    command: "lanonasis.searchMemory",
    title: "\u{1F50D} Search More"
  });
  return {
    metadata: {
      command: "recall",
      resultCount: results.length
    }
  };
}
async function handleSaveCommand(title, stream) {
  const editor = vscode14.window.activeTextEditor;
  if (editor && !editor.selection.isEmpty) {
    stream.markdown("\u{1F4BE} Saving selected text as a memory...\n\n");
    stream.button({
      command: "lanonasis.createMemory",
      title: "\u{1F4DD} Create from Selection"
    });
  } else {
    stream.markdown("To save a memory:\n\n");
    stream.markdown("1. **Select text** in the editor and run `@lanonasis /save`\n");
    stream.markdown("2. Use **Quick Capture** with `\u2318\u21E7S` / `Ctrl+Shift+S`\n");
    stream.markdown("3. Or click below to create from clipboard:\n\n");
    stream.button({
      command: "lanonasis.captureClipboard",
      title: "\u{1F4CB} Capture Clipboard"
    });
  }
  if (title.trim()) {
    stream.markdown(`
*Suggested title: "${title}"*`);
  }
  return {};
}
async function handleListCommand(memoryService, stream, token) {
  stream.progress("Loading memories...");
  const memories = await memoryService.listMemories(10);
  if (token.isCancellationRequested) {
    return { errorDetails: { message: "List cancelled" } };
  }
  if (!memories || memories.length === 0) {
    stream.markdown("\u{1F4ED} No memories found. Start building your memory bank!\n\n");
    stream.button({
      command: "lanonasis.createMemoryFromFile",
      title: "\u{1F4DD} Create First Memory"
    });
    return {};
  }
  stream.markdown(`## \u{1F4DA} Recent Memories (${memories.length})

`);
  memories.forEach((memory, index) => {
    const typeEmoji = getTypeEmoji(memory.memory_type);
    stream.markdown(`${index + 1}. ${typeEmoji} **${memory.title}** - _${memory.memory_type}_
`);
  });
  stream.markdown("\n");
  stream.button({
    command: "lanonasis.searchMemory",
    title: "\u{1F50D} Search Memories"
  });
  return {
    metadata: {
      command: "list",
      count: memories.length
    }
  };
}
async function handleContextCommand(additionalQuery, memoryService, stream, token) {
  const editor = vscode14.window.activeTextEditor;
  const fileName = editor?.document.fileName || "";
  const fileExtension = fileName.split(".").pop() || "";
  const workspaceName = vscode14.workspace.name || "";
  const contextTerms = [];
  if (workspaceName) contextTerms.push(workspaceName);
  if (fileExtension) contextTerms.push(fileExtension);
  if (additionalQuery) contextTerms.push(additionalQuery);
  const query = contextTerms.join(" ") || "development context";
  stream.progress(`Finding relevant context for ${fileName ? `"${fileName.split("/").pop()}"` : "your workspace"}...`);
  const results = await memoryService.searchMemories(query, { limit: 5 });
  if (token.isCancellationRequested) {
    return { errorDetails: { message: "Context search cancelled" } };
  }
  stream.markdown(`## \u{1F4D1} Relevant Context

`);
  if (results.length === 0) {
    stream.markdown(`No relevant memories found for the current context.

`);
    stream.markdown(`*Search terms: ${query}*

`);
  } else {
    stream.markdown(`Found ${results.length} relevant memories:

`);
    results.forEach((result, index) => {
      stream.markdown(`### ${index + 1}. ${result.title}
`);
      stream.markdown(`${result.content.substring(0, 200)}...

`);
    });
  }
  stream.markdown(`
\u{1F4A1} *Tip: Use \`@lanonasis /save\` to save important context for later.*`);
  return {
    metadata: {
      command: "context",
      query,
      resultCount: results.length
    }
  };
}
async function handleSemanticQuery(prompt, memoryService, stream, context, token) {
  if (!prompt.trim()) {
    stream.markdown("\u{1F44B} **Welcome to LanOnasis Memory!**\n\n");
    stream.markdown("I can help you manage your knowledge and context. Try:\n\n");
    stream.markdown("- `@lanonasis /recall <query>` - Search memories\n");
    stream.markdown("- `@lanonasis /save` - Save current selection\n");
    stream.markdown("- `@lanonasis /list` - View recent memories\n");
    stream.markdown("- `@lanonasis /context` - Get context for current file\n\n");
    stream.markdown("Or just ask me anything about your stored knowledge!\n");
    return {};
  }
  stream.progress("Searching your memory bank...");
  const results = await memoryService.searchMemories(prompt, { limit: 5 });
  if (token.isCancellationRequested) {
    return { errorDetails: { message: "Cancelled" } };
  }
  if (results.length === 0) {
    stream.markdown(`I couldn't find any memories related to "${prompt}".

`);
    stream.markdown(`Would you like to:
`);
    stream.button({
      command: "lanonasis.createMemory",
      title: "\u{1F4DD} Create Memory"
    });
    stream.button({
      command: "lanonasis.searchMemory",
      title: "\u{1F50D} Try Different Search"
    });
    return {};
  }
  stream.markdown(`## \u{1F9E0} Based on your memories:

`);
  const topResult = results[0];
  stream.markdown(`**Most relevant:** ${topResult.title}

`);
  stream.markdown(`${topResult.content}

`);
  if (results.length > 1) {
    stream.markdown(`---

**Related memories:**
`);
    results.slice(1).forEach((result, index) => {
      stream.markdown(`${index + 2}. ${result.title}
`);
    });
  }
  const refined = await maybeCallRefineEndpoint(prompt, results);
  if (refined) {
    stream.markdown(`
### \u2728 Refined Prompt Suggestion
\`\`\`
${refined}
\`\`\`
`);
  }
  return {
    metadata: {
      query: prompt,
      resultCount: results.length,
      topMemory: topResult.id
    }
  };
}
function getTypeEmoji(type) {
  const emojiMap = {
    context: "\u{1F4AD}",
    knowledge: "\u{1F4DA}",
    project: "\u{1F4C1}",
    reference: "\u{1F517}",
    personal: "\u{1F464}",
    workflow: "\u2699\uFE0F",
    conversation: "\u{1F4AC}"
  };
  return emojiMap[type] || "\u{1F4DD}";
}
async function handleRefineCommand(prompt, memoryService, stream, token) {
  if (!prompt.trim()) {
    stream.markdown("Paste a prompt to refine. Example: `@lanonasis /refine Generate a deployment checklist`");
    return {};
  }
  stream.progress("Retrieving context for refinement...");
  const results = await memoryService.searchMemories(prompt, { limit: 5 });
  if (token.isCancellationRequested) return { errorDetails: { message: "Refine cancelled" } };
  const refined = await maybeCallRefineEndpoint(prompt, results);
  stream.markdown("### \u2728 Refined Prompt\n");
  stream.markdown("```\n" + refined + "\n```");
  if (results.length) {
    stream.markdown("\n#### Context used\n");
    results.forEach((r, idx) => {
      stream.markdown(`${idx + 1}. ${r.title}${r.tags?.length ? ` \u2014 tags: ${r.tags.join(", ")}` : ""}`);
    });
  }
  return {
    metadata: {
      command: "refine",
      resultCount: results.length
    }
  };
}
function buildRefinedPrompt(prompt, results) {
  const top = results.slice(0, 3).map((r) => `- ${r.title}${r.tags?.length ? ` (tags: ${r.tags.join(", ")})` : ""}`).join("\n");
  const contextBlock = top ? `Context:
${top}

` : "";
  return `${contextBlock}Task: ${prompt}

Please use the above context, be concise, and include any relevant IDs, tags, or steps.`;
}
async function maybeCallRefineEndpoint(prompt, results) {
  const refinedLocal = buildRefinedPrompt(prompt, results);
  const config = vscode14.workspace.getConfiguration("lanonasis");
  const endpoint = config.get("refineEndpoint");
  const apiKey = config.get("refineApiKey");
  if (!endpoint || !apiKey) {
    return refinedLocal;
  }
  try {
    const payload = {
      prompt,
      context: results.slice(0, 5).map((r) => ({
        title: r.title,
        tags: r.tags,
        snippet: r.content?.substring(0, 500) || ""
      }))
    };
    const resp = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`
      },
      body: JSON.stringify(payload)
    });
    if (!resp.ok) {
      return refinedLocal;
    }
    const data = await resp.json();
    const refined = data?.refinedPrompt || data?.refined_prompt || data?.prompt;
    return typeof refined === "string" && refined.trim().length > 0 ? refined : refinedLocal;
  } catch (err) {
    console.warn("[lanonasis] refine endpoint failed, falling back to local prompt builder", err);
    return refinedLocal;
  }
}
var vscode14, CHAT_PARTICIPANT_ID, SLASH_COMMANDS;
var init_MemoryChatParticipant = __esm({
  "src/chat/MemoryChatParticipant.ts"() {
    "use strict";
    vscode14 = __toESM(require("vscode"));
    CHAT_PARTICIPANT_ID = "lanonasis-memory.memory-assistant";
    SLASH_COMMANDS = [
      { name: "recall", description: "Search and recall memories semantically" },
      { name: "save", description: "Save current context or selection as a memory" },
      { name: "list", description: "List recent memories" },
      { name: "context", description: "Get relevant context for current file/project" },
      { name: "refine", description: "Refine a prompt using your memories as context" }
    ];
  }
});

// src/extension.ts
var extension_exports = {};
__export(extension_exports, {
  activate: () => activate,
  deactivate: () => deactivate
});
module.exports = __toCommonJS(extension_exports);
var vscode15 = __toESM(require("vscode"));

// src/providers/MemoryTreeProvider.ts
var vscode = __toESM(require("vscode"));
var MemoryTreeItem = class extends vscode.TreeItem {
  constructor(memory, collapsibleState) {
    super(memory.title, collapsibleState);
    this.memory = memory;
    this.tooltip = `${memory.title}

Type: ${memory.memory_type}
Created: ${new Date(memory.created_at).toLocaleDateString()}

${memory.content.substring(0, 200)}${memory.content.length > 200 ? "..." : ""}`;
    this.description = memory.memory_type;
    this.contextValue = "memory";
    this.iconPath = this.getIconForMemoryType(memory.memory_type);
    this.command = {
      command: "lanonasis.openMemory",
      title: "Open Memory",
      arguments: [memory]
    };
  }
  getIconForMemoryType(type) {
    switch (type) {
      case "knowledge":
        return new vscode.ThemeIcon("book");
      case "project":
        return new vscode.ThemeIcon("project");
      case "context":
        return new vscode.ThemeIcon("info");
      case "reference":
        return new vscode.ThemeIcon("references");
      default:
        return new vscode.ThemeIcon("file");
    }
  }
};
var MemoryTypeTreeItem = class extends vscode.TreeItem {
  constructor(memoryType, memories, collapsibleState) {
    super(memoryType, collapsibleState);
    this.memoryType = memoryType;
    this.memories = memories;
    this.tooltip = `${memoryType} (${memories.length} memories)`;
    this.description = `${memories.length} memories`;
    this.contextValue = "memoryType";
    this.iconPath = new vscode.ThemeIcon("folder");
  }
};
var MemoryTreeProvider = class {
  constructor(memoryService) {
    this.memoryService = memoryService;
    this._onDidChangeTreeData = new vscode.EventEmitter();
    this.onDidChangeTreeData = this._onDidChangeTreeData.event;
    this.memories = [];
    this.loading = false;
    this.authenticated = false;
    this.authenticated = this.memoryService.isAuthenticated();
    if (this.authenticated) {
      void this.loadMemories();
    }
  }
  async loadMemories() {
    if (!this.authenticated) {
      this.memories = [];
      this.loading = false;
      this._onDidChangeTreeData.fire();
      return;
    }
    try {
      this.loading = true;
      this.memories = await this.memoryService.listMemories(100);
    } catch (error) {
      this.memories = [];
      if (!(error instanceof Error && error.message.includes("Not authenticated"))) {
        vscode.window.showErrorMessage(`Failed to load memories: ${error instanceof Error ? error.message : "Unknown error"}`);
      }
    } finally {
      this.loading = false;
      this._onDidChangeTreeData.fire();
    }
  }
  refresh() {
    if (!this.authenticated) {
      this.clear();
      return;
    }
    void this.loadMemories();
  }
  setAuthenticated(authenticated) {
    this.authenticated = authenticated;
    if (authenticated) {
      void this.loadMemories();
    } else {
      this.clear();
    }
  }
  clear() {
    this.loading = false;
    this.memories = [];
    this._onDidChangeTreeData.fire();
  }
  getTreeItem(element) {
    return element;
  }
  getChildren(element) {
    if (!this.authenticated) {
      return Promise.resolve([]);
    }
    if (this.loading) {
      return Promise.resolve([]);
    }
    if (!element) {
      return Promise.resolve(this.getMemoryTypeGroups());
    }
    if (element instanceof MemoryTypeTreeItem) {
      return Promise.resolve(
        element.memories.map(
          (memory) => new MemoryTreeItem(memory, vscode.TreeItemCollapsibleState.None)
        )
      );
    }
    return Promise.resolve([]);
  }
  getMemoryTypeGroups() {
    const memoryTypes = ["knowledge", "project", "context", "reference", "personal", "workflow"];
    const groups = [];
    for (const type of memoryTypes) {
      const memoriesForType = this.memories.filter((memory) => memory.memory_type === type);
      if (memoriesForType.length > 0) {
        groups.push(new MemoryTypeTreeItem(
          type,
          memoriesForType,
          vscode.TreeItemCollapsibleState.Collapsed
        ));
      }
    }
    return groups;
  }
  getParent(element) {
    if (!this.authenticated) {
      return null;
    }
    if (element instanceof MemoryTreeItem) {
      const memoryType = element.memory.memory_type;
      const memoriesForType = this.memories.filter((memory) => memory.memory_type === memoryType);
      return new MemoryTypeTreeItem(memoryType, memoriesForType, vscode.TreeItemCollapsibleState.Collapsed);
    }
    return null;
  }
};

// src/providers/MemoryCompletionProvider.ts
var vscode2 = __toESM(require("vscode"));
var MemoryCompletionProvider = class {
  // 5 minutes
  constructor(memoryService) {
    this.memoryService = memoryService;
    this.cache = /* @__PURE__ */ new Map();
    this.cacheTimeout = 5 * 60 * 1e3;
  }
  async provideCompletionItems(document, position, _token, context) {
    if (!this.memoryService.isAuthenticated()) {
      return [];
    }
    const line = document.lineAt(position);
    const lineText = line.text.substring(0, position.character);
    const query = this.extractQuery(lineText, context.triggerCharacter);
    if (!query || query.length < 2) {
      return [];
    }
    try {
      const memories = await this.searchWithCache(query);
      return this.createCompletionItems(memories, query, context.triggerCharacter, document.languageId);
    } catch (error) {
      console.error("Memory completion error:", error);
      return [];
    }
  }
  extractQuery(lineText, triggerCharacter) {
    if (!triggerCharacter) {
      return "";
    }
    const lastTriggerIndex = lineText.lastIndexOf(triggerCharacter);
    if (lastTriggerIndex === -1) {
      return "";
    }
    return lineText.substring(lastTriggerIndex + 1).trim();
  }
  async searchWithCache(query) {
    const cacheKey = query.toLowerCase();
    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      return cached.results;
    }
    const results = await this.memoryService.searchMemories(query, {
      limit: 10,
      threshold: 0.6
    });
    this.cache.set(cacheKey, {
      results,
      timestamp: Date.now()
    });
    this.cleanCache();
    return results;
  }
  cleanCache() {
    const now = Date.now();
    for (const [key, value] of this.cache.entries()) {
      if (now - value.timestamp > this.cacheTimeout) {
        this.cache.delete(key);
      }
    }
  }
  createCompletionItems(memories, _query, triggerCharacter, languageId = "typescript") {
    return memories.map((memory, index) => {
      const item = new vscode2.CompletionItem(
        memory.title,
        vscode2.CompletionItemKind.Snippet
      );
      let insertText;
      let documentation;
      switch (triggerCharacter) {
        case "@":
          insertText = `@memory:${memory.id} (${memory.title})`;
          documentation = `**Memory Reference**

${memory.content.substring(0, 300)}${memory.content.length > 300 ? "..." : ""}`;
          break;
        case "#":
          insertText = this.formatAsComment(memory, languageId);
          documentation = `**Insert Memory as Comment**

${memory.content}`;
          break;
        case "//":
          insertText = this.formatAsSnippet(memory);
          documentation = `**Code Snippet from Memory**

${memory.content}`;
          break;
        default:
          insertText = memory.content;
          documentation = memory.content;
      }
      item.insertText = insertText;
      item.documentation = new vscode2.MarkdownString(documentation);
      item.detail = `${memory.memory_type} \u2022 ${new Date(memory.created_at).toLocaleDateString()} \u2022 Score: ${Math.round(memory.similarity_score * 100)}%`;
      item.filterText = `${memory.title} ${memory.tags?.join(" ")} ${memory.memory_type}`;
      item.sortText = String(1 - memory.similarity_score).padStart(5, "0") + String(index).padStart(3, "0");
      item.command = {
        command: "lanonasis.openMemory",
        title: "Open Memory",
        arguments: [memory]
      };
      return item;
    });
  }
  formatAsComment(memory, languageId) {
    const commentPrefix = this.getCommentPrefix(languageId);
    const lines = memory.content.split("\n");
    return lines.map((line) => `${commentPrefix} ${line}`).join("\n");
  }
  formatAsSnippet(memory) {
    const codeBlockRegex = /```[\s\S]*?```/g;
    const codeBlocks = memory.content.match(codeBlockRegex);
    if (codeBlocks && codeBlocks.length > 0) {
      return codeBlocks[0].replace(/```\w*\n?/g, "").replace(/```$/g, "");
    }
    return memory.content.substring(0, 500);
  }
  getCommentPrefix(languageId) {
    const commentPrefixes = {
      "javascript": "//",
      "typescript": "//",
      "java": "//",
      "c": "//",
      "cpp": "//",
      "csharp": "//",
      "go": "//",
      "rust": "//",
      "swift": "//",
      "kotlin": "//",
      "scala": "//",
      "python": "#",
      "ruby": "#",
      "perl": "#",
      "shell": "#",
      "bash": "#",
      "powershell": "#",
      "yaml": "#",
      "dockerfile": "#",
      "html": "<!--",
      "xml": "<!--",
      "css": "/*",
      "scss": "//",
      "less": "//",
      "sql": "--",
      "lua": "--",
      "vim": '"',
      "r": "#"
    };
    return commentPrefixes[languageId] || "//";
  }
  resolveCompletionItem(item, _token) {
    return item;
  }
};

// src/providers/ApiKeyTreeProvider.ts
var vscode3 = __toESM(require("vscode"));
var ApiKeyTreeItem = class extends vscode3.TreeItem {
  constructor(apiKey, collapsibleState) {
    super(apiKey.name, collapsibleState);
    this.apiKey = apiKey;
    this.tooltip = `${apiKey.name}
Type: ${apiKey.keyType}
Environment: ${apiKey.environment}
Access Level: ${apiKey.accessLevel}`;
    this.description = `${apiKey.environment} \u2022 ${apiKey.keyType}`;
    this.contextValue = "apiKey";
    this.iconPath = this.getIconForKeyType(apiKey.keyType);
    if (apiKey.expiresAt) {
      const expiresAt = new Date(apiKey.expiresAt);
      const now = /* @__PURE__ */ new Date();
      const daysUntilExpiry = Math.floor((expiresAt.getTime() - now.getTime()) / (1e3 * 60 * 60 * 24));
      if (daysUntilExpiry <= 7) {
        this.description += ` \u26A0\uFE0F Expires in ${daysUntilExpiry} days`;
      }
    }
  }
  getIconForKeyType(keyType) {
    const iconMap = {
      "api_key": "key",
      "database_url": "database",
      "oauth_token": "account",
      "certificate": "certificate",
      "ssh_key": "terminal",
      "webhook_secret": "webhook",
      "encryption_key": "shield"
    };
    return new vscode3.ThemeIcon(iconMap[keyType] || "key");
  }
};
var ProjectTreeItem = class extends vscode3.TreeItem {
  constructor(project, collapsibleState) {
    super(project.name, collapsibleState);
    this.project = project;
    this.tooltip = `${project.name}
${project.description || "No description"}
Organization: ${project.organizationId}`;
    this.description = project.description ? project.description.substring(0, 50) + "..." : "No description";
    this.contextValue = "project";
    this.iconPath = new vscode3.ThemeIcon("folder");
  }
};
var ApiKeyTreeProvider = class {
  constructor(apiKeyService) {
    this.apiKeyService = apiKeyService;
    this._onDidChangeTreeData = new vscode3.EventEmitter();
    this.onDidChangeTreeData = this._onDidChangeTreeData.event;
    this.projects = [];
    this.apiKeys = {};
    this.authenticated = false;
  }
  refresh(resetCache = false) {
    if (resetCache) {
      this.clearCache();
    }
    this._onDidChangeTreeData.fire();
  }
  setAuthenticated(authenticated) {
    this.authenticated = authenticated;
    if (!authenticated) {
      this.clear();
    } else {
      this.clear();
      this.refresh();
    }
  }
  clear() {
    this.clearCache();
    this._onDidChangeTreeData.fire();
  }
  getTreeItem(element) {
    return element;
  }
  async getChildren(element) {
    if (!this.authenticated) {
      const authItem = new vscode3.TreeItem("Not authenticated", vscode3.TreeItemCollapsibleState.None);
      authItem.description = "Click to authenticate";
      authItem.iconPath = new vscode3.ThemeIcon("key");
      authItem.contextValue = "notAuthenticated";
      authItem.command = {
        command: "lanonasis.authenticate",
        title: "Authenticate",
        arguments: ["oauth"]
      };
      return [authItem];
    }
    try {
      if (!element) {
        this.projects = await this.apiKeyService.getProjects();
        if (this.projects.length === 0) {
          const emptyItem = new vscode3.TreeItem("No projects found", vscode3.TreeItemCollapsibleState.None);
          emptyItem.description = "Click + to create a project";
          emptyItem.iconPath = new vscode3.ThemeIcon("info");
          emptyItem.contextValue = "empty";
          return [emptyItem];
        }
        return this.projects.map(
          (project) => new ProjectTreeItem(project, vscode3.TreeItemCollapsibleState.Collapsed)
        );
      } else if (element instanceof ProjectTreeItem) {
        const projectId = element.project.id;
        if (!this.apiKeys[projectId]) {
          this.apiKeys[projectId] = await this.apiKeyService.getApiKeys(projectId);
        }
        if (this.apiKeys[projectId].length === 0) {
          const emptyItem = new vscode3.TreeItem("No API keys in this project", vscode3.TreeItemCollapsibleState.None);
          emptyItem.description = "Right-click project to create a key";
          emptyItem.iconPath = new vscode3.ThemeIcon("info");
          emptyItem.contextValue = "empty";
          return [emptyItem];
        }
        return this.apiKeys[projectId].map(
          (apiKey) => new ApiKeyTreeItem(apiKey, vscode3.TreeItemCollapsibleState.None)
        );
      }
    } catch (error) {
      console.error("Error loading API keys:", error);
      const errorMsg = error instanceof Error ? error.message : "Unknown error";
      if (errorMsg.includes("401") || errorMsg.includes("No token") || errorMsg.includes("AUTH_TOKEN_MISSING")) {
        const authItem = new vscode3.TreeItem("Authentication required", vscode3.TreeItemCollapsibleState.None);
        authItem.description = "Click to authenticate";
        authItem.iconPath = new vscode3.ThemeIcon("warning");
        authItem.contextValue = "authRequired";
        authItem.command = {
          command: "lanonasis.authenticate",
          title: "Authenticate",
          arguments: ["oauth"]
        };
        authItem.tooltip = `Authentication error: ${errorMsg}`;
        return [authItem];
      }
      if (errorMsg.includes("405") || errorMsg.includes("404") || errorMsg.includes("Not Found")) {
        const notAvailableItem = new vscode3.TreeItem("API Key Management", vscode3.TreeItemCollapsibleState.None);
        notAvailableItem.description = "Not available on this server";
        notAvailableItem.iconPath = new vscode3.ThemeIcon("info");
        notAvailableItem.contextValue = "notAvailable";
        notAvailableItem.tooltip = "The API key management endpoints are not available on the current server. This feature requires the v-secure module.";
        return [notAvailableItem];
      }
      const errorItem = new vscode3.TreeItem("Error loading data", vscode3.TreeItemCollapsibleState.None);
      errorItem.description = errorMsg.length > 50 ? errorMsg.substring(0, 50) + "..." : errorMsg;
      errorItem.iconPath = new vscode3.ThemeIcon("error");
      errorItem.contextValue = "error";
      errorItem.tooltip = errorMsg;
      return [errorItem];
    }
    return [];
  }
  // Utility methods for managing the tree
  async addProject(project) {
    this.projects.push(project);
    this.refresh();
  }
  async updateProject(updatedProject) {
    const index = this.projects.findIndex((p) => p.id === updatedProject.id);
    if (index !== -1) {
      this.projects[index] = updatedProject;
      this.refresh();
    }
  }
  async removeProject(projectId) {
    this.projects = this.projects.filter((p) => p.id !== projectId);
    delete this.apiKeys[projectId];
    this.refresh();
  }
  async addApiKey(projectId, apiKey) {
    if (!this.apiKeys[projectId]) {
      this.apiKeys[projectId] = [];
    }
    this.apiKeys[projectId].push(apiKey);
    this.refresh();
  }
  async updateApiKey(projectId, updatedApiKey) {
    if (this.apiKeys[projectId]) {
      const index = this.apiKeys[projectId].findIndex((k) => k.id === updatedApiKey.id);
      if (index !== -1) {
        this.apiKeys[projectId][index] = updatedApiKey;
        this.refresh();
      }
    }
  }
  async removeApiKey(projectId, apiKeyId) {
    if (this.apiKeys[projectId]) {
      this.apiKeys[projectId] = this.apiKeys[projectId].filter((k) => k.id !== apiKeyId);
      this.refresh();
    }
  }
  // Clear cache when refreshing
  clearCache() {
    this.projects = [];
    this.apiKeys = {};
  }
};

// src/panels/MemorySidebarProvider.ts
var vscode4 = __toESM(require("vscode"));

// src/services/IMemoryService.ts
function isEnhancedMemoryService(service) {
  return typeof service.getCapabilities === "function";
}

// src/panels/MemorySidebarProvider.ts
var import_memory_client = require("@lanonasis/memory-client");
var MemorySidebarProvider = class {
  constructor(_extensionUri, memoryService) {
    this._extensionUri = _extensionUri;
    this.memoryService = memoryService;
    this._cachedMemories = [];
    this._cacheTimestamp = 0;
    this.CACHE_DURATION = 3e4;
    // 30 seconds
    this._pendingStateUpdate = null;
    this._lastState = {};
  }
  static {
    this.viewType = "lanonasis.sidebar";
  }
  resolveWebviewView(webviewView, _context, _token) {
    console.log("[Lanonasis] MemorySidebarProvider.resolveWebviewView called");
    try {
      const activationChannel = vscode4.window.createOutputChannel("Lanonasis Activation");
      activationChannel.appendLine("[Lanonasis] MemorySidebarProvider.resolveWebviewView called");
    } catch {
    }
    try {
      this._view = webviewView;
      webviewView.webview.options = {
        enableScripts: true,
        localResourceRoots: [
          vscode4.Uri.joinPath(this._extensionUri, "media"),
          vscode4.Uri.joinPath(this._extensionUri, "out"),
          vscode4.Uri.joinPath(this._extensionUri, "images")
        ]
      };
      webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);
      webviewView.webview.onDidReceiveMessage(async (data) => {
        try {
          switch (data.type) {
            case "authenticate":
              await vscode4.commands.executeCommand("lanonasis.authenticate", data.mode);
              break;
            case "searchMemories":
              await this.handleSearch(data.query);
              break;
            case "createMemory":
              await this.handleCreateFromWebview(data.payload);
              break;
            case "updateMemory":
              await this.handleUpdateFromWebview(data.id, data.payload);
              break;
            case "deleteMemory":
              await this.handleDeleteFromWebview(data.id);
              break;
            case "bulkDelete":
              await this.handleBulkDeleteFromWebview(data.ids);
              break;
            case "bulkTag":
              await this.handleBulkTagFromWebview(data.ids, data.tags);
              break;
            case "restoreMemory":
              await this.handleCreateFromWebview(data.payload);
              break;
            case "openMemory":
              await vscode4.commands.executeCommand("lanonasis.openMemory", data.memory);
              break;
            case "refresh":
              await this.refresh(true);
              break;
            case "showSettings":
              await vscode4.commands.executeCommand("workbench.action.openSettings", "lanonasis");
              break;
            case "getApiKey":
              await vscode4.env.openExternal(vscode4.Uri.parse("https://api.lanonasis.com"));
              break;
            case "openCommandPalette":
              await vscode4.commands.executeCommand("workbench.action.quickOpen", ">Lanonasis: Authenticate");
              break;
          }
        } catch (error) {
          console.error("[Lanonasis] Error handling webview message:", error);
          this._view?.webview.postMessage({
            type: "error",
            message: `Action failed: ${error instanceof Error ? error.message : String(error)}`
          });
        }
      });
      setTimeout(async () => {
        try {
          const isAuthenticated = this.memoryService.isAuthenticated();
          if (!isAuthenticated) {
            this._view?.webview.postMessage({
              type: "updateState",
              state: {
                authenticated: false,
                memories: [],
                loading: false,
                enhancedMode: false,
                cliVersion: null
              }
            });
            return;
          }
          await this.refresh();
        } catch (error) {
          console.error("[Lanonasis] Failed to load sidebar:", error);
          this._view?.webview.postMessage({
            type: "updateState",
            state: {
              authenticated: false,
              memories: [],
              loading: false
            }
          });
        }
      }, 300);
    } catch (error) {
      console.error("[Lanonasis] Fatal error in resolveWebviewView:", error);
      vscode4.window.showErrorMessage(`Lanonasis extension failed to load: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  async refresh(forceRefresh = false) {
    if (this._view) {
      try {
        const authenticated = this.memoryService.isAuthenticated();
        const now = Date.now();
        const useCache = !forceRefresh && this._cachedMemories.length > 0 && now - this._cacheTimestamp < this.CACHE_DURATION;
        if (useCache) {
          const enhancedInfo2 = isEnhancedMemoryService(this.memoryService) ? this.memoryService.getCapabilities() : null;
          this.sendStateUpdate({
            authenticated,
            memories: this._cachedMemories,
            loading: false,
            enhancedMode: enhancedInfo2?.cliAvailable || false,
            cliVersion: enhancedInfo2?.version || null,
            cached: true
          }, true);
          return;
        }
        if (authenticated) {
          this.sendStateUpdate({ loading: true });
        }
        if (!authenticated) {
          this._cachedMemories = [];
          this._cacheTimestamp = 0;
          this.sendStateUpdate({
            authenticated: false,
            memories: [],
            loading: false,
            enhancedMode: false,
            cliVersion: null
          }, true);
          return;
        }
        const memories = await this.memoryService.listMemories(50);
        const enhancedInfo = isEnhancedMemoryService(this.memoryService) ? this.memoryService.getCapabilities() : null;
        this._cachedMemories = memories;
        this._cacheTimestamp = Date.now();
        this.sendStateUpdate({
          authenticated,
          memories,
          loading: false,
          enhancedMode: enhancedInfo?.cliAvailable || false,
          cliVersion: enhancedInfo?.version || null,
          cached: false
        }, true);
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        if (errorMsg.includes("Not authenticated") || errorMsg.includes("401") || errorMsg.includes("Authentication required")) {
          this._cachedMemories = [];
          this._cacheTimestamp = 0;
          this.sendStateUpdate({
            authenticated: false,
            memories: [],
            loading: false
          }, true);
          return;
        }
        if (this._cachedMemories.length > 0) {
          this._view.webview.postMessage({
            type: "error",
            message: `Failed to refresh: ${errorMsg}. Showing cached data.`
          });
          const enhancedInfo = isEnhancedMemoryService(this.memoryService) ? this.memoryService.getCapabilities() : null;
          this.sendStateUpdate({
            authenticated: true,
            memories: this._cachedMemories,
            loading: false,
            enhancedMode: enhancedInfo?.cliAvailable || false,
            cliVersion: enhancedInfo?.version || null,
            cached: true
          }, true);
        } else {
          this._view.webview.postMessage({
            type: "error",
            message: `Connection failed: ${errorMsg}`
          });
          this.sendStateUpdate({
            authenticated: false,
            memories: [],
            loading: false
          }, true);
        }
      }
    }
  }
  clearCache() {
    this._cachedMemories = [];
    this._cacheTimestamp = 0;
  }
  /**
   * Debounced state update to prevent rapid re-renders that cause blank screen
   * Only sends update if state actually changed
   */
  sendStateUpdate(state, immediate = false) {
    if (this._pendingStateUpdate) {
      clearTimeout(this._pendingStateUpdate);
      this._pendingStateUpdate = null;
    }
    const stateStr = JSON.stringify(state);
    const lastStateStr = JSON.stringify(this._lastState);
    if (stateStr === lastStateStr && !immediate) {
      return;
    }
    const doUpdate = () => {
      this._lastState = state;
      this._view?.webview.postMessage({
        type: "updateState",
        state
      });
    };
    if (immediate) {
      doUpdate();
    } else {
      this._pendingStateUpdate = setTimeout(doUpdate, 50);
    }
  }
  async handleSearch(query) {
    if (!this._view) return;
    if (!this.memoryService.isAuthenticated()) {
      this._view.webview.postMessage({
        type: "updateState",
        state: {
          authenticated: false,
          memories: [],
          loading: false
        }
      });
      return;
    }
    try {
      this._view.webview.postMessage({
        type: "updateState",
        state: { loading: true }
      });
      const results = await this.memoryService.searchMemories(query);
      this._view.webview.postMessage({
        type: "searchResults",
        results,
        query
      });
    } catch (error) {
      this._view.webview.postMessage({
        type: "error",
        message: error instanceof Error ? error.message : "Search failed"
      });
    } finally {
      this._view.webview.postMessage({
        type: "updateState",
        state: { loading: false }
      });
    }
  }
  async handleCreateFromWebview(payload) {
    if (!this._view) return;
    if (!this.memoryService.isAuthenticated()) {
      this._view.webview.postMessage({
        type: "error",
        message: "Not authenticated. Please sign in first."
      });
      return;
    }
    try {
      const validated = import_memory_client.createMemorySchema.parse(payload);
      await this.memoryService.createMemory(validated);
      this._view.webview.postMessage({
        type: "memoryCreated",
        message: "Memory created successfully"
      });
      await this.refresh(true);
    } catch (error) {
      this._view.webview.postMessage({
        type: "error",
        message: error instanceof Error ? error.message : "Failed to create memory"
      });
    }
  }
  async handleUpdateFromWebview(id, payload) {
    if (!this._view) return;
    if (!this.memoryService.isAuthenticated()) {
      this._view.webview.postMessage({
        type: "error",
        message: "Not authenticated. Please sign in first."
      });
      return;
    }
    try {
      const validated = import_memory_client.updateMemorySchema.parse(payload);
      const sanitized = {
        ...validated,
        topic_id: validated.topic_id === null ? void 0 : validated.topic_id,
        project_ref: validated.project_ref === null ? void 0 : validated.project_ref
      };
      await this.memoryService.updateMemory(id, sanitized);
      this._view.webview.postMessage({
        type: "memoryUpdated",
        message: "Memory updated successfully"
      });
      await this.refresh(true);
    } catch (error) {
      this._view.webview.postMessage({
        type: "error",
        message: error instanceof Error ? error.message : "Failed to update memory"
      });
    }
  }
  async handleDeleteFromWebview(id) {
    if (!this._view) return;
    if (!this.memoryService.isAuthenticated()) {
      this._view.webview.postMessage({
        type: "error",
        message: "Not authenticated. Please sign in first."
      });
      return;
    }
    try {
      await this.memoryService.deleteMemory(id);
      this._view.webview.postMessage({
        type: "memoryDeleted",
        message: "Memory deleted successfully"
      });
      await this.refresh(true);
    } catch (error) {
      this._view.webview.postMessage({
        type: "error",
        message: error instanceof Error ? error.message : "Failed to delete memory"
      });
    }
  }
  async handleBulkDeleteFromWebview(ids) {
    if (!this._view) return;
    if (!this.memoryService.isAuthenticated()) {
      this._view.webview.postMessage({
        type: "error",
        message: "Not authenticated. Please sign in first."
      });
      return;
    }
    try {
      const results = await Promise.allSettled(
        ids.map((id) => this.memoryService.deleteMemory(id))
      );
      const failed = results.filter((r) => r.status === "rejected").length;
      const succeeded = results.length - failed;
      this._view.webview.postMessage({
        type: "bulkDeleteComplete",
        message: `Deleted ${succeeded} memories${failed > 0 ? `, ${failed} failed` : ""}`
      });
      await this.refresh(true);
    } catch (error) {
      this._view.webview.postMessage({
        type: "error",
        message: error instanceof Error ? error.message : "Failed to delete memories"
      });
    }
  }
  async handleBulkTagFromWebview(ids, tags) {
    if (!this._view) return;
    if (!this.memoryService.isAuthenticated()) {
      this._view.webview.postMessage({
        type: "error",
        message: "Not authenticated. Please sign in first."
      });
      return;
    }
    try {
      const results = await Promise.allSettled(
        ids.map((id) => this.memoryService.updateMemory(id, { tags }))
      );
      const failed = results.filter((r) => r.status === "rejected").length;
      const succeeded = results.length - failed;
      this._view.webview.postMessage({
        type: "bulkTagComplete",
        message: `Updated tags for ${succeeded} memories${failed > 0 ? `, ${failed} failed` : ""}`
      });
      await this.refresh(true);
    } catch (error) {
      this._view.webview.postMessage({
        type: "error",
        message: error instanceof Error ? error.message : "Failed to update tags"
      });
    }
  }
  _getHtmlForWebview(webview) {
    const styleUri = webview.asWebviewUri(vscode4.Uri.joinPath(this._extensionUri, "media", "sidebar.css"));
    const scriptUri = webview.asWebviewUri(vscode4.Uri.joinPath(this._extensionUri, "media", "sidebar.js"));
    const nonce = getNonce();
    return `<!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource}; script-src 'nonce-${nonce}'; img-src ${webview.cspSource} https:; font-src ${webview.cspSource};">
            <link href="${styleUri}" rel="stylesheet">
            <title>Lanonasis Memory</title>
        </head>
        <body>
            <div id="root">
                <div class="loading-state">
                    <div class="spinner"></div>
                    <p>Loading Lanonasis Memory...</p>
                </div>
            </div>
            <script nonce="${nonce}" src="${scriptUri}"></script>
        </body>
        </html>`;
  }
};
function getNonce() {
  let text = "";
  const possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  for (let i = 0; i < 32; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
}

// src/panels/EnhancedSidebarProvider.ts
var vscode5 = __toESM(require("vscode"));

// src/bridges/PrototypeUIBridge.ts
var PrototypeUIBridge = class {
  constructor(memoryService, cacheBridge) {
    this.memoryService = memoryService;
    this.cacheBridge = cacheBridge;
    this.searchCache = /* @__PURE__ */ new Map();
    this.searchCacheTtlMs = 5 * 60 * 1e3;
  }
  // Map memory types to icon types
  getIconType(type) {
    const iconMap = {
      conversation: "user",
      knowledge: "lightbulb",
      project: "briefcase",
      context: "terminal",
      reference: "hash",
      personal: "user",
      workflow: "settings"
    };
    return iconMap[type] || "terminal";
  }
  // Transform live extension memory to prototype format
  transformToPrototypeFormat(memory) {
    return {
      id: memory.id,
      title: memory.title,
      type: memory.memory_type,
      date: new Date(memory.created_at),
      tags: memory.tags,
      content: memory.content,
      iconType: this.getIconType(memory.memory_type),
      status: memory.status
    };
  }
  // Transform search results to prototype format
  transformSearchResults(results) {
    return results.map((result) => ({
      ...this.transformToPrototypeFormat(result),
      // Include similarity score for search results
      similarityScore: result.similarity_score
    }));
  }
  normalizeSearchQuery(query) {
    return query.trim().toLowerCase();
  }
  getCachedSearch(query) {
    const key = this.normalizeSearchQuery(query);
    const cached = this.searchCache.get(key);
    if (!cached) return null;
    if (Date.now() - cached.timestamp > this.searchCacheTtlMs) {
      this.searchCache.delete(key);
      return null;
    }
    return cached.results;
  }
  setSearchCache(query, results) {
    const key = this.normalizeSearchQuery(query);
    this.searchCache.set(key, { timestamp: Date.now(), results });
    if (this.searchCache.size > 20) {
      const oldestKey = this.searchCache.keys().next().value;
      if (oldestKey) {
        this.searchCache.delete(oldestKey);
      }
    }
  }
  clearSearchCache() {
    this.searchCache.clear();
  }
  sortBySimilarity(results) {
    return [...results].sort((a, b) => {
      const aScore = typeof a.similarityScore === "number" ? a.similarityScore : -1;
      const bScore = typeof b.similarityScore === "number" ? b.similarityScore : -1;
      return bScore - aScore;
    });
  }
  // Search memories with prototype interface
  async searchMemories(query) {
    try {
      const cached = this.getCachedSearch(query);
      if (cached) {
        return cached;
      }
      const results = this.cacheBridge ? await this.cacheBridge.searchMemories(query) : await this.memoryService.searchMemories(query);
      const transformed = this.transformSearchResults(results);
      const sorted = this.sortBySimilarity(transformed);
      this.setSearchCache(query, sorted);
      return sorted;
    } catch (error) {
      console.error("[PrototypeUIBridge] Search failed:", error);
      throw new Error(`Search failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  // Create memory with prototype interface
  async createMemory(memoryData) {
    try {
      const result = await this.memoryService.createMemory(memoryData);
      if (this.cacheBridge) {
        await this.cacheBridge.upsert(result);
      }
      this.clearSearchCache();
      return this.transformToPrototypeFormat(result);
    } catch (error) {
      console.error("[PrototypeUIBridge] Create memory failed:", error);
      throw new Error(`Create memory failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  // Get all memories
  async getAllMemories() {
    try {
      const memories = this.cacheBridge ? await this.cacheBridge.getMemories({ limit: 50 }) : await this.memoryService.listMemories(50);
      return memories.map((memory) => this.transformToPrototypeFormat(memory));
    } catch (error) {
      console.error("[PrototypeUIBridge] Get memories failed:", error);
      throw new Error(`Get memories failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  // Get memory by ID
  async getMemoryById(id) {
    try {
      if (this.cacheBridge) {
        const cached = (await this.cacheBridge.getMemories()).find((item) => item.id === id);
        if (cached) {
          return this.transformToPrototypeFormat(cached);
        }
      }
      const memory = await this.memoryService.getMemory(id);
      if (memory && this.cacheBridge) {
        await this.cacheBridge.upsert(memory);
      }
      return memory ? this.transformToPrototypeFormat(memory) : null;
    } catch (error) {
      console.error("[PrototypeUIBridge] Get memory by ID failed:", error);
      throw new Error(`Get memory failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  // Update memory (placeholder - not implemented in base service)
  async updateMemory(_id, _updates) {
    try {
      const updated = await this.memoryService.updateMemory(_id, _updates);
      if (this.cacheBridge) {
        await this.cacheBridge.upsert(updated);
      }
      this.clearSearchCache();
      return this.transformToPrototypeFormat(updated);
    } catch (error) {
      console.error("[PrototypeUIBridge] Update memory failed:", error);
      throw new Error(`Update memory failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  // Delete memory (placeholder - not implemented in base service)
  async deleteMemory(_id) {
    try {
      await this.memoryService.deleteMemory(_id);
      if (this.cacheBridge) {
        await this.cacheBridge.remove(_id);
      }
      this.clearSearchCache();
    } catch (error) {
      console.error("[PrototypeUIBridge] Delete memory failed:", error);
      throw new Error(`Delete memory failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  // Check authentication status
  async isAuthenticated() {
    try {
      return await this.memoryService.isAuthenticated();
    } catch (error) {
      console.error("[PrototypeUIBridge] Auth check failed:", error);
      return false;
    }
  }
};

// src/panels/EnhancedSidebarProvider.ts
var EnhancedSidebarProvider = class {
  constructor(_extensionUri, memoryService, apiKeyService, cacheBridge, onboardingService, offlineService, offlineQueue) {
    this._extensionUri = _extensionUri;
    this.memoryService = memoryService;
    this.offlineService = offlineService;
    this.offlineQueue = offlineQueue;
    this._bridge = new PrototypeUIBridge(memoryService, cacheBridge);
    this._apiKeyService = apiKeyService;
    this.cacheBridge = cacheBridge;
    this.onboardingService = onboardingService;
  }
  static {
    this.viewType = "lanonasis.sidebar";
  }
  resolveWebviewView(webviewView, _context, _token) {
    console.log("[Lanonasis] EnhancedSidebarProvider.resolveWebviewView called");
    try {
      this._view = webviewView;
      webviewView.webview.options = {
        enableScripts: true,
        localResourceRoots: [
          vscode5.Uri.joinPath(this._extensionUri, "media"),
          vscode5.Uri.joinPath(this._extensionUri, "out"),
          vscode5.Uri.joinPath(this._extensionUri, "images")
        ]
      };
      webviewView.webview.html = this._getReactHtmlForWebview(webviewView.webview);
      webviewView.webview.onDidReceiveMessage(async (data) => {
        try {
          await this.handleWebviewMessage(data);
        } catch (error) {
          console.error("[Lanonasis] Enhanced sidebar error:", error);
          this._view?.webview.postMessage({
            type: "error",
            message: `Action failed: ${error instanceof Error ? error.message : String(error)}`
          });
        }
      });
      this.sendInitialData().catch((error) => {
        console.error("[Lanonasis] Failed to load enhanced sidebar:", error);
        this._view?.webview.postMessage({
          type: "error",
          message: "Failed to load enhanced UI. Falling back to original interface."
        });
      });
    } catch (error) {
      console.error("[Lanonasis] Enhanced sidebar initialization failed:", error);
      throw error;
    }
  }
  async handleWebviewMessage(data) {
    try {
      switch (data.type) {
        case "getAuthState":
          await this.sendAuthState();
          break;
        case "getOnboardingState":
          await this.sendOnboardingState();
          break;
        case "authenticate": {
          const authData = data.data;
          await this.handleAuthentication(authData?.mode);
          break;
        }
        case "logout":
          await this.handleLogout();
          break;
        case "getMemories":
          await this.sendMemories();
          break;
        case "searchMemories":
          await this.handleSearch(data.data);
          break;
        case "updateMemory":
          await this.handleUpdateMemory(data.data);
          break;
        case "deleteMemory":
          await this.handleDeleteMemory(data.data);
          break;
        case "chatQuery":
          await this.handleChatQuery(data.data);
          break;
        case "pasteFromClipboard":
          await this.handlePasteFromClipboard();
          break;
        case "copyToClipboard":
          await this.handleCopyToClipboard(data.data);
          break;
        case "executeCommand":
          await vscode5.commands.executeCommand(data.data);
          break;
        case "completeOnboardingStep":
          await this.handleCompleteOnboardingStep(data.data);
          break;
        case "skipOnboarding":
          await this.handleSkipOnboarding();
          break;
        case "resetOnboarding":
          await this.handleResetOnboarding();
          break;
        case "selectMemory":
          await this.handleMemorySelection(data.data);
          break;
        case "createMemory":
          await this.handleCreateMemory(data.data);
          break;
        case "getApiKeys":
          await this.handleGetApiKeys();
          break;
        case "createApiKey":
          await this.handleCreateApiKey(data.data);
          break;
        case "deleteApiKey":
          await this.handleDeleteApiKey(data.data);
          break;
        case "storeApiKey":
          await this.handleStoreApiKey();
          break;
        case "manageApiKeys":
          await vscode5.commands.executeCommand("lanonasis.manageApiKeys");
          break;
        case "openSettings":
          await vscode5.commands.executeCommand("workbench.action.openSettings", "lanonasis");
          break;
        case "getSidebarPreferences":
          await this.sendSidebarPreferences();
          break;
        case "updateSidebarPreferences":
          await this.handleUpdateSidebarPreferences(data.data);
          break;
        case "getConnectionStatus":
          await this.sendConnectionStatus();
          break;
        case "captureClipboard":
          await this.handleCaptureClipboard();
          break;
        case "saveAsMemory":
          await this.handleSaveAsMemory(data.data);
          break;
        case "getClipboardContent":
          await this.handleGetClipboardContent();
          break;
        default:
          console.warn("[EnhancedSidebarProvider] Unknown message type:", data.type);
      }
    } catch (error) {
      console.error("[EnhancedSidebarProvider] Message handling error:", error);
      this._view?.webview.postMessage({
        type: "error",
        data: error instanceof Error ? error.message : String(error)
      });
    }
  }
  async sendAuthState() {
    try {
      const authPromise = this._bridge.isAuthenticated();
      const timeoutPromise = new Promise(
        (_, reject) => setTimeout(() => reject(new Error("Auth check timeout")), 5e3)
      );
      const isAuthenticated = await Promise.race([authPromise, timeoutPromise]);
      let user = null;
      if (isAuthenticated && this._apiKeyService) {
        try {
          user = await this._apiKeyService.getUserInfo();
        } catch (error) {
          console.warn("[EnhancedSidebarProvider] Failed to fetch user profile:", error);
        }
      }
      this._view?.webview.postMessage({
        type: "authState",
        data: { authenticated: isAuthenticated, user }
      });
    } catch (error) {
      console.warn("[EnhancedSidebarProvider] Auth check failed:", error);
      this._view?.webview.postMessage({
        type: "authState",
        data: { authenticated: false, user: null, error: "Failed to check authentication state" }
      });
    }
  }
  async sendOnboardingState() {
    if (!this.onboardingService) {
      return;
    }
    const status = await this.onboardingService.getStatus();
    this._view?.webview.postMessage({
      type: "onboardingState",
      data: status
    });
  }
  async handleLogout() {
    try {
      await vscode5.commands.executeCommand("lanonasis.logout");
      await this.sendAuthState();
    } catch (error) {
      this._view?.webview.postMessage({
        type: "error",
        data: "Logout failed: " + (error instanceof Error ? error.message : String(error))
      });
    }
  }
  async handleAuthentication(mode) {
    try {
      this._view?.webview.postMessage({
        type: "authLoading",
        data: true
      });
      await vscode5.commands.executeCommand("lanonasis.authenticate", mode);
      setTimeout(async () => {
        await this.sendAuthState();
        await this.sendMemories();
        this._view?.webview.postMessage({
          type: "authLoading",
          data: false
        });
      }, 1e3);
    } catch (error) {
      this._view?.webview.postMessage({
        type: "error",
        data: "Authentication failed: " + (error instanceof Error ? error.message : String(error))
      });
      this._view?.webview.postMessage({
        type: "authLoading",
        data: false
      });
    }
  }
  async handleCompleteOnboardingStep(payload) {
    if (!this.onboardingService) {
      return;
    }
    await this.onboardingService.markStepComplete(payload.step);
    await this.sendOnboardingState();
  }
  async handleSkipOnboarding() {
    if (!this.onboardingService) {
      return;
    }
    await this.onboardingService.skip();
    await this.sendOnboardingState();
  }
  async handleResetOnboarding() {
    if (!this.onboardingService) {
      return;
    }
    await this.onboardingService.reset();
    await this.sendOnboardingState();
  }
  async updateOnboardingStep(step) {
    if (!this.onboardingService) {
      return;
    }
    try {
      await this.onboardingService.markStepComplete(step);
      await this.sendOnboardingState();
    } catch (error) {
      console.warn("[EnhancedSidebarProvider] Failed to update onboarding step:", error);
    }
  }
  async handleChatQuery(queryData) {
    if (!this._view) return;
    const query = typeof queryData === "string" ? queryData : queryData.query;
    const attachedMemories = typeof queryData === "object" && queryData.attachedMemories ? queryData.attachedMemories : [];
    try {
      this._view.webview.postMessage({
        type: "chatLoading",
        data: true
      });
      let attachedContext = "";
      if (attachedMemories.length > 0) {
        attachedContext = "\n\n## Attached Context:\n" + attachedMemories.map(
          (m, i) => `**${i + 1}. ${m.title}**
${m.content.substring(0, 500)}${m.content.length > 500 ? "..." : ""}`
        ).join("\n\n");
      }
      const searchResults = await this._bridge.searchMemories(query);
      const attachedMemoryIds = attachedMemories.map((m) => m.id);
      const response = this.formatChatResponse(query, searchResults, attachedContext);
      this._view.webview.postMessage({
        type: "chatResponse",
        data: {
          query,
          response,
          memories: searchResults.slice(0, 5),
          // Include top 5 relevant memories
          attachedMemoryIds
        }
      });
    } catch (error) {
      this._view.webview.postMessage({
        type: "chatError",
        data: `Failed to process query: ${error instanceof Error ? error.message : String(error)}`
      });
    } finally {
      this._view.webview.postMessage({
        type: "chatLoading",
        data: false
      });
    }
  }
  formatChatResponse(query, memories, attachedContext) {
    let response = "";
    if (attachedContext) {
      response += `\u{1F4CE} **Using your attached context:**
${attachedContext}

---

`;
    }
    if (memories.length === 0 && !attachedContext) {
      return `I couldn't find any memories related to "${query}". Would you like me to help you create one?`;
    }
    if (memories.length === 0 && attachedContext) {
      response += `Based on your attached context, I can help with "${query}".

`;
      response += `No additional related memories were found in your memory bank.`;
      return response;
    }
    const topMemory = memories[0];
    response += `Found **${memories.length}** relevant ${memories.length > 1 ? "memories" : "memory"} for "${query}":

`;
    response += `**Most relevant:** ${topMemory.title}
`;
    response += `${topMemory.content.substring(0, 300)}${topMemory.content.length > 300 ? "..." : ""}

`;
    if (memories.length > 1) {
      response += `**Other related memories:**
`;
      memories.slice(1, 4).forEach((mem, idx) => {
        response += `${idx + 2}. ${mem.title}
`;
      });
    }
    return response;
  }
  async handleGetApiKeys() {
    try {
      let apiKeys = [];
      if (this._apiKeyService) {
        try {
          apiKeys = await this._apiKeyService.getApiKeys();
        } catch (error) {
          console.warn("[EnhancedSidebarProvider] Failed to fetch API keys from service:", error);
        }
      }
      const transformedKeys = apiKeys.map((key) => ({
        id: key.id || key.keyId || String(Math.random()),
        name: key.name || "Unnamed Key",
        scope: key.scope || key.accessLevel || key.keyType || "read,write",
        lastUsed: key.lastUsed || key.lastUsedAt || key.createdAt ? this.formatLastUsed(key.lastUsed || key.lastUsedAt || key.createdAt) : "Never"
      }));
      this._view?.webview.postMessage({
        type: "apiKeys",
        data: transformedKeys
      });
    } catch {
      console.warn("[EnhancedSidebarProvider] Failed to fetch API keys");
      this._view?.webview.postMessage({
        type: "apiKeys",
        data: []
      });
      this._view?.webview.postMessage({
        type: "apiKeyError",
        data: "Unable to load API keys. Please check your connection or authentication."
      });
    }
  }
  formatLastUsed(date) {
    try {
      const dateObj = typeof date === "string" ? new Date(date) : date;
      const now = /* @__PURE__ */ new Date();
      const diffMs = now.getTime() - dateObj.getTime();
      const diffMins = Math.floor(diffMs / 6e4);
      const diffHours = Math.floor(diffMs / 36e5);
      const diffDays = Math.floor(diffMs / 864e5);
      if (diffMins < 1) return "Just now";
      if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? "s" : ""} ago`;
      if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? "s" : ""} ago`;
      if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? "s" : ""} ago`;
      return dateObj.toLocaleDateString();
    } catch {
      return "Unknown";
    }
  }
  async handleCreateApiKey(_keyData) {
    try {
      await vscode5.commands.executeCommand("lanonasis.createApiKey");
      await this.handleGetApiKeys();
      this._view?.webview.postMessage({
        type: "apiKeyCreated",
        data: { success: true, message: "API key created." }
      });
    } catch (error) {
      this._view?.webview.postMessage({
        type: "apiKeyError",
        data: "Failed to create API key: " + (error instanceof Error ? error.message : String(error))
      });
    }
  }
  async handleDeleteApiKey(keyId) {
    try {
      if (this._apiKeyService && keyId) {
        await this._apiKeyService.deleteApiKey(keyId);
      } else {
        await vscode5.commands.executeCommand("lanonasis.refreshApiKeys");
      }
      await this.handleGetApiKeys();
      this._view?.webview.postMessage({
        type: "apiKeyDeleted",
        data: { success: true, message: "API key deleted." }
      });
    } catch (error) {
      this._view?.webview.postMessage({
        type: "apiKeyError",
        data: "Failed to delete API key: " + (error instanceof Error ? error.message : String(error))
      });
    }
  }
  async handleStoreApiKey() {
    try {
      await vscode5.commands.executeCommand("lanonasis.authenticate", "apikey");
      await this.sendAuthState();
    } catch (error) {
      this._view?.webview.postMessage({
        type: "apiKeyError",
        data: "Failed to store API key: " + (error instanceof Error ? error.message : String(error))
      });
    }
  }
  async handleCaptureClipboard() {
    try {
      const clipboardContent = await vscode5.env.clipboard.readText();
      if (!clipboardContent.trim()) {
        this._view?.webview.postMessage({
          type: "clipboardError",
          data: "Clipboard is empty"
        });
        return;
      }
      const title = await vscode5.window.showInputBox({
        prompt: "Title for this memory",
        placeHolder: "Enter a title...",
        value: clipboardContent.substring(0, 50).replace(/\n/g, " ")
      });
      if (title) {
        const memory = await this._bridge.createMemory({
          title,
          content: clipboardContent,
          memory_type: "context",
          tags: ["clipboard", "captured"]
        });
        this._view?.webview.postMessage({
          type: "memoryCaptured",
          data: memory
        });
        vscode5.window.showInformationMessage("\u{1F4DD} Memory captured from clipboard!");
        await this.sendMemories();
      }
    } catch (error) {
      this._view?.webview.postMessage({
        type: "clipboardError",
        data: "Failed to capture clipboard: " + (error instanceof Error ? error.message : String(error))
      });
    }
  }
  async handleGetClipboardContent() {
    try {
      const clipboardContent = await vscode5.env.clipboard.readText();
      this._view?.webview.postMessage({
        type: "clipboardContent",
        data: clipboardContent
      });
    } catch (error) {
      this._view?.webview.postMessage({
        type: "clipboardError",
        data: "Failed to read clipboard: " + (error instanceof Error ? error.message : String(error))
      });
    }
  }
  async handlePasteFromClipboard() {
    try {
      const clipboardContent = await vscode5.env.clipboard.readText();
      if (!clipboardContent || !clipboardContent.trim()) {
        vscode5.window.showWarningMessage("Clipboard is empty");
        return;
      }
      this._view?.webview.postMessage({
        type: "clipboardContent",
        data: clipboardContent
      });
      vscode5.window.showInformationMessage(
        `Clipboard content ready (${clipboardContent.length} chars)`,
        "Create Memory"
      ).then((action) => {
        if (action === "Create Memory") {
          vscode5.commands.executeCommand("lanonasis.captureClipboard");
        }
      });
    } catch (error) {
      this._view?.webview.postMessage({
        type: "error",
        data: "Failed to read clipboard: " + (error instanceof Error ? error.message : String(error))
      });
    }
  }
  async handleCopyToClipboard(text) {
    try {
      if (!text) {
        vscode5.window.showWarningMessage("Nothing to copy");
        return;
      }
      await vscode5.env.clipboard.writeText(text);
      this._view?.webview.postMessage({
        type: "copySuccess",
        data: true
      });
      vscode5.window.setStatusBarMessage("\u{1F4CB} Copied to clipboard", 2e3);
    } catch (error) {
      this._view?.webview.postMessage({
        type: "error",
        data: "Failed to copy: " + (error instanceof Error ? error.message : String(error))
      });
    }
  }
  async handleSaveAsMemory(data) {
    try {
      const defaultTitle = data.content.substring(0, 50).replace(/\n/g, " ").trim();
      const title = await vscode5.window.showInputBox({
        prompt: "Title for this memory",
        placeHolder: "Enter a title...",
        value: data.title || defaultTitle
      });
      if (!title) return;
      const memoryType = await vscode5.window.showQuickPick(
        ["context", "knowledge", "reference", "project", "personal", "workflow"],
        {
          placeHolder: "Select memory type",
          title: "Memory Type"
        }
      );
      if (!memoryType) return;
      const memory = await this._bridge.createMemory({
        title,
        content: data.content,
        memory_type: memoryType,
        tags: ["chat-response", "ai-generated"]
      });
      this._view?.webview.postMessage({
        type: "memorySaved",
        data: memory
      });
      vscode5.window.showInformationMessage(`\u{1F4BE} Saved as memory: "${title}"`);
      await this.sendMemories();
      await this.updateOnboardingStep("create_memory");
    } catch (error) {
      this._view?.webview.postMessage({
        type: "error",
        data: "Failed to save memory: " + (error instanceof Error ? error.message : String(error))
      });
    }
  }
  async handleMemorySelection(memoryId) {
    try {
      const memory = await this._bridge.getMemoryById(memoryId);
      this._view?.webview.postMessage({
        type: "memory",
        data: memory
      });
    } catch (error) {
      this._view?.webview.postMessage({
        type: "error",
        data: "Failed to load memory: " + (error instanceof Error ? error.message : String(error))
      });
    }
  }
  async handleCreateMemory(memoryData) {
    try {
      const createMemoryData = {
        title: memoryData.title || "New Memory",
        content: memoryData.content || "",
        memory_type: memoryData.memory_type || "context",
        tags: Array.isArray(memoryData.tags) ? memoryData.tags : [],
        summary: memoryData.summary,
        topic_id: memoryData.topic_id,
        project_ref: memoryData.project_ref,
        metadata: memoryData.metadata
      };
      const memory = await this._bridge.createMemory(createMemoryData);
      this._view?.webview.postMessage({
        type: "memory",
        data: memory
      });
      await this.sendMemories();
      await this.updateOnboardingStep("create_memory");
    } catch (error) {
      this._view?.webview.postMessage({
        type: "error",
        data: "Failed to create memory: " + (error instanceof Error ? error.message : String(error))
      });
    }
  }
  async handleUpdateMemory(payload) {
    try {
      const { id, updates } = payload;
      if (!id) {
        throw new Error("Missing memory id");
      }
      const updated = await this._bridge.updateMemory(id, updates);
      this._view?.webview.postMessage({
        type: "memoryUpdated",
        data: updated
      });
      await this.sendMemories();
    } catch (error) {
      this._view?.webview.postMessage({
        type: "error",
        data: "Failed to update memory: " + (error instanceof Error ? error.message : String(error))
      });
    }
  }
  async handleDeleteMemory(memoryId) {
    try {
      if (!memoryId) {
        throw new Error("Missing memory id");
      }
      await this._bridge.deleteMemory(memoryId);
      this._view?.webview.postMessage({
        type: "memoryDeleted",
        data: { id: memoryId }
      });
      await this.sendMemories();
    } catch (error) {
      this._view?.webview.postMessage({
        type: "error",
        data: "Failed to delete memory: " + (error instanceof Error ? error.message : String(error))
      });
    }
  }
  async sendSidebarPreferences() {
    const config = vscode5.workspace.getConfiguration("lanonasis");
    const typeOrder = config.get("sidebarTypeOrder", []);
    const hiddenTypes = config.get("sidebarHiddenTypes", []);
    const theme = config.get("sidebarTheme", "default");
    this._view?.webview.postMessage({
      type: "sidebarPreferences",
      data: { typeOrder, hiddenTypes, theme }
    });
  }
  async handleUpdateSidebarPreferences(preferences) {
    const config = vscode5.workspace.getConfiguration("lanonasis");
    if (preferences.typeOrder) {
      await config.update("sidebarTypeOrder", preferences.typeOrder, vscode5.ConfigurationTarget.Global);
    }
    if (preferences.hiddenTypes) {
      await config.update("sidebarHiddenTypes", preferences.hiddenTypes, vscode5.ConfigurationTarget.Global);
    }
    if (preferences.theme) {
      await config.update("sidebarTheme", preferences.theme, vscode5.ConfigurationTarget.Global);
    }
    await this.sendSidebarPreferences();
  }
  async sendConnectionStatus() {
    const capabilities = this.isEnhancedService(this.memoryService) ? this.memoryService.getCapabilities() : null;
    const cacheStatus = this.cacheBridge?.getStatus() ?? null;
    const authenticated = capabilities?.authenticated ?? this.memoryService.isAuthenticated();
    const connectionMode = capabilities?.cliAvailable ? "cli" : "http";
    const offlineStatus = this.offlineService?.getStatus() ?? null;
    const queueStatus = this.offlineQueue?.getStatus() ?? null;
    this._view?.webview.postMessage({
      type: "connectionStatus",
      data: {
        authenticated,
        connectionMode,
        capabilities,
        cacheStatus,
        offline: offlineStatus ? !offlineStatus.online : void 0,
        queueStatus
      }
    });
  }
  isEnhancedService(service) {
    return typeof service.getCapabilities === "function";
  }
  async sendMemories() {
    this._view?.webview.postMessage({
      type: "loading",
      data: true
    });
    try {
      const memoriesPromise = this._bridge.getAllMemories();
      const timeoutPromise = new Promise(
        (_, reject) => setTimeout(() => reject(new Error("Memory fetch timeout")), 1e4)
      );
      const memories = await Promise.race([memoriesPromise, timeoutPromise]);
      this._view?.webview.postMessage({
        type: "memories",
        data: memories
      });
    } catch (error) {
      console.warn("[EnhancedSidebarProvider] Failed to fetch memories:", error);
      this._view?.webview.postMessage({
        type: "memories",
        data: []
      });
      this._view?.webview.postMessage({
        type: "error",
        data: error instanceof Error ? error.message : "Failed to load memories"
      });
    } finally {
      this._view?.webview.postMessage({
        type: "loading",
        data: false
      });
      await this.sendConnectionStatus();
    }
  }
  async handleSearch(query) {
    this._view?.webview.postMessage({
      type: "loading",
      data: true
    });
    try {
      const searchPromise = this._bridge.searchMemories(query);
      const timeoutPromise = new Promise(
        (_, reject) => setTimeout(() => reject(new Error("Search timeout")), 1e4)
      );
      const results = await Promise.race([searchPromise, timeoutPromise]);
      this._view?.webview.postMessage({
        type: "memories",
        data: results
      });
      await this.updateOnboardingStep("search");
    } catch (error) {
      console.warn("[EnhancedSidebarProvider] Search failed:", error);
      this._view?.webview.postMessage({
        type: "memories",
        data: []
      });
      this._view?.webview.postMessage({
        type: "error",
        data: `Search failed: ${error instanceof Error ? error.message : String(error)}`
      });
    } finally {
      this._view?.webview.postMessage({
        type: "loading",
        data: false
      });
      await this.sendConnectionStatus();
    }
  }
  async sendInitialData() {
    console.log("[EnhancedSidebarProvider] Sending initial data...");
    try {
      await this.sendAuthState();
      await this.sendOnboardingState();
      await this.sendSidebarPreferences();
      await this.sendConnectionStatus();
      await this.sendMemories();
      console.log("[EnhancedSidebarProvider] Initial data sent successfully");
    } catch (error) {
      console.error("[EnhancedSidebarProvider] Failed to send initial data:", error);
      this._view?.webview.postMessage({
        type: "loading",
        data: false
      });
      this._view?.webview.postMessage({
        type: "error",
        data: "Failed to initialize. Please refresh or re-authenticate."
      });
    }
  }
  async refresh(_force = false) {
    try {
      if (this._view) {
        await this.sendInitialData();
      }
    } catch (error) {
      console.error("[Lanonasis] Enhanced refresh failed:", error);
    }
  }
  _getReactHtmlForWebview(webview) {
    const reactScriptUri = webview.asWebviewUri(vscode5.Uri.joinPath(this._extensionUri, "media", "sidebar-react.js"));
    const styleUri = webview.asWebviewUri(vscode5.Uri.joinPath(this._extensionUri, "media", "react-styles.css"));
    const nonce = this.getNonce();
    return `<!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource}; script-src 'nonce-${nonce}'; img-src ${webview.cspSource} https:; font-src ${webview.cspSource};">
            <link href="${styleUri}" rel="stylesheet">
            <title>Lanonasis Memory - Enhanced UI</title>
        </head>
        <body>
            <div id="root">
                <div class="loading-state">
                    <div class="spinner"></div>
                    <p>Loading Enhanced UI...</p>
                </div>
            </div>
            <script nonce="${nonce}">
                // Initialize VS Code API before React loads
                (function() {
                    const vscode = acquireVsCodeApi();
                    window.vscode = vscode;
                })();
            </script>
            <script nonce="${nonce}">
                window.addEventListener('error', (event) => {
                    console.error('Uncaught error:', event.error);
                    window.vscode.postMessage({
                        type: 'reactError',
                        error: event.error.message,
                        stack: event.error.stack
                    });
                });
            </script>
            <script nonce="${nonce}" src="${reactScriptUri}"></script>
        </body>
        </html>`;
  }
  getNonce() {
    let text = "";
    const possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    for (let i = 0; i < 32; i++) {
      text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
  }
};

// src/services/MemoryService.ts
var vscode6 = __toESM(require("vscode"));
var import_memory_client2 = require("@lanonasis/memory-client");
var MemoryService = class {
  constructor(secureApiKeyService) {
    this.client = null;
    this.initializePromise = null;
    this.authenticated = false;
    this.secureApiKeyService = secureApiKeyService;
    this.config = vscode6.workspace.getConfiguration("lanonasis");
    void this.ensureClient();
  }
  async resolveApiKey() {
    if (this.secureApiKeyService) {
      try {
        const secureKey = await this.secureApiKeyService.getApiKey();
        if (secureKey && secureKey.trim().length > 0) {
          return secureKey;
        }
      } catch (error) {
        console.warn("[MemoryService] Failed to read secure API key", error);
      }
    }
    const legacyKey = this.config.get("apiKey");
    if (legacyKey && legacyKey.trim().length > 0) {
      return legacyKey;
    }
    return null;
  }
  async loadClient() {
    const apiUrl = this.config.get("apiUrl", "https://api.lanonasis.com");
    const gatewayUrl = this.config.get("gatewayUrl", "https://api.lanonasis.com");
    const useGateway = this.config.get("useGateway", false);
    const effectiveUrl = useGateway ? gatewayUrl : apiUrl;
    let authToken = null;
    let apiKey = null;
    if (this.secureApiKeyService) {
      try {
        const credential = await this.secureApiKeyService.getStoredCredentials();
        console.log("[MemoryService] getStoredCredentials result:", {
          hasCredential: !!credential,
          type: credential?.type,
          tokenLength: credential?.token?.length,
          tokenPrefix: credential?.token?.substring(0, 12)
        });
        if (credential?.type === "oauth") {
          authToken = credential.token;
          console.log("[MemoryService] Using OAuth token");
        } else if (credential?.type === "apiKey") {
          apiKey = credential.token;
          console.log("[MemoryService] Using API key");
        } else if (credential) {
          console.warn("[MemoryService] Unknown credential type:", credential.type);
        }
      } catch (error) {
        console.warn("[MemoryService] Failed to read stored credentials", error);
      }
    } else {
      console.warn("[MemoryService] No secureApiKeyService available");
    }
    if (!authToken && !apiKey) {
      apiKey = await this.resolveApiKey();
    }
    if (authToken || apiKey) {
      console.log("[MemoryService] Creating client with:", {
        hasAuthToken: !!authToken,
        hasApiKey: !!apiKey,
        apiKeyPrefix: apiKey ? apiKey.substring(0, 8) + "..." : null,
        apiUrl: effectiveUrl
      });
      this.client = (0, import_memory_client2.createMemoryClient)({
        apiUrl: effectiveUrl,
        authToken: authToken || void 0,
        apiKey: apiKey || void 0,
        timeout: 3e4
      });
      this.authenticated = true;
    } else {
      console.log("[MemoryService] No credentials found - client not created");
      this.client = null;
      this.authenticated = false;
    }
  }
  async ensureClient() {
    if (this.client) {
      return;
    }
    if (!this.initializePromise) {
      this.initializePromise = this.loadClient();
    }
    try {
      await this.initializePromise;
    } finally {
      this.initializePromise = null;
    }
  }
  isAuthenticated() {
    if (!this.client && !this.initializePromise) {
      void this.ensureClient();
    }
    return this.authenticated;
  }
  async testConnection(apiKey) {
    const apiUrl = this.config.get("apiUrl", "https://api.lanonasis.com");
    const gatewayUrl = this.config.get("gatewayUrl", "https://api.lanonasis.com");
    const useGateway = this.config.get("useGateway", false);
    const effectiveUrl = useGateway ? gatewayUrl : apiUrl;
    let testClient = null;
    if (apiKey && apiKey.trim().length > 0) {
      testClient = (0, import_memory_client2.createMemoryClient)({
        apiUrl: effectiveUrl,
        apiKey,
        timeout: 1e4
      });
    } else {
      await this.ensureClient();
      testClient = this.client;
    }
    if (!testClient) {
      throw new Error("No API key configured");
    }
    const response = await testClient.healthCheck();
    if (response.error) {
      throw new Error(response.error);
    }
  }
  async createMemory(memory) {
    await this.ensureClient();
    const client = this.client;
    if (!client) {
      throw new Error("Not authenticated. Please configure your API key.");
    }
    const response = await client.createMemory(memory);
    if (response.error || !response.data) {
      throw new Error(response.error || "Failed to create memory");
    }
    return response.data;
  }
  async updateMemory(id, memory) {
    await this.ensureClient();
    const client = this.client;
    if (!client) {
      throw new Error("Not authenticated. Please configure your API key.");
    }
    const response = await client.updateMemory(id, memory);
    if (response.error || !response.data) {
      throw new Error(response.error || "Failed to update memory");
    }
    return response.data;
  }
  async searchMemories(query, options = {}) {
    await this.ensureClient();
    const client = this.client;
    if (!client) {
      throw new Error("Not authenticated. Please configure your API key.");
    }
    const searchRequest = {
      query,
      limit: 20,
      threshold: 0.7,
      status: "active",
      ...options
    };
    const response = await client.searchMemories(searchRequest);
    if (response.error || !response.data) {
      throw new Error(response.error || "Search failed");
    }
    return response.data.results;
  }
  async getMemory(id) {
    await this.ensureClient();
    const client = this.client;
    if (!client) {
      throw new Error("Not authenticated. Please configure your API key.");
    }
    const response = await client.getMemory(id);
    if (response.error || !response.data) {
      throw new Error(response.error || "Memory not found");
    }
    return response.data;
  }
  async listMemories(limit = 50) {
    await this.ensureClient();
    const client = this.client;
    if (!client) {
      throw new Error("Not authenticated. Please configure your API key.");
    }
    if (typeof limit !== "number" || limit < 0) {
      throw new Error("limit must be a non-negative number");
    }
    const validatedLimit = Math.min(Math.max(1, Math.floor(limit)), 1e3);
    const response = await client.listMemories({
      limit: validatedLimit,
      sort: "updated_at",
      order: "desc"
    });
    if (response.error || !response.data) {
      const message = response.error || "Failed to fetch memories";
      if (this.isAuthError(message)) {
        await this.refreshClient();
        if (!this.client) {
          throw new Error(message);
        }
        const retry = await this.client.listMemories({
          limit: validatedLimit,
          sort: "updated_at",
          order: "desc"
        });
        if (retry.error || !retry.data) {
          throw new Error(retry.error || message);
        }
        return retry.data.data;
      }
      throw new Error(message);
    }
    return response.data.data;
  }
  async deleteMemory(id) {
    await this.ensureClient();
    const client = this.client;
    if (!client) {
      throw new Error("Not authenticated. Please configure your API key.");
    }
    const response = await client.deleteMemory(id);
    if (response.error) {
      throw new Error(response.error);
    }
  }
  async getMemoryStats() {
    await this.ensureClient();
    const client = this.client;
    if (!client) {
      throw new Error("Not authenticated. Please configure your API key.");
    }
    const response = await client.getMemoryStats();
    if (response.error || !response.data) {
      throw new Error(response.error || "Failed to fetch stats");
    }
    return response.data;
  }
  async refreshClient() {
    this.config = vscode6.workspace.getConfiguration("lanonasis");
    this.client = null;
    this.authenticated = false;
    await this.ensureClient();
  }
  isAuthError(message) {
    const normalized = message.toLowerCase();
    return normalized.includes("authentication required") || normalized.includes("unauthorized") || normalized.includes("401") || normalized.includes("auth token") || normalized.includes("bearer");
  }
};

// src/services/EnhancedMemoryService.ts
var vscode7 = __toESM(require("vscode"));
function getErrorMessage(error, fallback) {
  if (!error) return fallback;
  if (typeof error === "string") return error;
  return error.message || fallback;
}
var cachedMemoryClientModule;
var attemptedMemoryClientLoad = false;
function getMemoryClientModule() {
  if (!attemptedMemoryClientLoad) {
    attemptedMemoryClientLoad = true;
    try {
      cachedMemoryClientModule = require("@lanonasis/memory-client");
    } catch (error) {
      console.warn("[EnhancedMemoryService] @lanonasis/memory-client not available. Falling back to basic service.", error);
      cachedMemoryClientModule = void 0;
    }
  }
  return cachedMemoryClientModule;
}
var EnhancedMemoryService = class _EnhancedMemoryService {
  constructor(secureApiKeyService) {
    this.client = null;
    this.connectionCapabilities = null;
    const sdkModule = getMemoryClientModule();
    if (!sdkModule) {
      throw new Error("@lanonasis/memory-client module not available");
    }
    this.sdk = sdkModule;
    this.secureApiKeyService = secureApiKeyService;
    this.config = vscode7.workspace.getConfiguration("lanonasis");
    this.showPerformanceFeedback = this.config.get("showPerformanceFeedback", false);
    this.statusBarItem = vscode7.window.createStatusBarItem(
      vscode7.StatusBarAlignment.Right,
      100
    );
    this.statusBarItem.command = "lanonasis.showConnectionInfo";
    this.initializeClient();
  }
  async initializeClient() {
    const { CoreMemoryClient: CoreMemoryClient2 } = this.sdk;
    const credential = await this.secureApiKeyService.getStoredCredentials();
    if (!credential) {
      this.client = null;
      this.updateStatusBar(false, "No API Key");
      return;
    }
    try {
      const clientConfig = this.buildClientConfigFromCredential(credential);
      const apiUrl = this.config.get("apiUrl", "https://api.lanonasis.com");
      const useGateway = this.config.get("useGateway", true);
      clientConfig.apiUrl = useGateway ? this.config.get("gatewayUrl", "https://api.lanonasis.com") : apiUrl;
      const verbose = this.config.get("verboseLogging", false);
      if (verbose && false) {
        verboseLoggingWarningShown = true;
        console.info(
          "[EnhancedMemoryService] Note: Verbose logging is enabled. Disable via Settings > Lanonasis > Verbose Logging for production use."
        );
      }
      this.client = new CoreMemoryClient2(clientConfig);
      this.connectionCapabilities = await this.detectCapabilities();
      this.updateStatusBar(true, this.getConnectionStatus());
    } catch (error) {
      console.warn("Enhanced Memory Service initialization failed:", error);
      this.client = null;
      this.updateStatusBar(false, "Initialization Failed");
      throw error;
    }
  }
  async detectCapabilities() {
    if (!this.client) {
      return {
        authenticated: false,
        connectionMode: "http"
      };
    }
    try {
      const healthResult = await this.client.healthCheck();
      return {
        authenticated: healthResult.error === void 0,
        connectionMode: "http"
      };
    } catch {
      return {
        authenticated: false,
        connectionMode: "http"
      };
    }
  }
  getConnectionStatus() {
    if (!this.connectionCapabilities) return "Unknown";
    return this.connectionCapabilities.authenticated ? "HTTP API" : "Disconnected";
  }
  updateStatusBar(connected, status) {
    if (connected) {
      this.statusBarItem.text = `$(database) ${status}`;
      this.statusBarItem.backgroundColor = void 0;
      this.statusBarItem.tooltip = `Lanonasis Memory: Connected via ${status}`;
    } else {
      this.statusBarItem.text = `$(alert) ${status}`;
      this.statusBarItem.backgroundColor = new vscode7.ThemeColor("statusBarItem.errorBackground");
      this.statusBarItem.tooltip = `Lanonasis Memory: ${status}`;
    }
    this.statusBarItem.show();
  }
  async refreshClient() {
    this.config = vscode7.workspace.getConfiguration("lanonasis");
    await this.initializeClient();
  }
  async refreshConfig() {
    await this.refreshClient();
  }
  isAuthenticated() {
    return this.client !== null;
  }
  getCapabilities() {
    if (!this.connectionCapabilities) return null;
    return {
      cliAvailable: false,
      mcpSupport: false,
      authenticated: this.connectionCapabilities.authenticated,
      goldenContract: false
    };
  }
  async testConnection(apiKey) {
    const { CoreMemoryClient: CoreMemoryClient2 } = this.sdk;
    let testClient = this.client;
    if (apiKey) {
      const config = this.buildClientConfigFromCredential({ type: "apiKey", token: apiKey });
      testClient = new CoreMemoryClient2(config);
    }
    if (!testClient) {
      const credential = await this.secureApiKeyService.getStoredCredentials();
      if (!credential) {
        throw new Error("No API key configured");
      }
      const config = this.buildClientConfigFromCredential(credential);
      testClient = new CoreMemoryClient2(config);
    }
    const testRequest = this.toSDKSearchRequest({
      query: "connection test",
      limit: 1,
      status: "active",
      threshold: 0.1
    });
    const result = await testClient.searchMemories(testRequest);
    if (result.error) {
      throw new Error(getErrorMessage(result.error, "Connection test failed"));
    }
    if (!apiKey) {
      this.connectionCapabilities = await this.detectCapabilities();
      this.updateStatusBar(true, this.getConnectionStatus());
    }
  }
  async createMemory(memory) {
    if (!this.client) {
      throw new Error("Not authenticated. Please configure your API key.");
    }
    const sdkMemory = this.toSDKCreateRequest(memory);
    const result = await this.client.createMemory(sdkMemory);
    if (result.error || !result.data) {
      throw new Error(getErrorMessage(result.error, "Failed to create memory"));
    }
    this.showOperationFeedback("create", result);
    return this.convertSDKMemoryEntry(result.data);
  }
  async updateMemory(id, memory) {
    if (!this.client) {
      throw new Error("Not authenticated. Please configure your API key.");
    }
    const sdkMemory = this.toSDKUpdateRequest(memory);
    const result = await this.client.updateMemory(id, sdkMemory);
    if (result.error || !result.data) {
      throw new Error(getErrorMessage(result.error, "Failed to update memory"));
    }
    this.showOperationFeedback("update", result);
    return this.convertSDKMemoryEntry(result.data);
  }
  async searchMemories(query, options = {}) {
    if (!this.client) {
      throw new Error("Not authenticated. Please configure your API key.");
    }
    const searchRequest = {
      query,
      limit: 20,
      threshold: 0.7,
      status: "active",
      ...options
    };
    const sdkSearchRequest = this.toSDKSearchRequest(searchRequest);
    const result = await this.client.searchMemories(sdkSearchRequest);
    if (result.error || !result.data) {
      throw new Error(getErrorMessage(result.error, "Search failed"));
    }
    if (this.config.get("verboseLogging", false)) {
      this.showOperationFeedback("search", result);
    }
    return this.convertSDKSearchResults(result.data.results);
  }
  async getMemory(id) {
    if (!this.client) {
      throw new Error("Not authenticated. Please configure your API key.");
    }
    const result = await this.client.getMemory(id);
    if (result.error || !result.data) {
      throw new Error(getErrorMessage(result.error, "Memory not found"));
    }
    return this.convertSDKMemoryEntry(result.data);
  }
  async listMemories(limit = 50) {
    if (!this.client) {
      throw new Error("Not authenticated. Please configure your API key.");
    }
    if (typeof limit !== "number" || limit < 0) {
      throw new Error("limit must be a non-negative number");
    }
    const validatedLimit = Math.min(Math.max(1, Math.floor(limit)), 1e3);
    const result = await this.client.listMemories({
      limit: validatedLimit,
      sort: "updated_at",
      order: "desc"
    });
    if (result.error || !result.data) {
      const message = getErrorMessage(result.error, "Failed to fetch memories");
      if (this.isAuthError(message)) {
        await this.refreshClient();
        if (!this.client) {
          throw new Error(message);
        }
        const retry = await this.client.listMemories({
          limit: validatedLimit,
          sort: "updated_at",
          order: "desc"
        });
        if (retry.error || !retry.data) {
          throw new Error(getErrorMessage(retry.error, message));
        }
        return retry.data.data.map((entry) => this.convertSDKMemoryEntry(entry));
      }
      throw new Error(message);
    }
    return result.data.data.map((entry) => this.convertSDKMemoryEntry(entry));
  }
  async deleteMemory(id) {
    if (!this.client) {
      throw new Error("Not authenticated. Please configure your API key.");
    }
    const result = await this.client.deleteMemory(id);
    if (result.error) {
      throw new Error(getErrorMessage(result.error, "Failed to delete memory"));
    }
    this.showOperationFeedback("delete", result);
  }
  async getMemoryStats() {
    if (!this.client) {
      throw new Error("Not authenticated. Please configure your API key.");
    }
    const result = await this.client.getMemoryStats();
    if (result.error || !result.data) {
      throw new Error(getErrorMessage(result.error, "Failed to fetch stats"));
    }
    return this.convertSDKUserMemoryStats(result.data);
  }
  showOperationFeedback(operation, result) {
    if (!this.showPerformanceFeedback) return;
    const source = result.source === "cli" ? result.mcpUsed ? "CLI+MCP" : "CLI" : "API";
    const message = `${operation} completed via ${source}`;
    vscode7.window.setStatusBarMessage(
      `$(check) ${message}`,
      2e3
    );
  }
  async showConnectionInfo() {
    const caps = this.connectionCapabilities;
    if (!caps) {
      vscode7.window.showInformationMessage("Connection status: Unknown");
      return;
    }
    const details = [
      `Connection Mode: ${caps.connectionMode.toUpperCase()}`,
      `Authenticated: ${caps.authenticated ? "\u2705" : "\u274C"}`
    ];
    const message = `Lanonasis Memory Connection Status:

${details.join("\n")}`;
    if (caps.authenticated) {
      vscode7.window.showInformationMessage(
        `${message}

Connected via HTTP API.`
      );
    } else {
      vscode7.window.showWarningMessage(
        `${message}

Please authenticate to access memory features.`
      );
    }
  }
  toSDKCreateRequest(memory) {
    const { memory_type, ...rest } = memory;
    return {
      ...rest,
      memory_type: this.mapMemoryType(memory_type)
    };
  }
  toSDKUpdateRequest(memory) {
    const { memory_type, ...rest } = memory;
    const result = { ...rest };
    if (memory_type !== void 0) {
      result.memory_type = this.mapMemoryType(memory_type);
    }
    return result;
  }
  toSDKSearchRequest(request) {
    const { memory_types, ...rest } = request;
    const sdkTypes = memory_types?.map((type) => this.mapMemoryType(type));
    const sdkRequest = {
      ...rest,
      ...sdkTypes ? { memory_types: sdkTypes } : {}
    };
    return sdkRequest;
  }
  mapMemoryType(vscodeType) {
    const typeMap = {
      knowledge: "knowledge",
      project: "project",
      context: "context",
      reference: "reference",
      personal: "personal",
      workflow: "workflow"
    };
    return typeMap[vscodeType] ?? "context";
  }
  mapMemoryTypeFromSDK(sdkType) {
    const typeMap = {
      context: "context",
      project: "project",
      knowledge: "knowledge",
      reference: "reference",
      personal: "personal",
      workflow: "workflow"
    };
    return typeMap[sdkType] ?? "context";
  }
  convertSDKMemoryEntry(sdkEntry) {
    return {
      ...sdkEntry,
      memory_type: this.mapMemoryTypeFromSDK(sdkEntry.memory_type)
    };
  }
  buildClientConfigFromCredential(credential) {
    const vscodeConfig = vscode7.workspace.getConfiguration("lanonasis");
    const apiUrl = vscodeConfig.get("apiUrl", "https://api.lanonasis.com");
    const config = {
      apiUrl,
      apiKey: credential.type === "apiKey" ? credential.token : void 0,
      timeout: 3e4,
      retry: {
        maxRetries: 3,
        retryDelay: 1e3,
        backoff: "exponential"
      },
      headers: {
        "X-Client-Type": "vscode-extension",
        "X-Client-Version": "2.0.5",
        "X-Project-Scope": "lanonasis-maas"
        // Required by backend auth middleware
      }
    };
    if (credential.type === "oauth") {
      config.apiKey = void 0;
      config.authToken = credential.token;
      try {
        const parts = credential.token.split(".");
        if (parts.length >= 2) {
          const payload = JSON.parse(Buffer.from(parts[1], "base64").toString());
          if (payload.sub || payload.user_id) {
            config.userId = payload.sub || payload.user_id;
          }
        }
      } catch {
      }
    }
    const organizationId = vscodeConfig.get("organizationId");
    if (organizationId) {
      config.headers = {
        ...config.headers,
        "X-Organization-ID": organizationId
      };
      config.organizationId = organizationId;
    }
    return config;
  }
  convertSDKSearchResults(sdkResults) {
    return sdkResults.map((result) => ({
      ...result,
      memory_type: this.mapMemoryTypeFromSDK(result.memory_type)
    }));
  }
  isAuthError(message) {
    const normalized = message.toLowerCase();
    return normalized.includes("authentication required") || normalized.includes("unauthorized") || normalized.includes("401") || normalized.includes("auth token") || normalized.includes("bearer");
  }
  convertSDKUserMemoryStats(stats) {
    const initial = {
      knowledge: 0,
      project: 0,
      context: 0,
      reference: 0,
      personal: 0,
      workflow: 0
    };
    const memoriesByType = { ...initial };
    for (const [key, value] of Object.entries(stats.memories_by_type)) {
      const mappedKey = this.mapMemoryTypeFromSDK(key);
      memoriesByType[mappedKey] = value;
    }
    return {
      ...stats,
      memories_by_type: memoriesByType
    };
  }
  dispose() {
    this.statusBarItem.dispose();
  }
  // Migration helper for existing MemoryService users
  static async migrateFromBasicService(secureApiKeyService) {
    const enhanced = new _EnhancedMemoryService(secureApiKeyService);
    vscode7.window.showInformationMessage(
      "Upgraded to Enhanced Memory Service!",
      "Learn More"
    ).then((selection) => {
      if (selection === "Learn More") {
        vscode7.env.openExternal(vscode7.Uri.parse("https://docs.lanonasis.com/sdk"));
      }
    });
    return enhanced;
  }
};

// src/services/MemoryCache.ts
var CACHE_KEYS = {
  MEMORIES: "lanonasis.memories.cache",
  LAST_SYNC: "lanonasis.memories.lastSync"
};
var MemoryCache = class {
  constructor(context, output) {
    this.context = context;
    this.output = output;
    this.maxSize = 50;
    this.memories = [];
    this.lastSyncAt = null;
    this.isRefreshing = false;
    this.loadFromStorage();
  }
  loadFromStorage() {
    try {
      const cached = this.context.globalState.get(CACHE_KEYS.MEMORIES, []);
      const lastSync = this.context.globalState.get(CACHE_KEYS.LAST_SYNC, null);
      this.memories = cached;
      this.lastSyncAt = lastSync;
      this.trimToLimit();
      this.output.appendLine(`[MemoryCache] Loaded ${this.memories.length} cached memories`);
    } catch (err) {
      this.output.appendLine(`[MemoryCache] Load error: ${err}`);
    }
  }
  async saveToStorage() {
    try {
      await this.context.globalState.update(CACHE_KEYS.MEMORIES, this.memories);
      await this.context.globalState.update(CACHE_KEYS.LAST_SYNC, this.lastSyncAt);
    } catch (err) {
      this.output.appendLine(`[MemoryCache] Save error: ${err}`);
    }
  }
  getStatus() {
    return {
      lastSyncAt: this.lastSyncAt,
      isRefreshing: this.isRefreshing,
      count: this.memories.length
    };
  }
  getMemories(limit = this.maxSize) {
    return [...this.memories].slice(0, limit);
  }
  getMemory(id) {
    return this.memories.find((memory) => memory.id === id);
  }
  setRefreshing(refreshing) {
    this.isRefreshing = refreshing;
  }
  async clear() {
    this.memories = [];
    this.lastSyncAt = null;
    await this.saveToStorage();
  }
  async updateFromApi(memories) {
    this.memories = memories.map((memory) => ({
      ...memory,
      _cachedAt: Date.now()
    }));
    this.trimToLimit();
    this.lastSyncAt = Date.now();
    await this.saveToStorage();
  }
  async upsert(memory) {
    const index = this.memories.findIndex((item) => item.id === memory.id);
    if (index >= 0) {
      this.memories[index] = { ...memory, _cachedAt: Date.now() };
    } else {
      this.memories.unshift({ ...memory, _cachedAt: Date.now() });
    }
    this.trimToLimit();
    await this.saveToStorage();
  }
  async replace(tempId, memory) {
    const index = this.memories.findIndex((item) => item.id === tempId);
    if (index >= 0) {
      this.memories[index] = { ...memory, _cachedAt: Date.now() };
    } else {
      this.memories.unshift({ ...memory, _cachedAt: Date.now() });
    }
    this.trimToLimit();
    await this.saveToStorage();
  }
  async remove(id) {
    this.memories = this.memories.filter((memory) => memory.id !== id);
    await this.saveToStorage();
  }
  searchLocal(query) {
    const q = query.toLowerCase();
    const findPatterns = [
      /find\s+(?:my\s+)?(.+)/i,
      /search\s+(?:for\s+)?(.+)/i,
      /show\s+(?:me\s+)?(.+)/i,
      /get\s+(?:my\s+)?(.+)/i,
      /recall\s+(.+)/i,
      /what\s+(?:was|were|is|are)\s+(?:my\s+)?(.+)/i,
      /where\s+(?:is|are|did)\s+(?:my\s+)?(.+)/i
    ];
    let searchTerms = q;
    for (const pattern of findPatterns) {
      const match = q.match(pattern);
      if (match) {
        searchTerms = match[1] || match[2] || q;
        break;
      }
    }
    const stopWords = ["the", "a", "an", "my", "that", "this", "about", "notes", "note", "memory", "memories"];
    const keywords = searchTerms.split(/\s+/).filter((word) => word.length > 2 && !stopWords.includes(word));
    if (keywords.length === 0) {
      return this.memories.slice(0, 10);
    }
    const scored = this.memories.map((memory) => {
      let score = 0;
      const titleLower = memory.title.toLowerCase();
      const contentLower = memory.content.toLowerCase();
      const tagsLower = memory.tags.map((tag) => tag.toLowerCase());
      for (const keyword of keywords) {
        if (titleLower.includes(keyword)) score += 3;
        if (contentLower.includes(keyword)) score += 1;
        if (tagsLower.some((tag) => tag.includes(keyword))) score += 2;
      }
      return { memory, score };
    });
    return scored.filter((item) => item.score > 0).sort((a, b) => b.score - a.score).slice(0, 10).map((item) => item.memory);
  }
  trimToLimit() {
    if (this.memories.length <= this.maxSize) return;
    this.memories = [...this.memories].sort((a, b) => (b._cachedAt || 0) - (a._cachedAt || 0)).slice(0, this.maxSize);
  }
};

// src/services/ApiKeyService.ts
var vscode8 = __toESM(require("vscode"));
var ApiKeyService = class {
  constructor(secureApiKeyService) {
    this.baseUrl = "https://api.lanonasis.com";
    this.secureApiKeyService = secureApiKeyService;
    this.config = vscode8.workspace.getConfiguration("lanonasis");
    this.updateConfig();
  }
  updateConfig() {
    const useGateway = this.config.get("useGateway", true);
    const apiUrl = this.config.get("apiUrl", "https://api.lanonasis.com");
    const gatewayUrl = this.config.get("gatewayUrl", "https://api.lanonasis.com");
    this.baseUrl = this.sanitizeBaseUrl(useGateway ? gatewayUrl : apiUrl);
  }
  refreshConfig() {
    this.config = vscode8.workspace.getConfiguration("lanonasis");
    this.updateConfig();
  }
  async makeRequest(endpoint, options = {}) {
    const credentials = await this.resolveCredentials();
    const normalizedEndpoint = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;
    const url = `${this.baseUrl}${normalizedEndpoint}`;
    const authHeaders = credentials.type === "oauth" ? { "Authorization": `Bearer ${credentials.token}` } : { "X-API-Key": credentials.token };
    const response = await fetch(url, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...authHeaders,
        ...options.headers
      }
    });
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API request failed: ${response.status} ${response.statusText} - ${errorText}`);
    }
    return response.json();
  }
  sanitizeBaseUrl(url) {
    if (!url) {
      return "https://api.lanonasis.com";
    }
    let clean = url.trim();
    clean = clean.replace(/\/+$/, "");
    clean = clean.replace(/\/api\/v1$/i, "").replace(/\/api$/i, "");
    return clean || "https://api.lanonasis.com";
  }
  async resolveCredentials() {
    let credentials = await this.secureApiKeyService.getStoredCredentials();
    if (!credentials) {
      const value = await this.secureApiKeyService.getApiKeyOrPrompt();
      if (!value) {
        throw new Error("API key not configured. Please configure your API key to use Lanonasis services.");
      }
      credentials = await this.secureApiKeyService.getStoredCredentials();
      if (!credentials) {
        credentials = {
          type: this.looksLikeJwt(value) ? "oauth" : "apiKey",
          token: value
        };
      }
    }
    return credentials;
  }
  looksLikeJwt(token) {
    const parts = token.split(".");
    if (parts.length !== 3) {
      return false;
    }
    const jwtSegment = /^[A-Za-z0-9-_]+$/;
    return parts.every((segment) => jwtSegment.test(segment));
  }
  isFallbackableError(error) {
    const message = error instanceof Error ? error.message : String(error);
    return message.includes("404") || message.includes("405") || message.includes("Not Found") || message.includes("Method Not Allowed");
  }
  isPostRequiredError(error) {
    const message = error instanceof Error ? error.message : String(error);
    return message.includes("Use POST") || message.includes("Method not allowed") || message.includes("Method Not Allowed");
  }
  normalizeApiKeysResponse(response) {
    if (response && typeof response === "object" && "data" in response && Array.isArray(response.data)) {
      return response.data;
    }
    if (Array.isArray(response)) {
      return response;
    }
    return [];
  }
  // ============================================================================
  // PROJECT MANAGEMENT
  // ============================================================================
  async getProjects() {
    return this.makeRequest("/api/v1/projects");
  }
  async getProject(projectId) {
    return this.makeRequest(`/api/v1/projects/${projectId}`);
  }
  async createProject(request) {
    return this.makeRequest("/api/v1/projects", {
      method: "POST",
      body: JSON.stringify(request)
    });
  }
  async updateProject(projectId, updates) {
    return this.makeRequest(`/api/v1/projects/${projectId}`, {
      method: "PUT",
      body: JSON.stringify(updates)
    });
  }
  async deleteProject(projectId) {
    await this.makeRequest(`/api/v1/projects/${projectId}`, {
      method: "DELETE"
    });
  }
  // ============================================================================
  // API KEY MANAGEMENT
  // ============================================================================
  async getApiKeys(projectId) {
    const primaryEndpoint = projectId ? `/api/v1/api-keys?projectId=${encodeURIComponent(projectId)}` : "/api/v1/api-keys";
    const legacyEndpoint = projectId ? `/api/v1/projects/${projectId}/api-keys` : "/api/v1/auth/api-keys";
    try {
      const response = await this.makeRequest(primaryEndpoint);
      return this.normalizeApiKeysResponse(response);
    } catch (error) {
      if (!this.isFallbackableError(error)) {
        throw error;
      }
      try {
        const response = await this.makeRequest(legacyEndpoint);
        return this.normalizeApiKeysResponse(response);
      } catch (legacyError) {
        if (!this.isPostRequiredError(legacyError) || !legacyEndpoint.includes("/auth/api-keys")) {
          throw legacyError;
        }
        const response = await this.makeRequest(legacyEndpoint, {
          method: "POST",
          body: JSON.stringify(projectId ? { projectId } : {})
        });
        return this.normalizeApiKeysResponse(response);
      }
    }
  }
  async getApiKey(keyId) {
    try {
      return await this.makeRequest(`/api/v1/api-keys/${keyId}`);
    } catch (error) {
      if (!this.isFallbackableError(error)) {
        throw error;
      }
      return this.makeRequest(`/api/v1/auth/api-keys/${keyId}`);
    }
  }
  async createApiKey(request) {
    try {
      return await this.makeRequest("/api/v1/api-keys", {
        method: "POST",
        body: JSON.stringify(request)
      });
    } catch (error) {
      if (!this.isFallbackableError(error)) {
        throw error;
      }
      return this.makeRequest("/api/v1/auth/api-keys", {
        method: "POST",
        body: JSON.stringify(request)
      });
    }
  }
  async updateApiKey(keyId, updates) {
    try {
      return await this.makeRequest(`/api/v1/api-keys/${keyId}`, {
        method: "PUT",
        body: JSON.stringify(updates)
      });
    } catch (error) {
      if (!this.isFallbackableError(error)) {
        throw error;
      }
      return this.makeRequest(`/api/v1/auth/api-keys/${keyId}`, {
        method: "PUT",
        body: JSON.stringify(updates)
      });
    }
  }
  async deleteApiKey(keyId) {
    try {
      await this.makeRequest(`/api/v1/api-keys/${keyId}`, {
        method: "DELETE"
      });
    } catch (error) {
      if (!this.isFallbackableError(error)) {
        throw error;
      }
      await this.makeRequest(`/api/v1/auth/api-keys/${keyId}`, {
        method: "DELETE"
      });
    }
  }
  async rotateApiKey(keyId) {
    try {
      return await this.makeRequest(`/api/v1/api-keys/${keyId}/rotate`, {
        method: "POST"
      });
    } catch (error) {
      if (!this.isFallbackableError(error)) {
        throw error;
      }
      return this.makeRequest(`/api/v1/auth/api-keys/${keyId}/rotate`, {
        method: "POST"
      });
    }
  }
  // ============================================================================
  // UTILITY METHODS
  // ============================================================================
  async testConnection() {
    try {
      const credentials = await this.resolveCredentials();
      if (credentials.type === "oauth") {
        const response = await fetch(`${this.baseUrl}/oauth/introspect`, {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            "Authorization": `Bearer ${credentials.token}`
          },
          body: new URLSearchParams({ token: credentials.token })
        });
        if (!response.ok) {
          return false;
        }
        const data = await response.json();
        return data.active === true;
      }
      await this.makeRequest("/health");
      return true;
    } catch {
      return false;
    }
  }
  async getUserInfo() {
    return this.makeRequest("/api/v1/auth/me");
  }
};

// src/extension.ts
var import_ide_extension_core = require("@lanonasis/ide-extension-core");

// src/utils/diagnostics.ts
var vscode9 = __toESM(require("vscode"));
async function runDiagnostics(context, secureApiKeyService, memoryService, outputChannel) {
  const results = [];
  outputChannel.appendLine("==================================================");
  outputChannel.appendLine("Starting Lanonasis Extension Diagnostics");
  outputChannel.appendLine(`Timestamp: ${(/* @__PURE__ */ new Date()).toISOString()}`);
  outputChannel.appendLine("==================================================\n");
  results.push(await checkExtensionContext(context, outputChannel));
  results.push(await checkVSCodeVersion(outputChannel));
  results.push(await checkConfiguration(outputChannel));
  results.push(await checkAuthentication(secureApiKeyService, outputChannel));
  results.push(await checkNetworkConnectivity(memoryService, outputChannel));
  results.push(await checkConnectionMode(memoryService, outputChannel));
  results.push(await checkStorage(context, outputChannel));
  const overall = determineOverallHealth(results);
  outputChannel.appendLine("\n==================================================");
  outputChannel.appendLine(`Overall Health: ${overall.toUpperCase()}`);
  outputChannel.appendLine("==================================================");
  return {
    overall,
    results,
    timestamp: /* @__PURE__ */ new Date()
  };
}
async function checkExtensionContext(context, outputChannel) {
  outputChannel.appendLine("[1/7] Checking Extension Context...");
  try {
    if (!context) {
      return {
        category: "Extension Context",
        status: "error",
        message: "Extension context is not available",
        action: "Reload VSCode"
      };
    }
    const globalStoragePath = context.globalStorageUri?.fsPath;
    const workspaceStoragePath = context.storageUri?.fsPath;
    outputChannel.appendLine(`  \u2713 Extension ID: ${context.extension.id}`);
    outputChannel.appendLine(`  \u2713 Extension Path: ${context.extensionPath}`);
    outputChannel.appendLine(`  \u2713 Global Storage: ${globalStoragePath || "N/A"}`);
    outputChannel.appendLine(`  \u2713 Workspace Storage: ${workspaceStoragePath || "N/A"}`);
    return {
      category: "Extension Context",
      status: "success",
      message: "Extension context is properly initialized"
    };
  } catch (error) {
    outputChannel.appendLine(`  \u2717 Error: ${error instanceof Error ? error.message : String(error)}`);
    return {
      category: "Extension Context",
      status: "error",
      message: "Failed to check extension context",
      details: error instanceof Error ? error.message : String(error)
    };
  }
}
async function checkVSCodeVersion(outputChannel) {
  outputChannel.appendLine("\n[2/7] Checking VSCode Version...");
  try {
    const version3 = vscode9.version;
    const requiredVersion = "1.74.0";
    outputChannel.appendLine(`  \u2713 Current Version: ${version3}`);
    outputChannel.appendLine(`  \u2713 Required Version: ${requiredVersion}+`);
    const [major, minor] = version3.split(".").map(Number);
    const [reqMajor, reqMinor] = requiredVersion.split(".").map(Number);
    if (major > reqMajor || major === reqMajor && minor >= reqMinor) {
      return {
        category: "VSCode Version",
        status: "success",
        message: `VSCode ${version3} meets minimum requirements`
      };
    } else {
      return {
        category: "VSCode Version",
        status: "warning",
        message: `VSCode ${version3} is below recommended version ${requiredVersion}`,
        action: "Update VSCode"
      };
    }
  } catch (error) {
    outputChannel.appendLine(`  \u2717 Error: ${error instanceof Error ? error.message : String(error)}`);
    return {
      category: "VSCode Version",
      status: "error",
      message: "Failed to check VSCode version",
      details: error instanceof Error ? error.message : String(error)
    };
  }
}
async function checkConfiguration(outputChannel) {
  outputChannel.appendLine("\n[3/7] Checking Configuration...");
  try {
    const config = vscode9.workspace.getConfiguration("lanonasis");
    const apiUrl = config.get("apiUrl");
    const gatewayUrl = config.get("gatewayUrl");
    const useGateway = config.get("useGateway");
    const enableMCP = config.get("enableMCP");
    const preferCLI = config.get("preferCLI");
    outputChannel.appendLine(`  \u2713 API URL: ${apiUrl}`);
    outputChannel.appendLine(`  \u2713 Gateway URL: ${gatewayUrl}`);
    outputChannel.appendLine(`  \u2713 Use Gateway: ${useGateway}`);
    outputChannel.appendLine(`  \u2713 Enable MCP: ${enableMCP}`);
    outputChannel.appendLine(`  \u2713 Prefer CLI: ${preferCLI}`);
    const issues = [];
    if (!apiUrl) {
      issues.push("API URL not configured");
    }
    if (useGateway && !gatewayUrl) {
      issues.push("Gateway mode enabled but Gateway URL not configured");
    }
    if (issues.length > 0) {
      return {
        category: "Configuration",
        status: "warning",
        message: "Configuration issues detected",
        details: issues.join("; "),
        action: "Check Settings"
      };
    }
    return {
      category: "Configuration",
      status: "success",
      message: "Configuration is valid"
    };
  } catch (error) {
    outputChannel.appendLine(`  \u2717 Error: ${error instanceof Error ? error.message : String(error)}`);
    return {
      category: "Configuration",
      status: "error",
      message: "Failed to check configuration",
      details: error instanceof Error ? error.message : String(error)
    };
  }
}
async function checkAuthentication(secureApiKeyService, outputChannel) {
  outputChannel.appendLine("\n[4/7] Checking Authentication...");
  try {
    const credentials = await secureApiKeyService.getStoredCredentials();
    if (credentials) {
      outputChannel.appendLine(`  \u2713 Credential type: ${credentials.type.toUpperCase()}`);
      outputChannel.appendLine(`  \u2713 Token length: ${credentials.token.length} characters`);
      outputChannel.appendLine(`  \u2713 Token prefix: ${credentials.token.substring(0, 12)}...`);
      const isJwt = credentials.token.split(".").length === 3;
      outputChannel.appendLine(`  \u2713 Token format: ${isJwt ? "JWT (OAuth)" : "API Key"}`);
      if (credentials.type === "oauth") {
        outputChannel.appendLine("  \u2713 OAuth authentication detected");
      } else {
        outputChannel.appendLine("  \u2713 API Key authentication detected");
      }
      return {
        category: "Authentication",
        status: "success",
        message: `Authenticated with ${credentials.type === "oauth" ? "OAuth token" : "API key"}`
      };
    }
    const hasApiKey = await secureApiKeyService.hasApiKey();
    if (hasApiKey) {
      outputChannel.appendLine("  \u26A0 API key exists but getStoredCredentials returned null");
      try {
        const apiKey = await secureApiKeyService.getApiKey();
        if (apiKey && apiKey.length > 0) {
          outputChannel.appendLine(`  \u2713 API key length: ${apiKey.length} characters`);
          outputChannel.appendLine(`  \u2713 API key prefix: ${apiKey.substring(0, 8)}...`);
          return {
            category: "Authentication",
            status: "warning",
            message: "API key exists but credential type unknown",
            action: "Re-authenticate for best results"
          };
        }
      } catch (error) {
        outputChannel.appendLine(`  \u2717 Error retrieving API key: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
    outputChannel.appendLine("  \u2139 No credentials found");
    return {
      category: "Authentication",
      status: "info",
      message: "Not authenticated",
      action: "Authenticate"
    };
  } catch (error) {
    outputChannel.appendLine(`  \u2717 Error: ${error instanceof Error ? error.message : String(error)}`);
    return {
      category: "Authentication",
      status: "error",
      message: "Failed to check authentication status",
      details: error instanceof Error ? error.message : String(error)
    };
  }
}
async function checkNetworkConnectivity(memoryService, outputChannel) {
  outputChannel.appendLine("\n[5/7] Checking Network Connectivity...");
  try {
    if (!memoryService.isAuthenticated()) {
      outputChannel.appendLine("  \u2139 Skipping (not authenticated)");
      return {
        category: "Network Connectivity",
        status: "info",
        message: "Skipped - not authenticated"
      };
    }
    outputChannel.appendLine("  \u23F3 Testing connection...");
    const startTime = Date.now();
    await memoryService.testConnection();
    const duration = Date.now() - startTime;
    outputChannel.appendLine(`  \u2713 Connection successful (${duration}ms)`);
    return {
      category: "Network Connectivity",
      status: "success",
      message: `Connected successfully in ${duration}ms`
    };
  } catch (error) {
    outputChannel.appendLine(`  \u2717 Connection failed: ${error instanceof Error ? error.message : String(error)}`);
    return {
      category: "Network Connectivity",
      status: "error",
      message: "Unable to connect to Lanonasis servers",
      details: error instanceof Error ? error.message : String(error),
      action: "Check internet connection"
    };
  }
}
async function checkConnectionMode(memoryService, outputChannel) {
  outputChannel.appendLine("\n[6/7] Checking Connection Mode...");
  try {
    if (isEnhancedMemoryService(memoryService)) {
      const capabilities = memoryService.getCapabilities();
      if (capabilities) {
        outputChannel.appendLine(`  \u2713 Enhanced Memory Service detected`);
        outputChannel.appendLine(`  \u2713 Connection Mode: HTTP API`);
        outputChannel.appendLine(`  \u2713 Authenticated: ${capabilities.authenticated}`);
        if (capabilities.authenticated) {
          return {
            category: "Connection Mode",
            status: "success",
            message: "Connected via HTTP API"
          };
        } else {
          return {
            category: "Connection Mode",
            status: "warning",
            message: "HTTP API available but not authenticated",
            action: "Configure API key"
          };
        }
      }
    }
    outputChannel.appendLine("  \u2139 Using basic memory service");
    return {
      category: "Connection Mode",
      status: "info",
      message: "Using basic memory service with HTTP API"
    };
  } catch (error) {
    outputChannel.appendLine(`  \u2717 Error: ${error instanceof Error ? error.message : String(error)}`);
    return {
      category: "Connection Mode",
      status: "warning",
      message: "Unable to check connection mode",
      details: error instanceof Error ? error.message : String(error)
    };
  }
}
async function checkStorage(context, outputChannel) {
  outputChannel.appendLine("\n[7/7] Checking Storage...");
  try {
    await context.globalState.update("lanonasis.diagnosticTest", Date.now());
    const testValue = context.globalState.get("lanonasis.diagnosticTest");
    if (!testValue) {
      outputChannel.appendLine("  \u2717 Global state write/read failed");
      return {
        category: "Storage",
        status: "error",
        message: "Storage system is not working properly",
        action: "Reload VSCode"
      };
    }
    outputChannel.appendLine("  \u2713 Global state is accessible");
    const keys = context.globalState.keys();
    outputChannel.appendLine(`  \u2713 Stored keys: ${keys.length}`);
    const firstTime = context.globalState.get("lanonasis.firstTime");
    outputChannel.appendLine(`  \u2713 First time flag: ${firstTime}`);
    return {
      category: "Storage",
      status: "success",
      message: "Storage system is working properly"
    };
  } catch (error) {
    outputChannel.appendLine(`  \u2717 Error: ${error instanceof Error ? error.message : String(error)}`);
    return {
      category: "Storage",
      status: "error",
      message: "Storage system check failed",
      details: error instanceof Error ? error.message : String(error)
    };
  }
}
function determineOverallHealth(results) {
  const hasError = results.some((r) => r.status === "error");
  const hasWarning = results.some((r) => r.status === "warning");
  if (hasError) {
    return "critical";
  } else if (hasWarning) {
    return "degraded";
  } else {
    return "healthy";
  }
}
function formatDiagnosticResults(health) {
  const statusEmoji = {
    healthy: "\u2705",
    degraded: "\u26A0\uFE0F",
    critical: "\u274C"
  };
  const resultEmoji = {
    success: "\u2705",
    warning: "\u26A0\uFE0F",
    error: "\u274C",
    info: "\u2139\uFE0F"
  };
  let output = `# Lanonasis Extension Diagnostics

`;
  output += `**Overall Health:** ${statusEmoji[health.overall]} ${health.overall.toUpperCase()}
`;
  output += `**Timestamp:** ${health.timestamp.toLocaleString()}

`;
  output += `---

`;
  for (const result of health.results) {
    output += `## ${resultEmoji[result.status]} ${result.category}

`;
    output += `**Status:** ${result.status.toUpperCase()}

`;
    output += `**Message:** ${result.message}

`;
    if (result.details) {
      output += `**Details:** ${result.details}

`;
    }
    if (result.action) {
      output += `**Recommended Action:** ${result.action}

`;
    }
    output += `---

`;
  }
  return output;
}

// src/services/MCPDiscoveryService.ts
var vscode10 = __toESM(require("vscode"));
var DEFAULT_MCP_PORTS = [3001, 3002, 3e3];
var DEFAULT_MCP_HOST = "localhost";
var DISCOVERY_TIMEOUT_MS = 2e3;
var MCPDiscoveryService = class {
  constructor(outputChannel) {
    this.discoveredServer = null;
    this.lastDiscoveryAt = null;
    this.discoveryCacheTtlMs = 60 * 1e3;
    this.config = vscode10.workspace.getConfiguration("lanonasis");
    this.outputChannel = outputChannel || vscode10.window.createOutputChannel("Lanonasis MCP");
    this.statusBarItem = vscode10.window.createStatusBarItem(
      vscode10.StatusBarAlignment.Right,
      99
    );
    this.statusBarItem.command = "lanonasis.showMCPStatus";
  }
  /**
   * Auto-discover MCP server using multiple strategies
   */
  async discover() {
    this.config = vscode10.workspace.getConfiguration("lanonasis");
    const enableAutoDiscover = this.config.get("mcpAutoDiscover", true);
    const enableMCP = this.config.get("enableMCP", true);
    if (!enableMCP) {
      this.log("MCP disabled in configuration");
      this.updateStatusBar(null);
      return null;
    }
    if (this.lastDiscoveryAt && Date.now() - this.lastDiscoveryAt < this.discoveryCacheTtlMs) {
      this.log("Using cached MCP discovery result");
      this.updateStatusBar(this.discoveredServer);
      return this.discoveredServer;
    }
    const configuredUrl = this.config.get("mcpServerUrl", "");
    if (configuredUrl) {
      this.log(`Checking configured MCP server: ${configuredUrl}`);
      const server = await this.checkServer(configuredUrl, "configured");
      if (server) {
        this.discoveredServer = server;
        this.updateStatusBar(server);
        this.lastDiscoveryAt = Date.now();
        return server;
      }
    }
    const envUrl = process.env.LANONASIS_MCP_URL || process.env.MCP_SERVER_URL;
    if (envUrl) {
      this.log(`Checking environment MCP server: ${envUrl}`);
      const server = await this.checkServer(envUrl, "environment");
      if (server) {
        this.discoveredServer = server;
        this.updateStatusBar(server);
        this.lastDiscoveryAt = Date.now();
        return server;
      }
    }
    if (enableAutoDiscover) {
      this.log("Starting MCP auto-discovery...");
      for (const port of DEFAULT_MCP_PORTS) {
        const url = `http://${DEFAULT_MCP_HOST}:${port}`;
        this.log(`Probing ${url}...`);
        const server = await this.checkServer(url, "auto-discovered");
        if (server) {
          this.discoveredServer = server;
          this.updateStatusBar(server);
          vscode10.window.showInformationMessage(
            `MCP server discovered at ${url}`,
            "Show Details"
          ).then((selection) => {
            if (selection === "Show Details") {
              this.showServerDetails();
            }
          });
          this.lastDiscoveryAt = Date.now();
          return server;
        }
      }
    }
    this.log("No MCP server found");
    this.updateStatusBar(null);
    this.lastDiscoveryAt = Date.now();
    return null;
  }
  /**
   * Check if a specific URL has a valid MCP server
   */
  async checkServer(url, source) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), DISCOVERY_TIMEOUT_MS);
      const healthUrl = `${url.replace(/\/$/, "")}/health`;
      const response = await fetch(healthUrl, {
        method: "GET",
        headers: {
          "Accept": "application/json",
          "X-Client-Type": "vscode-extension"
        },
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      if (!response.ok) {
        this.log(`Health check failed for ${url}: ${response.status}`);
        return null;
      }
      const health = await response.json();
      if (health.status !== "healthy" && health.status !== "degraded") {
        this.log(`Server at ${url} is unhealthy: ${health.status}`);
        return null;
      }
      const capabilities = await this.detectCapabilities(url);
      const serverInfo = {
        url,
        version: health.version || "unknown",
        capabilities,
        isHealthy: health.status === "healthy",
        source
      };
      this.log(`MCP server found at ${url}: v${serverInfo.version}`);
      return serverInfo;
    } catch (error) {
      if (error instanceof Error) {
        if (error.name === "AbortError") {
          this.log(`Timeout checking ${url}`);
        } else {
          this.log(`Error checking ${url}: ${error.message}`);
        }
      }
      return null;
    }
  }
  /**
   * Detect server capabilities by probing endpoints
   */
  async detectCapabilities(baseUrl) {
    const capabilities = {
      memories: false,
      search: false,
      apiKeys: false,
      projects: false,
      streaming: false
    };
    const endpoints = [
      { path: "/api/v1/memories", capability: "memories" },
      { path: "/api/v1/memories/search", capability: "search" },
      { path: "/api/v1/api-keys", capability: "apiKeys" },
      { path: "/api/v1/projects", capability: "projects" }
    ];
    const probePromises = endpoints.map(async ({ path, capability }) => {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 1e3);
        const response = await fetch(`${baseUrl}${path}`, {
          method: "OPTIONS",
          signal: controller.signal
        });
        clearTimeout(timeoutId);
        if (response.status < 500) {
          capabilities[capability] = true;
        }
      } catch {
      }
    });
    await Promise.all(probePromises);
    return capabilities;
  }
  /**
   * Get the currently discovered server
   */
  getDiscoveredServer() {
    return this.discoveredServer;
  }
  /**
   * Get the MCP server URL (discovered or configured)
   */
  getServerUrl() {
    if (this.discoveredServer) {
      return this.discoveredServer.url;
    }
    const configuredUrl = this.config.get("mcpServerUrl", "");
    if (configuredUrl) {
      return configuredUrl;
    }
    return null;
  }
  /**
   * Check if MCP is available
   */
  isAvailable() {
    return this.discoveredServer !== null && this.discoveredServer.isHealthy;
  }
  /**
   * Re-check the currently discovered server
   */
  async refresh() {
    if (!this.discoveredServer) {
      const server2 = await this.discover();
      return server2 !== null;
    }
    const server = await this.checkServer(
      this.discoveredServer.url,
      this.discoveredServer.source
    );
    if (server) {
      this.discoveredServer = server;
      this.updateStatusBar(server);
      return true;
    } else {
      this.discoveredServer = null;
      this.updateStatusBar(null);
      return false;
    }
  }
  /**
   * Show server details in a quick pick
   */
  async showServerDetails() {
    const server = this.discoveredServer;
    if (!server) {
      vscode10.window.showWarningMessage("No MCP server currently connected");
      return;
    }
    const capabilities = Object.entries(server.capabilities).filter(([, enabled]) => enabled).map(([name]) => name).join(", ");
    const items = [
      {
        label: "$(globe) Server URL",
        description: server.url,
        detail: `Source: ${server.source}`
      },
      {
        label: "$(versions) Version",
        description: server.version
      },
      {
        label: server.isHealthy ? "$(check) Status" : "$(warning) Status",
        description: server.isHealthy ? "Healthy" : "Degraded"
      },
      {
        label: "$(list-unordered) Capabilities",
        description: capabilities || "None detected"
      },
      {
        label: "$(refresh) Refresh",
        description: "Re-check server status"
      },
      {
        label: "$(debug-disconnect) Disconnect",
        description: "Clear discovered server"
      }
    ];
    const selected = await vscode10.window.showQuickPick(items, {
      title: "MCP Server Details",
      placeHolder: "Select an action"
    });
    if (selected?.label.includes("Refresh")) {
      await this.refresh();
      vscode10.window.showInformationMessage(
        this.discoveredServer ? "MCP server refreshed" : "MCP server disconnected"
      );
    } else if (selected?.label.includes("Disconnect")) {
      this.discoveredServer = null;
      this.updateStatusBar(null);
      vscode10.window.showInformationMessage("MCP server disconnected");
    }
  }
  updateStatusBar(server) {
    if (server) {
      const icon = server.isHealthy ? "$(plug)" : "$(warning)";
      this.statusBarItem.text = `${icon} MCP`;
      this.statusBarItem.tooltip = `MCP Server: ${server.url}
Version: ${server.version}
Status: ${server.isHealthy ? "Healthy" : "Degraded"}`;
      this.statusBarItem.backgroundColor = server.isHealthy ? void 0 : new vscode10.ThemeColor("statusBarItem.warningBackground");
      this.statusBarItem.show();
    } else {
      this.statusBarItem.hide();
    }
  }
  log(message) {
    const timestamp = (/* @__PURE__ */ new Date()).toISOString();
    this.outputChannel.appendLine(`[${timestamp}] [MCPDiscovery] ${message}`);
  }
  dispose() {
    this.statusBarItem.dispose();
  }
};
async function createMCPDiscoveryService(outputChannel) {
  const service = new MCPDiscoveryService(outputChannel);
  await service.discover();
  return service;
}

// src/bridges/MemoryCacheBridge.ts
var vscode11 = __toESM(require("vscode"));
var MemoryCacheBridge = class {
  constructor(cache, memoryService, output) {
    this.cache = cache;
    this.memoryService = memoryService;
    this.output = output;
    this.cacheTtlMs = 5 * 60 * 1e3;
  }
  getStatus() {
    return this.cache.getStatus();
  }
  async getMemories(options = {}) {
    const { force = false, limit = 50 } = options;
    const cached = this.cache.getMemories(limit);
    const status = this.cache.getStatus();
    const isFresh = status.lastSyncAt ? Date.now() - status.lastSyncAt < this.cacheTtlMs : false;
    if (!force && cached.length > 0 && isFresh) {
      return cached;
    }
    return this.refreshFromService(limit, cached);
  }
  async searchMemories(query) {
    const start = Date.now();
    try {
      const results = await this.memoryService.searchMemories(query);
      await this.cache.updateFromApi(this.stripSearchScores(results));
      this.logPerformance("search", start, `results=${results.length}`);
      return results;
    } catch (error) {
      const fallback = this.cache.searchLocal(query).map((memory) => ({
        ...memory,
        similarity_score: 0.1
      }));
      this.output.appendLine(`[MemoryCacheBridge] Search failed, using local cache: ${error}`);
      this.logPerformance("search", start, "fallback=cache");
      return fallback;
    }
  }
  async upsert(memory) {
    await this.cache.upsert(memory);
  }
  async remove(id) {
    await this.cache.remove(id);
  }
  async refreshFromService(limit = 50, fallback = []) {
    const start = Date.now();
    this.cache.setRefreshing(true);
    try {
      const memories = await this.memoryService.listMemories(limit);
      await this.cache.updateFromApi(memories);
      this.logPerformance("list", start, `count=${memories.length}`);
      return memories;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (this.isAuthError(errorMessage)) {
        this.output.appendLine("[MemoryCacheBridge] Auth error detected. Refreshing client and retrying...");
        try {
          await this.memoryService.refreshClient();
          const memories = await this.memoryService.listMemories(limit);
          await this.cache.updateFromApi(memories);
          this.logPerformance("list", start, `count=${memories.length},retry=1`);
          return memories;
        } catch (retryError) {
          this.output.appendLine(`[MemoryCacheBridge] Retry after auth refresh failed: ${retryError}`);
        }
      }
      this.output.appendLine(`[MemoryCacheBridge] Refresh failed, using cache: ${error}`);
      this.logPerformance("list", start, "fallback=cache");
      return fallback.length > 0 ? fallback : this.cache.getMemories(limit);
    } finally {
      this.cache.setRefreshing(false);
    }
  }
  isAuthError(message) {
    const normalized = message.toLowerCase();
    return normalized.includes("authentication required") || normalized.includes("unauthorized") || normalized.includes("401") || normalized.includes("auth token") || normalized.includes("bearer");
  }
  stripSearchScores(results) {
    return results.map(({ similarity_score: _similarityScore, ...rest }) => rest);
  }
  shouldLogPerformance() {
    const config = vscode11.workspace.getConfiguration("lanonasis");
    return config.get("showPerformanceFeedback", false) || config.get("verboseLogging", false);
  }
  logPerformance(label, start, detail) {
    if (!this.shouldLogPerformance()) return;
    const duration = Date.now() - start;
    const suffix = detail ? ` (${detail})` : "";
    this.output.appendLine(`[Performance] ${label} ${duration}ms${suffix}`);
  }
};

// src/services/OnboardingService.ts
var STORAGE_KEY = "lanonasis.onboardingState";
var ONBOARDING_VERSION = 1;
var REQUIRED_STEPS = [
  "authenticate",
  "create_memory",
  "search",
  "tour"
];
var OnboardingService = class {
  constructor(globalState) {
    this.globalState = globalState;
    this.cachedState = null;
  }
  async getStatus() {
    const state = await this.loadState();
    const completedCount = REQUIRED_STEPS.filter((step) => state.completedSteps.includes(step)).length;
    const totalCount = REQUIRED_STEPS.length;
    const isComplete = completedCount === totalCount;
    const shouldShow = !state.skipped && !isComplete;
    return {
      state,
      completedCount,
      totalCount,
      isComplete,
      shouldShow
    };
  }
  async markStepComplete(step) {
    const state = await this.loadState();
    if (!REQUIRED_STEPS.includes(step)) {
      return this.getStatus();
    }
    if (!state.completedSteps.includes(step)) {
      const updatedState = {
        ...state,
        completedSteps: [...state.completedSteps, step],
        updatedAt: (/* @__PURE__ */ new Date()).toISOString()
      };
      await this.saveState(updatedState);
    }
    return this.getStatus();
  }
  async skip() {
    const state = await this.loadState();
    const updatedState = {
      ...state,
      skipped: true,
      updatedAt: (/* @__PURE__ */ new Date()).toISOString()
    };
    await this.saveState(updatedState);
    return this.getStatus();
  }
  async reset() {
    const resetState = this.createDefaultState();
    await this.saveState(resetState);
    return this.getStatus();
  }
  async loadState() {
    if (this.cachedState) {
      return this.cachedState;
    }
    const stored = this.globalState.get(STORAGE_KEY);
    const normalized = this.normalizeState(stored);
    if (!stored || stored.version !== ONBOARDING_VERSION) {
      await this.saveState(normalized);
    } else {
      this.cachedState = normalized;
    }
    return normalized;
  }
  async saveState(state) {
    this.cachedState = state;
    await this.globalState.update(STORAGE_KEY, state);
  }
  normalizeState(stored) {
    if (!stored || stored.version !== ONBOARDING_VERSION) {
      return this.createDefaultState();
    }
    const completedSteps = Array.isArray(stored.completedSteps) ? stored.completedSteps.filter((step) => REQUIRED_STEPS.includes(step)) : [];
    return {
      version: ONBOARDING_VERSION,
      startedAt: stored.startedAt || (/* @__PURE__ */ new Date()).toISOString(),
      updatedAt: stored.updatedAt || stored.startedAt || (/* @__PURE__ */ new Date()).toISOString(),
      completedSteps,
      skipped: Boolean(stored.skipped)
    };
  }
  createDefaultState() {
    const now = (/* @__PURE__ */ new Date()).toISOString();
    return {
      version: ONBOARDING_VERSION,
      startedAt: now,
      updatedAt: now,
      completedSteps: [],
      skipped: false
    };
  }
};

// src/services/OfflineService.ts
var vscode12 = __toESM(require("vscode"));
var OfflineService = class {
  constructor(output, options) {
    this.output = output;
    this.options = options;
    this.status = { online: true, lastChecked: null };
    this.emitter = new vscode12.EventEmitter();
    this.onDidChangeStatus = this.emitter.event;
    this.heartbeatIntervalMs = options.heartbeatIntervalMs ?? 3e4;
    this.heartbeatTimeoutMs = options.heartbeatTimeoutMs ?? 4e3;
    this.statusBarItem = vscode12.window.createStatusBarItem(
      vscode12.StatusBarAlignment.Right,
      98
    );
    this.updateStatusBar();
  }
  start() {
    void this.checkNow();
    this.intervalId = setInterval(() => {
      void this.checkNow();
    }, this.heartbeatIntervalMs);
  }
  isOnline() {
    return this.status.online;
  }
  getStatus() {
    return { ...this.status };
  }
  async checkNow() {
    const healthUrl = this.options.getHealthUrl();
    if (!healthUrl) {
      this.updateStatus(true);
      return;
    }
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.heartbeatTimeoutMs);
    try {
      const response = await fetch(healthUrl, {
        method: "GET",
        headers: {
          "Accept": "application/json",
          "X-Client-Type": "vscode-extension"
        },
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      if (response.ok) {
        this.updateStatus(true);
      } else {
        this.updateStatus(false, `Health check ${response.status}`);
      }
    } catch (error) {
      clearTimeout(timeoutId);
      const message = error instanceof Error ? error.message : String(error);
      this.updateStatus(false, message);
    }
  }
  updateStatus(online, error) {
    const changed = this.status.online !== online;
    this.status = {
      online,
      lastChecked: Date.now(),
      lastError: online ? void 0 : error
    };
    if (changed) {
      const detail = error ? ` (${error})` : "";
      this.output.appendLine(`[OfflineService] ${online ? "Online" : "Offline"}${detail}`);
      this.emitter.fire(this.getStatus());
    }
    this.updateStatusBar();
  }
  updateStatusBar() {
    if (this.status.online) {
      this.statusBarItem.hide();
      return;
    }
    this.statusBarItem.text = "$(cloud-off) Offline";
    this.statusBarItem.tooltip = this.status.lastError ? `Lanonasis Memory: Offline (${this.status.lastError})` : "Lanonasis Memory: Offline";
    this.statusBarItem.backgroundColor = new vscode12.ThemeColor("statusBarItem.warningBackground");
    this.statusBarItem.show();
  }
  dispose() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
    }
    this.statusBarItem.dispose();
    this.emitter.dispose();
  }
};

// src/services/OfflineQueueService.ts
var vscode13 = __toESM(require("vscode"));
var import_crypto = require("crypto");

// src/utils/extensionErrors.ts
function getErrorMessage2(error) {
  if (!error) return "Unknown error";
  if (typeof error === "string") return error;
  if (error instanceof Error) return error.message;
  return String(error);
}
function getErrorCode(error) {
  if (!error || typeof error !== "object") return void 0;
  const maybeCode = error.code ?? error.statusCode;
  if (maybeCode === void 0 || maybeCode === null) return void 0;
  return String(maybeCode);
}
function classifyError(error) {
  const message = getErrorMessage2(error);
  const normalized = message.toLowerCase();
  const code = getErrorCode(error);
  if (/conflict|409/.test(normalized)) {
    return {
      category: "conflict",
      severity: "warning",
      message: "Sync conflict detected. Review the conflicting changes in the sync logs, then manually merge your local and remote edits or discard the pending offline operation.",
      details: message,
      actions: ["View Logs"],
      retryable: false,
      code
    };
  }
  if (/validation|invalid|bad request|400/.test(normalized)) {
    return {
      category: "validation",
      severity: "warning",
      message: `Invalid input: ${message}`,
      details: message,
      actions: ["Review Input"],
      retryable: false,
      code
    };
  }
  if (/auth|401|403|unauthorized|forbidden/.test(normalized)) {
    return {
      category: "auth",
      severity: "error",
      message: "Authentication failed. Please re-authenticate or update your API key.",
      details: message,
      actions: ["Re-authenticate", "Clear API Key"],
      retryable: true,
      code
    };
  }
  if (/rate limit|429/.test(normalized)) {
    return {
      category: "rate_limit",
      severity: "warning",
      message: "Rate limit exceeded. Please wait before retrying.",
      details: message,
      actions: ["Wait and Retry"],
      retryable: true,
      code
    };
  }
  if (/timeout|etimedout/.test(normalized)) {
    return {
      category: "network",
      severity: "warning",
      message: "Request timed out. Please check your connection and retry.",
      details: message,
      actions: ["Retry", "Check Connection"],
      retryable: true,
      code
    };
  }
  if (/network|econnrefused|enotfound|fetch/.test(normalized)) {
    return {
      category: "network",
      severity: "warning",
      message: "Unable to reach Lanonasis servers. Check your internet connection, firewall settings, or proxy configuration.",
      details: message,
      actions: ["Retry", "Check Network Settings"],
      retryable: true,
      code
    };
  }
  if (/not found|404/.test(normalized)) {
    return {
      category: "not_found",
      severity: "warning",
      message: "Requested resource was not found.",
      details: message,
      actions: ["Check Settings"],
      retryable: false,
      code
    };
  }
  if (/500|502|503|504|server error/.test(normalized)) {
    return {
      category: "server",
      severity: "error",
      message: "Lanonasis servers are experiencing issues. Please retry later.",
      details: message,
      actions: ["Retry", "View Status"],
      retryable: true,
      code
    };
  }
  return {
    category: "unknown",
    severity: "error",
    message: `Operation failed: ${message}`,
    details: message,
    actions: ["View Logs"],
    retryable: false,
    code
  };
}
function isNetworkError(error) {
  return classifyError(error).category === "network";
}
function isAuthError(error) {
  return classifyError(error).category === "auth";
}

// src/utils/errorLogger.ts
var LOG_STORAGE_KEY = "lanonasis.errorLogs";
var MAX_LOG_ENTRIES = 200;
async function logExtensionError(context, output, error, contextLabel) {
  const classified = classifyError(error);
  const details = classified.details ? redactSensitive(classified.details) : void 0;
  const stack = error instanceof Error && error.stack ? redactSensitive(error.stack) : void 0;
  const entry = {
    timestamp: (/* @__PURE__ */ new Date()).toISOString(),
    severity: classified.severity,
    category: classified.category,
    message: redactSensitive(classified.message),
    details,
    context: contextLabel,
    stack,
    code: classified.code
  };
  output.appendLine(`[${entry.severity.toUpperCase()}] [${entry.category}] ${entry.message}${contextLabel ? ` (${contextLabel})` : ""}`);
  if (details) {
    output.appendLine(`[Details] ${details}`);
  }
  if (stack) {
    output.appendLine(`[Stack] ${stack}`);
  }
  try {
    const existing = context.globalState.get(LOG_STORAGE_KEY, []);
    const next = [...existing, entry].slice(-MAX_LOG_ENTRIES);
    await context.globalState.update(LOG_STORAGE_KEY, next);
  } catch {
  }
  return classified;
}
function getErrorLogs(context) {
  return context.globalState.get(LOG_STORAGE_KEY, []);
}
function formatErrorLogs(logs, limit = 25) {
  const entries = logs.slice(-limit);
  if (entries.length === 0) return "No recent error logs.";
  return entries.map((entry) => {
    const parts = [
      `[${entry.timestamp}] ${entry.severity.toUpperCase()} ${entry.category}: ${entry.message}`,
      entry.context ? `Context: ${entry.context}` : void 0,
      entry.details ? `Details: ${entry.details}` : void 0
    ].filter(Boolean);
    return parts.join("\n");
  }).join("\n\n");
}
function redactSensitive(value) {
  let redacted = value;
  redacted = redacted.replace(/Bearer\s+[A-Za-z0-9._+/=-]+/gi, "Bearer [REDACTED]");
  redacted = redacted.replace(/(api[_-]?key|token)=([A-Za-z0-9._-]+)/gi, "$1=[REDACTED]");
  redacted = redacted.replace(/(X-API-Key:\s*)([A-Za-z0-9._-]+)/gi, "$1[REDACTED]");
  return redacted;
}

// src/services/OfflineQueueService.ts
var QUEUE_STORAGE_KEY = "lanonasis.offline.queue";
var OfflineQueueService = class {
  constructor(context, output, memoryService, memoryCache) {
    this.context = context;
    this.output = output;
    this.memoryService = memoryService;
    this.memoryCache = memoryCache;
    this.queue = [];
    this.syncing = false;
    this.emitter = new vscode13.EventEmitter();
    this.onDidChangeStatus = this.emitter.event;
    this.loadQueue();
  }
  getStatus() {
    return {
      pending: this.queue.length,
      syncing: this.syncing,
      lastError: this.lastError,
      lastSyncAt: this.lastSyncAt
    };
  }
  enqueueCreate(payload) {
    const tempId = this.generateTempId();
    this.queue.push({
      id: this.generateOperationId(),
      type: "create",
      tempId,
      payload,
      createdAt: Date.now(),
      attempts: 0
    });
    this.saveQueue();
    return tempId;
  }
  enqueueUpdate(id, updates) {
    this.queue.push({
      id: this.generateOperationId(),
      type: "update",
      payload: { id, updates },
      createdAt: Date.now(),
      attempts: 0
    });
    this.saveQueue();
  }
  enqueueDelete(id) {
    this.queue.push({
      id: this.generateOperationId(),
      type: "delete",
      payload: { id },
      createdAt: Date.now(),
      attempts: 0
    });
    this.saveQueue();
  }
  async sync() {
    if (this.syncing || this.queue.length === 0) {
      return;
    }
    this.syncing = true;
    this.emitStatus();
    this.clearRetry();
    try {
      while (this.queue.length > 0) {
        const current = this.queue[0];
        if (!current) break;
        if (current.type === "create") {
          const created = await this.memoryService.createMemory(current.payload);
          await this.handleCreateResult(current, created);
          this.queue.shift();
        } else if (current.type === "update") {
          const targetId = current.payload.id;
          const updated = await this.memoryService.updateMemory(targetId, current.payload.updates);
          await this.memoryCache.upsert(updated);
          this.queue.shift();
        } else {
          const targetId = current.payload.id;
          await this.memoryService.deleteMemory(targetId);
          await this.memoryCache.remove(targetId);
          this.queue.shift();
        }
        this.lastError = void 0;
        this.lastSyncAt = Date.now();
        await this.saveQueue();
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const current = this.queue[0];
      if (current) {
        current.attempts += 1;
        current.lastError = message;
      }
      this.lastError = message;
      await this.saveQueue();
      const classified = await logExtensionError(this.context, this.output, error, "offline-queue-sync");
      if (classified.category === "conflict") {
        this.output.appendLine(`[OfflineQueue] ${classified.message} Details: ${message}`);
        vscode13.window.showWarningMessage(classified.message);
      } else {
        this.scheduleRetry(current?.attempts ?? 1);
      }
    } finally {
      this.syncing = false;
      this.emitStatus();
    }
  }
  async clear() {
    this.queue = [];
    this.lastError = void 0;
    this.lastSyncAt = void 0;
    await this.saveQueue();
  }
  async handleCreateResult(operation, created) {
    await this.memoryCache.replace(operation.tempId, created);
    for (const op of this.queue) {
      if (op.type === "update" && op.payload.id === operation.tempId) {
        op.payload.id = created.id;
      }
      if (op.type === "delete" && op.payload.id === operation.tempId) {
        op.payload.id = created.id;
      }
    }
  }
  scheduleRetry(attempts) {
    const delay = Math.min(3e4, 1e3 * Math.pow(2, Math.max(attempts - 1, 0)));
    this.retryTimer = setTimeout(() => {
      void this.sync();
    }, delay);
    this.output.appendLine(`[OfflineQueue] Sync failed. Retrying in ${delay}ms`);
  }
  clearRetry() {
    if (this.retryTimer) {
      clearTimeout(this.retryTimer);
      this.retryTimer = void 0;
    }
  }
  loadQueue() {
    try {
      const stored = this.context.globalState.get(QUEUE_STORAGE_KEY, []);
      this.queue = Array.isArray(stored) ? stored : [];
    } catch (error) {
      this.output.appendLine(`[OfflineQueue] Failed to load queue: ${error instanceof Error ? error.message : String(error)}`);
      this.queue = [];
    } finally {
      this.emitStatus();
    }
  }
  async saveQueue() {
    try {
      await this.context.globalState.update(QUEUE_STORAGE_KEY, this.queue);
    } catch (error) {
      this.output.appendLine(`[OfflineQueue] Failed to save queue: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      this.emitStatus();
    }
  }
  emitStatus() {
    this.emitter.fire(this.getStatus());
  }
  generateTempId() {
    return this.generateId("offline");
  }
  generateOperationId() {
    return this.generateId("op");
  }
  generateId(prefix) {
    const unique = typeof import_crypto.randomUUID === "function" ? (0, import_crypto.randomUUID)() : (0, import_crypto.randomBytes)(16).toString("hex");
    return `${prefix}-${unique}`;
  }
  dispose() {
    this.clearRetry();
    this.emitter.dispose();
  }
};

// src/services/OfflineMemoryService.ts
var OfflineMemoryService = class {
  constructor(base, offline, queue, cache) {
    this.base = base;
    this.offline = offline;
    this.queue = queue;
    this.cache = cache;
  }
  isAuthenticated() {
    return this.base.isAuthenticated();
  }
  async testConnection(apiKey) {
    return this.base.testConnection(apiKey);
  }
  async createMemory(memory) {
    if (!this.offline.isOnline()) {
      const tempId = this.queue.enqueueCreate(memory);
      return this.buildOfflineEntry(memory, tempId);
    }
    try {
      return await this.withAuthRetry(() => this.base.createMemory(memory));
    } catch (error) {
      if (isNetworkError(error)) {
        const tempId = this.queue.enqueueCreate(memory);
        return this.buildOfflineEntry(memory, tempId);
      }
      throw error;
    }
  }
  async updateMemory(id, memory) {
    if (!this.offline.isOnline()) {
      this.queue.enqueueUpdate(id, memory);
      return this.buildOfflineUpdate(id, memory);
    }
    try {
      return await this.withAuthRetry(() => this.base.updateMemory(id, memory));
    } catch (error) {
      if (isNetworkError(error)) {
        this.queue.enqueueUpdate(id, memory);
        return this.buildOfflineUpdate(id, memory);
      }
      throw error;
    }
  }
  async searchMemories(query, options = {}) {
    return this.base.searchMemories(query, options);
  }
  async getMemory(id) {
    return this.base.getMemory(id);
  }
  async listMemories(limit = 50) {
    return this.base.listMemories(limit);
  }
  async deleteMemory(id) {
    if (!this.offline.isOnline()) {
      this.queue.enqueueDelete(id);
      return;
    }
    try {
      await this.withAuthRetry(() => this.base.deleteMemory(id));
    } catch (error) {
      if (isNetworkError(error)) {
        this.queue.enqueueDelete(id);
        return;
      }
      throw error;
    }
  }
  async getMemoryStats() {
    return this.base.getMemoryStats();
  }
  async refreshClient() {
    return this.base.refreshClient();
  }
  getCapabilities() {
    return isEnhancedMemoryService(this.base) ? this.base.getCapabilities() : null;
  }
  async showConnectionInfo() {
    if (isEnhancedMemoryService(this.base)) {
      await this.base.showConnectionInfo();
    }
  }
  dispose() {
    if (isEnhancedMemoryService(this.base)) {
      this.base.dispose();
    }
    this.offline.dispose();
    this.queue.dispose();
  }
  buildOfflineEntry(request, tempId) {
    const timestamp = (/* @__PURE__ */ new Date()).toISOString();
    const memoryType = request.memory_type || "context";
    return {
      id: tempId,
      title: request.title,
      content: request.content,
      summary: request.summary,
      memory_type: memoryType,
      status: "draft",
      access_count: 0,
      user_id: "offline",
      tags: request.tags ?? [],
      metadata: { ...request.metadata, offline_pending: true },
      created_at: timestamp,
      updated_at: timestamp
    };
  }
  buildOfflineUpdate(id, updates) {
    const existing = this.cache.getMemory(id);
    const timestamp = (/* @__PURE__ */ new Date()).toISOString();
    const memoryType = updates.memory_type || existing?.memory_type || "context";
    return {
      id,
      title: updates.title ?? existing?.title ?? "Untitled Memory",
      content: updates.content ?? existing?.content ?? "",
      summary: updates.summary ?? existing?.summary,
      memory_type: memoryType,
      status: existing?.status ?? "draft",
      access_count: existing?.access_count ?? 0,
      user_id: existing?.user_id ?? "offline",
      tags: updates.tags ?? existing?.tags ?? [],
      metadata: {
        ...existing?.metadata ?? {},
        ...updates.metadata ?? {},
        offline_pending: true
      },
      created_at: existing?.created_at ?? timestamp,
      updated_at: timestamp
    };
  }
  async withAuthRetry(operation) {
    try {
      return await operation();
    } catch (error) {
      if (isAuthError(error)) {
        await this.base.refreshClient();
        return operation();
      }
      throw error;
    }
  }
};

// src/extension.ts
var MAX_GITHUB_ISSUE_BODY_LENGTH = 6e3;
var ALLOWED_PROTOCOLS = /* @__PURE__ */ new Set(["http:", "https:", "wss:", "ws:"]);
async function activate(context) {
  console.log("Lanonasis Memory Extension is now active");
  const activationStart = Date.now();
  const outputChannel = vscode15.window.createOutputChannel("Lanonasis");
  const onboardingService = new OnboardingService(context.globalState);
  let mcpDiscoveryService = null;
  const config = vscode15.workspace.getConfiguration("lanonasis");
  const enableMCP = config.get("enableMCP", true);
  const mcpAutoDiscover = config.get("mcpAutoDiscover", true);
  if (enableMCP && mcpAutoDiscover) {
    try {
      mcpDiscoveryService = await createMCPDiscoveryService(outputChannel);
      const mcpServer = mcpDiscoveryService.getDiscoveredServer();
      if (mcpServer) {
        outputChannel.appendLine(`[MCP] Server discovered: ${mcpServer.url} (v${mcpServer.version})`);
      }
    } catch (error) {
      outputChannel.appendLine(`[MCP] Auto-discovery failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  const adapter = (0, import_ide_extension_core.createVSCodeAdapter)(
    { context, outputChannel, vscode: vscode15 },
    {
      ideName: "VSCode",
      extensionName: "lanonasis-memory",
      extensionDisplayName: "LanOnasis Memory Assistant",
      commandPrefix: "lanonasis",
      userAgent: `VSCode/${vscode15.version} LanOnasis-Memory/2.0.9`
    }
  );
  const secureApiKeyService = new import_ide_extension_core.SecureApiKeyService(adapter);
  await secureApiKeyService.initialize();
  const resolveHealthUrl = () => {
    const config2 = vscode15.workspace.getConfiguration("lanonasis");
    const apiUrl = config2.get("apiUrl", "https://api.lanonasis.com");
    const gatewayUrl = config2.get("gatewayUrl", "https://api.lanonasis.com");
    const useGateway = config2.get("useGateway", false);
    let baseUrl = (useGateway ? gatewayUrl : apiUrl).trim();
    baseUrl = baseUrl.replace(/\/+$/, "").replace(/\/api\/v1$/i, "").replace(/\/api$/i, "");
    return baseUrl ? `${baseUrl}/health` : "";
  };
  let baseMemoryService;
  try {
    baseMemoryService = new EnhancedMemoryService(secureApiKeyService);
    console.log("Using Enhanced Memory Service with CLI integration");
  } catch (error) {
    console.warn("Enhanced Memory Service not available, using basic service:", error);
    baseMemoryService = new MemoryService(secureApiKeyService);
  }
  const apiKeyService = new ApiKeyService(secureApiKeyService);
  const memoryCache = new MemoryCache(context, outputChannel);
  const offlineService = new OfflineService(outputChannel, { getHealthUrl: resolveHealthUrl });
  const offlineQueue = new OfflineQueueService(context, outputChannel, baseMemoryService, memoryCache);
  const memoryService = new OfflineMemoryService(baseMemoryService, offlineService, offlineQueue, memoryCache);
  const memoryCacheBridge = new MemoryCacheBridge(memoryCache, memoryService, outputChannel);
  offlineService.start();
  if (offlineService.isOnline()) {
    void offlineQueue.sync();
  }
  const configuration = vscode15.workspace.getConfiguration("lanonasis");
  const useEnhancedUI = configuration.get("useEnhancedUI", false);
  let sidebarProvider;
  if (useEnhancedUI) {
    sidebarProvider = new EnhancedSidebarProvider(
      context.extensionUri,
      memoryService,
      apiKeyService,
      memoryCacheBridge,
      onboardingService,
      offlineService,
      offlineQueue
    );
    context.subscriptions.push(
      vscode15.window.registerWebviewViewProvider(
        EnhancedSidebarProvider.viewType,
        sidebarProvider
      )
    );
    console.log("[Lanonasis] Using Enhanced UI with React components");
  } else {
    sidebarProvider = new MemorySidebarProvider(context.extensionUri, memoryService);
    context.subscriptions.push(
      vscode15.window.registerWebviewViewProvider(
        MemorySidebarProvider.viewType,
        sidebarProvider
      )
    );
    console.log("[Lanonasis] Using original UI");
  }
  const memoryTreeProvider = new MemoryTreeProvider(memoryService);
  const apiKeyTreeProvider = new ApiKeyTreeProvider(apiKeyService);
  const handleOfflineStatus = (status) => {
    if (status.online) {
      void offlineQueue.sync();
    }
  };
  context.subscriptions.push(offlineService.onDidChangeStatus(handleOfflineStatus));
  if (sidebarProvider instanceof EnhancedSidebarProvider) {
    const sendStatusUpdate = () => {
      void sidebarProvider.sendConnectionStatus();
    };
    context.subscriptions.push(
      offlineService.onDidChangeStatus(sendStatusUpdate),
      offlineQueue.onDidChangeStatus(sendStatusUpdate)
    );
  }
  const notifyOnboardingStep = async (step) => {
    try {
      await onboardingService.markStepComplete(step);
      if (sidebarProvider instanceof EnhancedSidebarProvider) {
        await sidebarProvider.sendOnboardingState();
      }
    } catch (error) {
      outputChannel.appendLine(`[Onboarding] Failed to update step ${step}: ${error instanceof Error ? error.message : String(error)}`);
    }
  };
  context.subscriptions.push(
    vscode15.window.registerTreeDataProvider("lanonasisMemories", memoryTreeProvider),
    vscode15.window.registerTreeDataProvider("lanonasisApiKeys", apiKeyTreeProvider)
  );
  try {
    const { registerMemoryChatParticipant: registerMemoryChatParticipant2 } = await Promise.resolve().then(() => (init_MemoryChatParticipant(), MemoryChatParticipant_exports));
    registerMemoryChatParticipant2(context, memoryService);
    console.log("[Lanonasis] Chat Participant @lanonasis registered for Copilot Chat");
  } catch (error) {
    console.log("[Lanonasis] Chat Participant not available (requires GitHub Copilot)", error);
  }
  const completionProvider = new MemoryCompletionProvider(memoryService);
  context.subscriptions.push(
    vscode15.languages.registerCompletionItemProvider(
      { scheme: "file" },
      completionProvider,
      "@",
      "#",
      "//"
    )
  );
  await vscode15.commands.executeCommand("setContext", "lanonasis.enabled", true);
  await vscode15.commands.executeCommand(
    "setContext",
    "lanonasis.enableApiKeyManagement",
    configuration.get("enableApiKeyManagement", true)
  );
  await vscode15.commands.executeCommand("setContext", "lanonasis.authenticated", false);
  memoryTreeProvider.setAuthenticated(false);
  apiKeyTreeProvider.setAuthenticated(false);
  const refreshServices = async () => {
    try {
      await memoryService.refreshClient();
    } catch (error) {
      outputChannel.appendLine(`[Auth] Failed to refresh memory service: ${error instanceof Error ? error.message : String(error)}`);
    }
    try {
      apiKeyService.refreshConfig();
    } catch (error) {
      outputChannel.appendLine(`[Auth] Failed to refresh API key service: ${error instanceof Error ? error.message : String(error)}`);
    }
  };
  const applyAuthenticationState = async (authenticated) => {
    await vscode15.commands.executeCommand("setContext", "lanonasis.authenticated", authenticated);
    memoryTreeProvider.setAuthenticated(authenticated);
    apiKeyTreeProvider.setAuthenticated(authenticated);
    await sidebarProvider.refresh();
  };
  const announceEnhancedCapabilities = () => {
    if (!isEnhancedMemoryService(memoryService)) {
      return;
    }
    const capabilities = memoryService.getCapabilities();
    if (capabilities?.cliAvailable && capabilities.goldenContract) {
      vscode15.window.showInformationMessage(
        "\u{1F680} Lanonasis Memory: CLI v1.5.2+ detected! Enhanced performance active.",
        "Show Details"
      ).then((selection) => {
        if (selection === "Show Details") {
          vscode15.commands.executeCommand("lanonasis.showConnectionInfo");
        }
      });
    }
  };
  const handleAuthenticationSuccess = async () => {
    await refreshServices();
    await applyAuthenticationState(true);
    await notifyOnboardingStep("authenticate");
    announceEnhancedCapabilities();
  };
  const handleAuthenticationCleared = async () => {
    try {
      await memoryService.refreshClient();
    } catch (error) {
      outputChannel.appendLine(`[ClearAuth] Failed to refresh memory service: ${error instanceof Error ? error.message : String(error)}`);
    }
    await memoryCache.clear();
    await applyAuthenticationState(false);
  };
  const authenticateCommand = vscode15.commands.registerCommand("lanonasis.authenticate", async (mode) => {
    try {
      let apiKey = null;
      if (mode === "oauth") {
        apiKey = await secureApiKeyService.authenticateWithOAuth();
      } else if (mode === "apikey") {
        apiKey = await secureApiKeyService.promptForApiKeyEntry();
      } else {
        apiKey = await secureApiKeyService.promptForAuthentication();
      }
      if (apiKey) {
        await handleAuthenticationSuccess();
        vscode15.window.showInformationMessage("\u2705 Successfully authenticated with Lanonasis Memory");
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      vscode15.window.showErrorMessage(`Authentication failed: ${message}`);
      outputChannel.appendLine(`[Auth] Error: ${message}`);
    }
  });
  const promptForAuthenticationIfMissing = async () => {
    const selection = await vscode15.window.showInformationMessage(
      "Lanonasis Memory: No authentication configured. Choose how you would like to connect.",
      "Connect in Browser",
      "Enter API Key",
      "Maybe Later"
    );
    if (selection === "Connect in Browser") {
      vscode15.commands.executeCommand("lanonasis.authenticate", "oauth");
    } else if (selection === "Enter API Key") {
      vscode15.commands.executeCommand("lanonasis.authenticate", "apikey");
    }
  };
  const commands4 = [
    authenticateCommand,
    vscode15.commands.registerCommand("lanonasis.searchMemory", async () => {
      await searchMemories(memoryService, notifyOnboardingStep);
    }),
    vscode15.commands.registerCommand("lanonasis.createMemory", async () => {
      await createMemoryFromSelection(memoryService, notifyOnboardingStep);
    }),
    vscode15.commands.registerCommand("lanonasis.createMemoryFromFile", async () => {
      await createMemoryFromFile(memoryService, notifyOnboardingStep);
    }),
    vscode15.commands.registerCommand("lanonasis.createSampleMemory", async () => {
      await createSampleMemory(memoryService, notifyOnboardingStep);
    }),
    // Universal capture commands
    vscode15.commands.registerCommand("lanonasis.captureContext", async () => {
      await captureContextToMemory(memoryService, notifyOnboardingStep);
    }),
    vscode15.commands.registerCommand("lanonasis.captureClipboard", async () => {
      await captureClipboardToMemory(memoryService, notifyOnboardingStep);
    }),
    // Note: lanonasis.authenticate is registered earlier (line 125) to prevent timing issues
    vscode15.commands.registerCommand("lanonasis.refreshMemories", async () => {
      memoryTreeProvider.refresh();
      await sidebarProvider.refresh();
    }),
    vscode15.commands.registerCommand("lanonasis.syncOfflineQueue", async () => {
      const status = offlineQueue.getStatus();
      if (status.pending === 0) {
        vscode15.window.showInformationMessage("No pending offline operations to sync.");
        return;
      }
      await offlineQueue.sync();
      await sidebarProvider.refresh();
    }),
    vscode15.commands.registerCommand("lanonasis.openMemory", (memory) => {
      openMemoryInEditor(memory);
    }),
    vscode15.commands.registerCommand("lanonasis.switchMode", async () => {
      await switchConnectionMode(memoryService, apiKeyService);
      memoryTreeProvider.refresh();
      await sidebarProvider.refresh();
    }),
    vscode15.commands.registerCommand("lanonasis.manageApiKeys", async () => {
      await manageApiKeys(apiKeyService);
    }),
    vscode15.commands.registerCommand("lanonasis.createProject", async () => {
      await createProject(apiKeyService, apiKeyTreeProvider);
    }),
    vscode15.commands.registerCommand("lanonasis.viewProjects", async () => {
      await viewProjects(apiKeyService);
    }),
    vscode15.commands.registerCommand("lanonasis.refreshApiKeys", async () => {
      apiKeyTreeProvider.refresh(true);
    }),
    // Context menu commands for API Keys tree
    vscode15.commands.registerCommand("lanonasis.viewProjectDetails", async (item) => {
      if (item && item.project) {
        await showProjectDetails(item.project, apiKeyService);
      }
    }),
    vscode15.commands.registerCommand("lanonasis.viewApiKeyDetails", async (item) => {
      if (item && item.apiKey) {
        await showApiKeyDetails(item.apiKey);
      }
    }),
    vscode15.commands.registerCommand("lanonasis.createApiKey", async (item) => {
      if (item && item.project) {
        await createApiKeyForProject(item.project, apiKeyService, apiKeyTreeProvider);
      } else {
        await createApiKey(apiKeyService, apiKeyTreeProvider);
      }
    }),
    vscode15.commands.registerCommand("lanonasis.rotateApiKey", async (item) => {
      if (item && item.apiKey) {
        await rotateApiKey(item.apiKey, apiKeyService, apiKeyTreeProvider);
      }
    }),
    vscode15.commands.registerCommand("lanonasis.deleteApiKey", async (item) => {
      if (item && item.apiKey) {
        await deleteApiKey(item.apiKey, apiKeyService, apiKeyTreeProvider);
      }
    }),
    vscode15.commands.registerCommand("lanonasis.deleteProject", async (item) => {
      if (item && item.project) {
        await deleteProject(item.project, apiKeyService, apiKeyTreeProvider);
      }
    }),
    vscode15.commands.registerCommand("lanonasis.showConnectionInfo", async () => {
      if (isEnhancedMemoryService(memoryService)) {
        await memoryService.showConnectionInfo();
      } else {
        vscode15.window.showInformationMessage("Connection info available in Enhanced Memory Service. Upgrade to CLI integration for more details.");
      }
    }),
    vscode15.commands.registerCommand("lanonasis.showMCPStatus", async () => {
      if (mcpDiscoveryService) {
        await mcpDiscoveryService.showServerDetails();
      } else {
        const action = await vscode15.window.showInformationMessage(
          "MCP auto-discovery is disabled or no server found.",
          "Run Discovery",
          "Configure"
        );
        if (action === "Run Discovery") {
          const newService = await createMCPDiscoveryService(outputChannel);
          if (newService.isAvailable()) {
            mcpDiscoveryService = newService;
            await newService.showServerDetails();
          } else {
            vscode15.window.showWarningMessage("No MCP server found. Start the CLI MCP server or configure a custom URL.");
          }
        } else if (action === "Configure") {
          vscode15.commands.executeCommand("workbench.action.openSettings", "lanonasis.mcp");
        }
      }
    }),
    vscode15.commands.registerCommand("lanonasis.configureApiKey", async (mode) => {
      await vscode15.commands.executeCommand("lanonasis.authenticate", mode);
    }),
    vscode15.commands.registerCommand("lanonasis.clearApiKey", async () => {
      try {
        const hasApiKey = await secureApiKeyService.hasApiKey();
        if (!hasApiKey) {
          vscode15.window.showInformationMessage("No API key is currently configured.");
          return;
        }
        const confirmed = await vscode15.window.showWarningMessage(
          "Are you sure you want to clear your API key? This will require re-authentication.",
          { modal: true },
          "Clear API Key"
        );
        if (confirmed === "Clear API Key") {
          await secureApiKeyService.deleteApiKey();
          vscode15.window.showInformationMessage("API key cleared successfully.");
          outputChannel.appendLine("[ClearApiKey] API key removed from secure storage");
          await handleAuthenticationCleared();
          await promptForAuthenticationIfMissing();
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        vscode15.window.showErrorMessage(`Failed to clear API key: ${message}`);
        outputChannel.appendLine(`[ClearApiKey] Error: ${message}`);
      }
    }),
    vscode15.commands.registerCommand("lanonasis.checkApiKeyStatus", async () => {
      try {
        const hasApiKey = await secureApiKeyService.hasApiKey();
        const status = hasApiKey ? "\u2705 Configured and stored securely" : "\u274C Not configured";
        if (hasApiKey) {
          vscode15.window.showInformationMessage(
            `API Key Status: ${status}`,
            "Test Connection",
            "View Security Info"
          ).then(async (selection) => {
            if (selection === "Test Connection") {
              vscode15.commands.executeCommand("lanonasis.testConnection");
            } else if (selection === "View Security Info") {
              vscode15.env.openExternal(vscode15.Uri.parse("https://docs.lanonasis.com/security/api-keys"));
            }
          });
        } else {
          vscode15.window.showInformationMessage(
            `API Key Status: ${status}`,
            "Connect in Browser",
            "Enter API Key"
          ).then((selection) => {
            if (selection === "Connect in Browser") {
              vscode15.commands.executeCommand("lanonasis.authenticate", "oauth");
            } else if (selection === "Enter API Key") {
              vscode15.commands.executeCommand("lanonasis.authenticate", "apikey");
            }
          });
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        vscode15.window.showErrorMessage(`Failed to check API key status: ${message}`);
        outputChannel.appendLine(`[CheckApiKeyStatus] Error: ${message}`);
      }
    }),
    vscode15.commands.registerCommand("lanonasis.testConnection", async () => {
      try {
        const hasApiKey = await secureApiKeyService.hasApiKey();
        if (!hasApiKey) {
          vscode15.window.showWarningMessage("\u274C No API key configured.");
          return;
        }
        await memoryService.testConnection();
        vscode15.window.showInformationMessage("\u2705 Connection test successful!");
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        vscode15.window.showErrorMessage(`Connection test failed: ${message}`);
        outputChannel.appendLine(`[TestConnection] Error: ${message}`);
      }
    }),
    vscode15.commands.registerCommand("lanonasis.runDiagnostics", async () => {
      try {
        outputChannel.show();
        outputChannel.appendLine("Running comprehensive diagnostics...\n");
        const health = await runDiagnostics(
          context,
          secureApiKeyService,
          memoryService,
          outputChannel
        );
        const report = formatDiagnosticResults(health);
        const doc = await vscode15.workspace.openTextDocument({
          content: report,
          language: "markdown"
        });
        await vscode15.window.showTextDocument(doc);
        const statusEmoji = {
          healthy: "\u2705",
          degraded: "\u26A0\uFE0F",
          critical: "\u274C"
        };
        const message = `${statusEmoji[health.overall]} System Health: ${health.overall.toUpperCase()}`;
        if (health.overall === "healthy") {
          vscode15.window.showInformationMessage(message, "View Report").then((action) => {
            if (action === "View Report") {
              outputChannel.show();
            }
          });
        } else if (health.overall === "degraded") {
          vscode15.window.showWarningMessage(message, "View Report", "Fix Issues").then((action) => {
            if (action === "View Report") {
              outputChannel.show();
            }
          });
        } else {
          vscode15.window.showErrorMessage(message, "View Report", "Get Help").then((action) => {
            if (action === "View Report") {
              outputChannel.show();
            } else if (action === "Get Help") {
              vscode15.env.openExternal(vscode15.Uri.parse("https://docs.lanonasis.com/troubleshooting"));
            }
          });
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        vscode15.window.showErrorMessage(`Diagnostics failed: ${message}`);
        outputChannel.appendLine(`[Diagnostics] Fatal error: ${message}`);
      }
    }),
    vscode15.commands.registerCommand("lanonasis.autoFixIssues", async () => {
      await runAutoFix(
        context,
        outputChannel,
        secureApiKeyService,
        memoryService,
        memoryCache,
        offlineQueue
      );
    }),
    vscode15.commands.registerCommand("lanonasis.reportIssue", async () => {
      await reportIssue(
        context,
        secureApiKeyService,
        memoryService,
        outputChannel
      );
    }),
    vscode15.commands.registerCommand("lanonasis.showLogs", () => {
      outputChannel.show();
    }),
    vscode15.commands.registerCommand("lanonasis.logout", async () => {
      try {
        await secureApiKeyService.deleteApiKey();
      } catch (error) {
        outputChannel.appendLine(`[Logout] Failed to clear stored credentials: ${error instanceof Error ? error.message : String(error)}`);
      } finally {
        await handleAuthenticationCleared();
        vscode15.window.showInformationMessage("Signed out of Lanonasis Memory.");
      }
    }),
    vscode15.commands.registerCommand("lanonasis.quickCapture", async () => {
      const editor = vscode15.window.activeTextEditor;
      if (editor && !editor.selection.isEmpty) {
        await captureContextToMemory(memoryService, notifyOnboardingStep);
      } else {
        await captureClipboardToMemory(memoryService, notifyOnboardingStep);
      }
    })
  ];
  context.subscriptions.push(...commands4);
  context.subscriptions.push(memoryService);
  if (mcpDiscoveryService) {
    context.subscriptions.push(mcpDiscoveryService);
  }
  const hasStoredKey = await secureApiKeyService.hasApiKey();
  if (hasStoredKey) {
    await handleAuthenticationSuccess();
  } else {
    await applyAuthenticationState(false);
  }
  const onboardingStatus = await onboardingService.getStatus();
  const isFirstTime = onboardingStatus.state.completedSteps.length === 0 && !onboardingStatus.state.skipped;
  const legacyFirstTime = context.globalState.get("lanonasis.firstTime", true);
  if (!useEnhancedUI && legacyFirstTime) {
    showWelcomeMessage();
    await context.globalState.update("lanonasis.firstTime", false);
  }
  if (!useEnhancedUI && !hasStoredKey && !isFirstTime && !legacyFirstTime) {
    await promptForAuthenticationIfMissing();
  }
  const perfConfig = vscode15.workspace.getConfiguration("lanonasis");
  if (perfConfig.get("showPerformanceFeedback", false) || perfConfig.get("verboseLogging", false)) {
    outputChannel.appendLine(`[Performance] Activation ${Date.now() - activationStart}ms`);
  }
}
async function runAutoFix(context, outputChannel, secureApiKeyService, memoryService, memoryCache, offlineQueue) {
  const options = [
    {
      id: "refresh-auth",
      label: "Refresh authentication tokens",
      detail: "Revalidate credentials and refresh access tokens."
    },
    {
      id: "clear-cache",
      label: "Clear local cache",
      detail: "Clear cached memories and queued offline operations."
    },
    {
      id: "reset-settings",
      label: "Reset invalid settings",
      detail: "Revert invalid URLs to defaults."
    },
    {
      id: "suggest-cli",
      label: "Suggest CLI installation",
      detail: "Open CLI setup guidance."
    }
  ];
  const selection = await vscode15.window.showQuickPick(options, {
    title: "Lanonasis Auto-Fix",
    canPickMany: true,
    placeHolder: "Choose fixes to apply"
  });
  if (!selection || selection.length === 0) {
    return;
  }
  const results = [];
  await vscode15.window.withProgress(
    {
      location: vscode15.ProgressLocation.Notification,
      title: "Running auto-fix...",
      cancellable: false
    },
    async () => {
      for (const item of selection) {
        try {
          if (item.id === "refresh-auth") {
            await secureApiKeyService.getStoredCredentials();
            await memoryService.refreshClient();
            results.push("Refreshed authentication.");
          } else if (item.id === "clear-cache") {
            await memoryCache.clear();
            await offlineQueue.clear();
            results.push("Cleared local cache.");
          } else if (item.id === "reset-settings") {
            const resetCount = await resetInvalidSettings();
            results.push(resetCount > 0 ? `Reset ${resetCount} invalid setting(s).` : "Settings already valid.");
          } else if (item.id === "suggest-cli") {
            const action = await vscode15.window.showInformationMessage(
              "Install the Lanonasis CLI to enable richer IDE integration.",
              "Open Docs"
            );
            if (action === "Open Docs") {
              await vscode15.env.openExternal(vscode15.Uri.parse("https://docs.lanonasis.com"));
            }
            results.push("CLI guidance shown.");
          }
        } catch (error) {
          const summary = error instanceof Error ? error.message : String(error);
          results.push(`${item.label} failed: ${summary}`);
          await logExtensionError(context, outputChannel, error, `auto-fix:${item.id}`);
        }
      }
    }
  );
  if (results.length > 0) {
    vscode15.window.showInformationMessage(results.join(" "));
  }
}
async function resetInvalidSettings() {
  const config = vscode15.workspace.getConfiguration("lanonasis");
  const defaults = [
    { key: "apiUrl", fallback: "https://api.lanonasis.com" },
    { key: "gatewayUrl", fallback: "https://api.lanonasis.com" },
    { key: "authUrl", fallback: "https://auth.lanonasis.com" },
    { key: "websocketUrl", fallback: "wss://mcp.lanonasis.com/ws" }
  ];
  let resetCount = 0;
  for (const { key, fallback } of defaults) {
    const value = config.get(key, fallback);
    if (!isValidUrl(value)) {
      await config.update(key, fallback, vscode15.ConfigurationTarget.Global);
      resetCount += 1;
    }
  }
  return resetCount;
}
function isValidUrl(value) {
  const trimmed = value.trim();
  if (!trimmed) return false;
  try {
    const hasScheme = /^[a-z][a-z0-9+.-]*:\/\//i.test(trimmed);
    const candidate = hasScheme ? trimmed : `http://${trimmed}`;
    const parsed = new URL(candidate);
    return ALLOWED_PROTOCOLS.has(parsed.protocol) && Boolean(parsed.hostname);
  } catch {
    return false;
  }
}
async function reportIssue(context, secureApiKeyService, memoryService, outputChannel) {
  try {
    const includeDiagnostics = await vscode15.window.showQuickPick(
      ["Include diagnostics (recommended)", "Skip diagnostics"],
      { title: "Report Issue" }
    );
    let diagnosticReport = "Diagnostics skipped by user.";
    if (includeDiagnostics === "Include diagnostics (recommended)") {
      const health = await runDiagnostics(
        context,
        secureApiKeyService,
        memoryService,
        outputChannel
      );
      diagnosticReport = formatDiagnosticResults(health);
    }
    const logs = formatErrorLogs(getErrorLogs(context), 20);
    const extensionVersion = context.extension.packageJSON.version;
    const environmentInfo = `Version: ${extensionVersion ?? "unknown"}
OS: ${process.platform}
VSCode: ${vscode15.version}`;
    const body = [
      "## Summary",
      "Describe the issue here.",
      "",
      "## Environment",
      "```",
      environmentInfo,
      "```",
      "",
      "## Diagnostics",
      "```",
      diagnosticReport,
      "```",
      "",
      "## Recent Errors",
      "```",
      logs,
      "```"
    ].join("\n");
    const doc = await vscode15.workspace.openTextDocument({
      content: body,
      language: "markdown"
    });
    await vscode15.window.showTextDocument(doc, { preview: true });
    const action = await vscode15.window.showInformationMessage(
      "Review the issue report. Open GitHub issue?",
      "Open Issue",
      "Cancel"
    );
    if (action !== "Open Issue") {
      return;
    }
    const truncatedBody = doc.getText().slice(0, MAX_GITHUB_ISSUE_BODY_LENGTH);
    const issueUrl = `https://github.com/lanonasis/lanonasis-maas/issues/new?title=${encodeURIComponent("[vscode] ")}&body=${encodeURIComponent(truncatedBody)}`;
    await vscode15.env.openExternal(vscode15.Uri.parse(issueUrl));
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    outputChannel.appendLine(`[ReportIssue] Failed to open issue: ${message}`);
    vscode15.window.showErrorMessage(`Failed to open issue report: ${message}`);
    await logExtensionError(context, outputChannel, error, "report-issue");
  }
}
async function searchMemories(memoryService, notifyOnboardingStep) {
  const query = await vscode15.window.showInputBox({
    prompt: "Search memories",
    placeHolder: "Enter search query..."
  });
  if (!query) return;
  try {
    vscode15.window.withProgress({
      location: vscode15.ProgressLocation.Notification,
      title: "Searching memories...",
      cancellable: false
    }, async () => {
      const results = await memoryService.searchMemories(query);
      await showSearchResults(results, query);
    });
    if (notifyOnboardingStep) {
      await notifyOnboardingStep("search");
    }
  } catch (error) {
    vscode15.window.showErrorMessage(`Search failed: ${error instanceof Error ? error.message : "Unknown error"}`);
  }
}
async function showSearchResults(results, query) {
  if (results.length === 0) {
    vscode15.window.showInformationMessage(`No memories found for "${query}"`);
    return;
  }
  const items = results.map((memory) => ({
    label: memory.title,
    description: memory.memory_type,
    detail: `${memory.content.substring(0, 100)}${memory.content.length > 100 ? "..." : ""}`,
    memory
  }));
  const selected = await vscode15.window.showQuickPick(items, {
    placeHolder: `Found ${results.length} memories for "${query}"`
  });
  if (selected) {
    openMemoryInEditor(selected.memory);
  }
}
async function createMemoryFromSelection(memoryService, notifyOnboardingStep) {
  const editor = vscode15.window.activeTextEditor;
  if (!editor || editor.selection.isEmpty) {
    vscode15.window.showWarningMessage("Please select some text to create a memory");
    return;
  }
  const selectedText = editor.document.getText(editor.selection);
  const fileName = editor.document.fileName;
  const lineNumber = editor.selection.start.line + 1;
  const title = await vscode15.window.showInputBox({
    prompt: "Memory title",
    value: `Code from ${fileName}:${lineNumber}`
  });
  if (!title) return;
  const config = vscode15.workspace.getConfiguration("lanonasis");
  const defaultType = config.get("defaultMemoryType", "context");
  try {
    await vscode15.window.withProgress({
      location: vscode15.ProgressLocation.Notification,
      title: "Creating memory...",
      cancellable: false
    }, async () => {
      await memoryService.createMemory({
        title,
        content: selectedText,
        memory_type: defaultType,
        tags: ["vscode", "selection"],
        metadata: {
          source: "vscode",
          fileName,
          lineNumber: lineNumber.toString()
        }
      });
    });
    vscode15.window.showInformationMessage(`Memory "${title}" created successfully`);
    vscode15.commands.executeCommand("lanonasis.refreshMemories");
    if (notifyOnboardingStep) {
      await notifyOnboardingStep("create_memory");
    }
  } catch (error) {
    vscode15.window.showErrorMessage(`Failed to create memory: ${error instanceof Error ? error.message : "Unknown error"}`);
  }
}
async function createMemoryFromFile(memoryService, notifyOnboardingStep) {
  const editor = vscode15.window.activeTextEditor;
  if (!editor) {
    vscode15.window.showWarningMessage("No active editor");
    return;
  }
  const content = editor.document.getText();
  const fileName = editor.document.fileName;
  const title = await vscode15.window.showInputBox({
    prompt: "Memory title",
    value: `File: ${fileName.split("/").pop()}`
  });
  if (!title) return;
  const config = vscode15.workspace.getConfiguration("lanonasis");
  const defaultType = config.get("defaultMemoryType", "context");
  try {
    await vscode15.window.withProgress({
      location: vscode15.ProgressLocation.Notification,
      title: "Creating memory from file...",
      cancellable: false
    }, async () => {
      await memoryService.createMemory({
        title,
        content,
        memory_type: defaultType,
        tags: ["vscode", "file"],
        metadata: {
          source: "vscode-file",
          fileName,
          fullPath: fileName
        }
      });
    });
    vscode15.window.showInformationMessage(`Memory "${title}" created from file`);
    vscode15.commands.executeCommand("lanonasis.refreshMemories");
    if (notifyOnboardingStep) {
      await notifyOnboardingStep("create_memory");
    }
  } catch (error) {
    vscode15.window.showErrorMessage(`Failed to create memory: ${error instanceof Error ? error.message : "Unknown error"}`);
  }
}
async function createSampleMemory(memoryService, notifyOnboardingStep) {
  const sampleTitle = "Getting Started with LanOnasis Memory";
  const sampleContent = [
    "Welcome to your first memory!",
    "",
    "Use this space to store context, decisions, snippets, and reminders.",
    "",
    "Quick tips:",
    '- Select text and run "Create Memory from Selection"',
    '- Use "Search Memories" to retrieve relevant context',
    "- Tag memories to keep related ideas together"
  ].join("\n");
  try {
    await vscode15.window.withProgress({
      location: vscode15.ProgressLocation.Notification,
      title: "Creating sample memory...",
      cancellable: false
    }, async () => {
      await memoryService.createMemory({
        title: sampleTitle,
        content: sampleContent,
        memory_type: "context",
        tags: ["onboarding", "sample"],
        metadata: {
          source: "onboarding",
          createdBy: "sample-generator"
        }
      });
    });
    vscode15.window.showInformationMessage("Sample memory created. Try searching for it next.");
    vscode15.commands.executeCommand("lanonasis.refreshMemories");
    if (notifyOnboardingStep) {
      await notifyOnboardingStep("create_memory");
    }
  } catch (error) {
    vscode15.window.showErrorMessage(`Failed to create sample memory: ${error instanceof Error ? error.message : "Unknown error"}`);
  }
}
function openMemoryInEditor(memory) {
  const content = `# ${memory.title}

**Type:** ${memory.memory_type}
**Created:** ${new Date(memory.created_at).toLocaleString()}

---

${memory.content}`;
  vscode15.workspace.openTextDocument({
    content,
    language: "markdown"
  }).then((doc) => {
    vscode15.window.showTextDocument(doc);
  });
}
function showWelcomeMessage() {
  const message = `\u{1F389} Welcome to Lanonasis Memory Assistant!

Your AI-powered memory management system is ready. Let's get you started!`;
  vscode15.window.showInformationMessage(
    message,
    "Connect in Browser",
    "Enter API Key",
    "Get API Key",
    "Learn More"
  ).then((selection) => {
    if (selection === "Connect in Browser") {
      vscode15.commands.executeCommand("lanonasis.authenticate", "oauth");
    } else if (selection === "Enter API Key") {
      vscode15.commands.executeCommand("lanonasis.authenticate", "apikey");
    } else if (selection === "Get API Key") {
      vscode15.env.openExternal(vscode15.Uri.parse("https://docs.lanonasis.com/api-keys"));
    } else if (selection === "Learn More") {
      showOnboardingGuide();
    }
  });
}
function showOnboardingGuide() {
  const guide = `# \u{1F9E0} Lanonasis Memory Assistant - Quick Start Guide

Welcome to your AI-powered memory management system! This guide will help you get started in just a few minutes.

## \u{1F680} Getting Started

### Step 1: Authenticate
Choose one of two authentication methods:

**Option A: Browser Authentication (Recommended)**
1. Click the Lanonasis icon in the sidebar
2. Click "Continue in Browser"
3. Sign in with your Lanonasis account
4. Authorize the extension

**Option B: API Key Authentication**
1. Visit https://api.lanonasis.com to get your API key
2. Click the Lanonasis icon in the sidebar
3. Click "Enter API Key"
4. Paste your API key when prompted

### Step 2: Create Your First Memory
There are multiple ways to create memories:

**From Selected Text:**
1. Select any text in your editor
2. Press \`Ctrl+Shift+Alt+M\` (or \`Cmd+Shift+Alt+M\` on Mac)
3. Give your memory a title
4. Done! Your memory is saved

**From Current File:**
1. Open any file
2. Run command: \`Lanonasis: Create Memory from Current File\`
3. Give your memory a title
4. The entire file content is saved as a memory

**From Sidebar:**
1. Click the Lanonasis icon in the sidebar
2. Click the "Create" button
3. Select text first, then click to save

### Step 3: Search Your Memories
**Quick Search:**
- Press \`Ctrl+Shift+M\` (or \`Cmd+Shift+M\` on Mac)
- Type your search query
- Select a memory to open it

**Sidebar Search:**
- Open the Lanonasis sidebar
- Use the search box at the top
- Results appear instantly

## \u{1F3AF} Key Features

### Memory Types
Memories are automatically organized by type:
- **Context**: Code snippets and contextual information
- **Project**: Project-specific notes and documentation
- **Knowledge**: General knowledge and learnings
- **Reference**: Reference materials and guides
- **Conversation**: Discussion notes and meeting summaries

### CLI Integration
If you have \`@lanonasis/cli\` v3.0.6+ installed, you'll get:
- \u26A1 Faster performance
- \u{1F504} Enhanced caching
- \u{1F680} Advanced features

Install with: \`npm install -g @lanonasis/cli\`

### API Key Management
Manage multiple API keys for different projects:
- Press \`Ctrl+Shift+K\` (or \`Cmd+Shift+K\` on Mac)
- Create, view, and organize API keys
- Support for different environments (dev, staging, prod)

## \u{1F6E0}\uFE0F Useful Commands

Open the Command Palette (\`Ctrl+Shift+P\` or \`Cmd+Shift+P\`) and try:

- \`Lanonasis: Search Memories\` - Search your memories
- \`Lanonasis: Create Memory from Selection\` - Save selected text
- \`Lanonasis: Manage API Keys\` - Manage your API keys
- \`Lanonasis: Run System Diagnostics\` - Check system health
- \`Lanonasis: Show Extension Logs\` - View detailed logs
- \`Lanonasis: Test Connection\` - Test your connection
- \`Lanonasis: Switch Gateway/Direct API Mode\` - Change connection mode

## \u{1F527} Troubleshooting

### Connection Issues?
1. Run: \`Lanonasis: Run System Diagnostics\`
2. Check the diagnostics report for issues
3. Follow recommended actions

### Authentication Problems?
1. Run: \`Lanonasis: Check API Key Status\`
2. Clear and re-enter your API key if needed
3. Try OAuth authentication as an alternative

### Need Help?
- \u{1F4DA} Documentation: https://docs.lanonasis.com
- \u{1F41B} Report Issues: https://github.com/lanonasis/lanonasis-maas/issues
- \u{1F4AC} Community: https://discord.gg/lanonasis

## \u2699\uFE0F Settings

Configure the extension to your liking:
1. Go to: \`File > Preferences > Settings\`
2. Search for: \`Lanonasis\`
3. Customize:
   - API URLs
   - Default memory types
   - Search limits
   - Performance options
   - And more!

## \u{1F393} Tips & Tricks

1. **Use Keyboard Shortcuts**: Master the shortcuts for faster workflow
2. **Tag Your Memories**: Add tags during creation for better organization
3. **Regular Backups**: Export important memories regularly
4. **CLI Integration**: Install the CLI for best performance
5. **Organize by Project**: Use project-specific memories for better context

## \u{1F389} You're All Set!

You're now ready to use Lanonasis Memory Assistant. Start by:
1. Authenticating (if you haven't already)
2. Creating your first memory
3. Searching and exploring

Happy memory management! \u{1F9E0}\u2728

---

**Quick Reference:**
- Search: \`Ctrl+Shift+M\` / \`Cmd+Shift+M\`
- Create from Selection: \`Ctrl+Shift+Alt+M\` / \`Cmd+Shift+Alt+M\`
- Manage API Keys: \`Ctrl+Shift+K\` / \`Cmd+Shift+K\`
`;
  vscode15.workspace.openTextDocument({
    content: guide,
    language: "markdown"
  }).then((doc) => {
    vscode15.window.showTextDocument(doc);
  });
}
async function switchConnectionMode(memoryService, apiKeyService) {
  const config = vscode15.workspace.getConfiguration("lanonasis");
  const currentUseGateway = config.get("useGateway", true);
  const options = [
    {
      label: "\u{1F310} Gateway Mode (Recommended)",
      description: "Use Onasis Gateway for optimized routing and caching",
      picked: currentUseGateway,
      value: true
    },
    {
      label: "\u{1F517} Direct API Mode",
      description: "Connect directly to memory service",
      picked: !currentUseGateway,
      value: false
    }
  ];
  const selected = await vscode15.window.showQuickPick(options, {
    placeHolder: "Choose connection mode",
    ignoreFocusOut: true
  });
  if (!selected) return;
  try {
    await config.update("useGateway", selected.value, vscode15.ConfigurationTarget.Global);
    await memoryService.refreshClient();
    apiKeyService.refreshConfig();
    const modeName = selected.value ? "Gateway" : "Direct API";
    vscode15.window.showInformationMessage(`Switched to ${modeName} mode. Testing connection...`);
    await memoryService.testConnection();
    vscode15.window.showInformationMessage(`\u2705 ${modeName} mode active and connected`);
    vscode15.commands.executeCommand("lanonasis.refreshMemories");
  } catch (error) {
    vscode15.window.showErrorMessage(`Failed to switch mode: ${error instanceof Error ? error.message : "Unknown error"}`);
    await config.update("useGateway", currentUseGateway, vscode15.ConfigurationTarget.Global);
    await memoryService.refreshClient();
    apiKeyService.refreshConfig();
  }
}
async function manageApiKeys(apiKeyService) {
  const quickPickItems = [
    {
      label: "$(key) View API Keys",
      description: "View all API keys across projects",
      command: "view"
    },
    {
      label: "$(add) Create API Key",
      description: "Create a new API key",
      command: "create"
    },
    {
      label: "$(folder) Manage Projects",
      description: "Create and manage API key projects",
      command: "projects"
    },
    {
      label: "$(refresh) Refresh",
      description: "Refresh API key data",
      command: "refresh"
    }
  ];
  const selected = await vscode15.window.showQuickPick(quickPickItems, {
    placeHolder: "Choose an API key management action"
  });
  if (!selected) return;
  switch (selected.command) {
    case "view":
      await viewApiKeys(apiKeyService);
      break;
    case "create":
      await createApiKey(apiKeyService);
      break;
    case "projects":
      await viewProjects(apiKeyService);
      break;
    case "refresh":
      vscode15.commands.executeCommand("lanonasis.refreshApiKeys");
      break;
  }
}
async function viewApiKeys(apiKeyService) {
  try {
    vscode15.window.withProgress({
      location: vscode15.ProgressLocation.Notification,
      title: "Loading API keys...",
      cancellable: false
    }, async () => {
      const apiKeys = await apiKeyService.getApiKeys();
      if (apiKeys.length === 0) {
        vscode15.window.showInformationMessage("No API keys found. Create your first API key to get started.");
        return;
      }
      const items = apiKeys.map((key) => ({
        label: key.name,
        description: `${key.environment} \u2022 ${key.keyType} \u2022 ${key.accessLevel}`,
        detail: `Project: ${key.projectId} | Created: ${new Date(key.createdAt).toLocaleDateString()}`,
        apiKey: key
      }));
      const selected = await vscode15.window.showQuickPick(items, {
        placeHolder: `Select an API key (${apiKeys.length} found)`
      });
      if (selected) {
        await showApiKeyDetails(selected.apiKey);
      }
    });
  } catch (error) {
    vscode15.window.showErrorMessage(`Failed to load API keys: ${error instanceof Error ? error.message : "Unknown error"}`);
  }
}
async function createApiKey(apiKeyService, _apiKeyTreeProvider) {
  try {
    const projects = await apiKeyService.getProjects();
    if (projects.length === 0) {
      const createProjectResponse = await vscode15.window.showInformationMessage(
        "No projects found. You need to create a project first.",
        "Create Project",
        "Cancel"
      );
      if (createProjectResponse === "Create Project") {
        await createProject(apiKeyService, void 0);
      }
      return;
    }
    const projectItems = projects.map((p) => ({
      label: p.name,
      description: p.description || "No description",
      project: p
    }));
    const selectedProject = await vscode15.window.showQuickPick(projectItems, {
      placeHolder: "Select a project for the API key"
    });
    if (!selectedProject) return;
    const name = await vscode15.window.showInputBox({
      prompt: "API Key Name",
      placeHolder: "Enter a name for your API key"
    });
    if (!name) return;
    const value = await vscode15.window.showInputBox({
      prompt: "API Key Value",
      placeHolder: "Enter the API key value",
      password: true
    });
    if (!value) return;
    const keyTypes = [
      { label: "API Key", value: "api_key" },
      { label: "Database URL", value: "database_url" },
      { label: "OAuth Token", value: "oauth_token" },
      { label: "Certificate", value: "certificate" },
      { label: "SSH Key", value: "ssh_key" },
      { label: "Webhook Secret", value: "webhook_secret" },
      { label: "Encryption Key", value: "encryption_key" }
    ];
    const selectedKeyType = await vscode15.window.showQuickPick(keyTypes, {
      placeHolder: "Select key type"
    });
    if (!selectedKeyType) return;
    const config = vscode15.workspace.getConfiguration("lanonasis");
    const defaultEnv = config.get("defaultEnvironment", "development");
    const environments = [
      { label: "Development", value: "development", picked: defaultEnv === "development" },
      { label: "Staging", value: "staging", picked: defaultEnv === "staging" },
      { label: "Production", value: "production", picked: defaultEnv === "production" }
    ];
    const selectedEnvironment = await vscode15.window.showQuickPick(environments, {
      placeHolder: "Select environment"
    });
    if (!selectedEnvironment) return;
    await vscode15.window.withProgress({
      location: vscode15.ProgressLocation.Notification,
      title: "Creating API key...",
      cancellable: false
    }, async () => {
      await apiKeyService.createApiKey({
        name,
        value,
        keyType: selectedKeyType.value,
        environment: selectedEnvironment.value,
        accessLevel: "team",
        projectId: selectedProject.project.id
      });
    });
    vscode15.window.showInformationMessage(`API key "${name}" created successfully`);
    vscode15.commands.executeCommand("lanonasis.refreshApiKeys");
  } catch (error) {
    vscode15.window.showErrorMessage(`Failed to create API key: ${error instanceof Error ? error.message : "Unknown error"}`);
  }
}
async function createProject(apiKeyService, apiKeyTreeProvider) {
  try {
    const name = await vscode15.window.showInputBox({
      prompt: "Project Name",
      placeHolder: "Enter a name for your project"
    });
    if (!name) return;
    const description = await vscode15.window.showInputBox({
      prompt: "Project Description (optional)",
      placeHolder: "Enter a description for your project"
    });
    const config = vscode15.workspace.getConfiguration("lanonasis");
    let organizationId = config.get("organizationId");
    if (!organizationId) {
      const orgId = await vscode15.window.showInputBox({
        prompt: "Organization ID",
        placeHolder: "Enter your organization ID"
      });
      if (!orgId) return;
      await config.update("organizationId", orgId, vscode15.ConfigurationTarget.Global);
      organizationId = orgId;
    }
    await vscode15.window.withProgress({
      location: vscode15.ProgressLocation.Notification,
      title: "Creating project...",
      cancellable: false
    }, async () => {
      const project = await apiKeyService.createProject({
        name,
        description,
        organizationId
      });
      if (apiKeyTreeProvider) {
        await apiKeyTreeProvider.addProject(project);
      }
    });
    vscode15.window.showInformationMessage(`Project "${name}" created successfully`);
    vscode15.commands.executeCommand("lanonasis.refreshApiKeys");
  } catch (error) {
    vscode15.window.showErrorMessage(`Failed to create project: ${error instanceof Error ? error.message : "Unknown error"}`);
  }
}
async function viewProjects(apiKeyService) {
  try {
    vscode15.window.withProgress({
      location: vscode15.ProgressLocation.Notification,
      title: "Loading projects...",
      cancellable: false
    }, async () => {
      const projects = await apiKeyService.getProjects();
      if (projects.length === 0) {
        const createProjectResponse = await vscode15.window.showInformationMessage(
          "No projects found. Create your first project to get started.",
          "Create Project",
          "Cancel"
        );
        if (createProjectResponse === "Create Project") {
          await createProject(apiKeyService, void 0);
        }
        return;
      }
      const items = projects.map((project) => ({
        label: project.name,
        description: project.description || "No description",
        detail: `Organization: ${project.organizationId} | Created: ${new Date(project.createdAt).toLocaleDateString()}`,
        project
      }));
      const selected = await vscode15.window.showQuickPick(items, {
        placeHolder: `Select a project (${projects.length} found)`
      });
      if (selected) {
        await showProjectDetails(selected.project, apiKeyService);
      }
    });
  } catch (error) {
    vscode15.window.showErrorMessage(`Failed to load projects: ${error instanceof Error ? error.message : "Unknown error"}`);
  }
}
async function showApiKeyDetails(apiKey) {
  const content = `# API Key: ${apiKey.name}

**Type:** ${apiKey.keyType}
**Environment:** ${apiKey.environment}
**Access Level:** ${apiKey.accessLevel}
**Project ID:** ${apiKey.projectId}
**Created:** ${new Date(apiKey.createdAt).toLocaleString()}
${apiKey.expiresAt ? `**Expires:** ${new Date(apiKey.expiresAt).toLocaleString()}` : "**Expires:** Never"}

## Tags
${apiKey.tags.length > 0 ? apiKey.tags.map((tag) => `- ${tag}`).join("\n") : "No tags"}

## Metadata
\`\`\`json
${JSON.stringify(apiKey.metadata, null, 2)}
\`\`\``;
  vscode15.workspace.openTextDocument({
    content,
    language: "markdown"
  }).then((doc) => {
    vscode15.window.showTextDocument(doc);
  });
}
async function showProjectDetails(project, apiKeyService) {
  try {
    const apiKeys = await apiKeyService.getApiKeys(project.id);
    const content = `# Project: ${project.name}

**Description:** ${project.description || "No description"}
**Organization ID:** ${project.organizationId}
**Created:** ${new Date(project.createdAt).toLocaleString()}
**Team Members:** ${project.teamMembers.length}

## API Keys (${apiKeys.length})
${apiKeys.length > 0 ? apiKeys.map((key) => `- **${key.name}** (${key.keyType}, ${key.environment})`).join("\n") : "No API keys found in this project"}

## Settings
\`\`\`json
${JSON.stringify(project.settings, null, 2)}
\`\`\``;
    vscode15.workspace.openTextDocument({
      content,
      language: "markdown"
    }).then((doc) => {
      vscode15.window.showTextDocument(doc);
    });
  } catch (error) {
    vscode15.window.showErrorMessage(`Failed to load project details: ${error instanceof Error ? error.message : "Unknown error"}`);
  }
}
async function createApiKeyForProject(project, apiKeyService, apiKeyTreeProvider) {
  try {
    const name = await vscode15.window.showInputBox({
      prompt: "API Key Name",
      placeHolder: "Enter a name for your API key"
    });
    if (!name) return;
    const value = await vscode15.window.showInputBox({
      prompt: "API Key Value",
      placeHolder: "Enter the API key value",
      password: true
    });
    if (!value) return;
    const keyTypes = [
      { label: "API Key", value: "api_key" },
      { label: "Database URL", value: "database_url" },
      { label: "OAuth Token", value: "oauth_token" },
      { label: "Certificate", value: "certificate" },
      { label: "SSH Key", value: "ssh_key" },
      { label: "Webhook Secret", value: "webhook_secret" },
      { label: "Encryption Key", value: "encryption_key" }
    ];
    const selectedKeyType = await vscode15.window.showQuickPick(keyTypes, {
      placeHolder: "Select key type"
    });
    if (!selectedKeyType) return;
    const environments = [
      { label: "Development", description: "For development use" },
      { label: "Staging", description: "For staging/testing" },
      { label: "Production", description: "For production use" }
    ];
    const selectedEnv = await vscode15.window.showQuickPick(environments, {
      placeHolder: "Select environment"
    });
    if (!selectedEnv) return;
    const accessLevels = [
      { label: "Public", description: "Publicly accessible" },
      { label: "Authenticated", description: "Requires authentication" },
      { label: "Team", description: "Team members only" },
      { label: "Admin", description: "Administrators only" },
      { label: "Enterprise", description: "Enterprise level access" }
    ];
    const selectedAccess = await vscode15.window.showQuickPick(accessLevels, {
      placeHolder: "Select access level"
    });
    if (!selectedAccess) return;
    const request = {
      name,
      value,
      keyType: selectedKeyType.value,
      environment: selectedEnv.label.toLowerCase(),
      accessLevel: selectedAccess.label.toLowerCase(),
      projectId: project.id
    };
    await vscode15.window.withProgress({
      location: vscode15.ProgressLocation.Notification,
      title: "Creating API key...",
      cancellable: false
    }, async () => {
      const apiKey = await apiKeyService.createApiKey(request);
      vscode15.window.showInformationMessage(`API key "${apiKey.name}" created successfully!`);
      if (apiKeyTreeProvider) {
        await apiKeyTreeProvider.addApiKey(project.id, apiKey);
      }
    });
  } catch (error) {
    vscode15.window.showErrorMessage(`Failed to create API key: ${error instanceof Error ? error.message : "Unknown error"}`);
  }
}
async function rotateApiKey(apiKey, apiKeyService, apiKeyTreeProvider) {
  try {
    const confirmed = await vscode15.window.showWarningMessage(
      `Are you sure you want to rotate API key "${apiKey.name}"? The old key will be invalidated.`,
      { modal: true },
      "Rotate Key"
    );
    if (confirmed !== "Rotate Key") return;
    await vscode15.window.withProgress({
      location: vscode15.ProgressLocation.Notification,
      title: "Rotating API key...",
      cancellable: false
    }, async () => {
      const rotated = await apiKeyService.rotateApiKey(apiKey.id);
      vscode15.window.showInformationMessage(`API key "${rotated.name}" rotated successfully!`);
      if (apiKeyTreeProvider) {
        await apiKeyTreeProvider.updateApiKey(apiKey.projectId, rotated);
      }
    });
  } catch (error) {
    vscode15.window.showErrorMessage(`Failed to rotate API key: ${error instanceof Error ? error.message : "Unknown error"}`);
  }
}
async function deleteApiKey(apiKey, apiKeyService, apiKeyTreeProvider) {
  try {
    const confirmed = await vscode15.window.showWarningMessage(
      `Are you sure you want to delete API key "${apiKey.name}"? This action cannot be undone.`,
      { modal: true },
      "Delete"
    );
    if (confirmed !== "Delete") return;
    await vscode15.window.withProgress({
      location: vscode15.ProgressLocation.Notification,
      title: "Deleting API key...",
      cancellable: false
    }, async () => {
      await apiKeyService.deleteApiKey(apiKey.id);
      vscode15.window.showInformationMessage(`API key "${apiKey.name}" deleted successfully.`);
      if (apiKeyTreeProvider) {
        await apiKeyTreeProvider.removeApiKey(apiKey.projectId, apiKey.id);
      }
    });
  } catch (error) {
    vscode15.window.showErrorMessage(`Failed to delete API key: ${error instanceof Error ? error.message : "Unknown error"}`);
  }
}
async function deleteProject(project, apiKeyService, apiKeyTreeProvider) {
  try {
    const confirmed = await vscode15.window.showWarningMessage(
      `Are you sure you want to delete project "${project.name}"? All API keys in this project will also be deleted. This action cannot be undone.`,
      { modal: true },
      "Delete"
    );
    if (confirmed !== "Delete") return;
    await vscode15.window.withProgress({
      location: vscode15.ProgressLocation.Notification,
      title: "Deleting project...",
      cancellable: false
    }, async () => {
      await apiKeyService.deleteProject(project.id);
      vscode15.window.showInformationMessage(`Project "${project.name}" deleted successfully.`);
      if (apiKeyTreeProvider) {
        await apiKeyTreeProvider.removeProject(project.id);
      }
    });
  } catch (error) {
    vscode15.window.showErrorMessage(`Failed to delete project: ${error instanceof Error ? error.message : "Unknown error"}`);
  }
}
async function captureContextToMemory(memoryService, notifyOnboardingStep) {
  try {
    let content;
    let source = "selection";
    const editor = vscode15.window.activeTextEditor;
    if (editor && !editor.selection.isEmpty) {
      content = editor.document.getText(editor.selection);
      source = "editor";
    } else {
      content = await vscode15.env.clipboard.readText();
      source = "clipboard";
    }
    if (!content || !content.trim()) {
      vscode15.window.showWarningMessage("No content to capture. Select text or copy something to clipboard first.");
      return;
    }
    const defaultTitle = content.substring(0, 50).replace(/\n/g, " ").trim();
    const title = await vscode15.window.showInputBox({
      prompt: "Title for this memory",
      placeHolder: "Enter a title...",
      value: defaultTitle
    });
    if (!title) return;
    const memoryType = await vscode15.window.showQuickPick(
      ["context", "knowledge", "reference", "project", "personal", "workflow"],
      {
        placeHolder: "Select memory type",
        title: "Memory Type"
      }
    );
    if (!memoryType) return;
    await vscode15.window.withProgress({
      location: vscode15.ProgressLocation.Notification,
      title: "Creating memory...",
      cancellable: false
    }, async () => {
      await memoryService.createMemory({
        title,
        content,
        memory_type: memoryType,
        tags: ["captured", source, "vscode"],
        metadata: {
          source,
          capturedAt: (/* @__PURE__ */ new Date()).toISOString(),
          editor: editor?.document.fileName
        }
      });
    });
    vscode15.window.showInformationMessage(`\u{1F4DD} Memory captured: "${title}"`);
    vscode15.commands.executeCommand("lanonasis.refreshMemories");
    if (notifyOnboardingStep) {
      await notifyOnboardingStep("create_memory");
    }
  } catch (error) {
    vscode15.window.showErrorMessage(`Failed to capture context: ${error instanceof Error ? error.message : "Unknown error"}`);
  }
}
async function captureClipboardToMemory(memoryService, notifyOnboardingStep) {
  try {
    const clipboardContent = await vscode15.env.clipboard.readText();
    if (!clipboardContent || !clipboardContent.trim()) {
      vscode15.window.showWarningMessage("Clipboard is empty. Copy some content first.");
      return;
    }
    const defaultTitle = clipboardContent.substring(0, 50).replace(/\n/g, " ").trim();
    const title = await vscode15.window.showInputBox({
      prompt: "Title for this memory",
      placeHolder: "Enter a title...",
      value: defaultTitle
    });
    if (!title) return;
    const typeItems = [
      { label: "\u{1F4DD} Context", description: "General contextual information", value: "context" },
      { label: "\u{1F4DA} Knowledge", description: "Learning or reference material", value: "knowledge" },
      { label: "\u{1F517} Reference", description: "Quick reference snippet", value: "reference" },
      { label: "\u{1F4C1} Project", description: "Project-specific note", value: "project" }
    ];
    const selectedType = await vscode15.window.showQuickPick(typeItems, {
      placeHolder: "Select memory type"
    });
    if (!selectedType) return;
    await vscode15.window.withProgress({
      location: vscode15.ProgressLocation.Notification,
      title: "Capturing from clipboard...",
      cancellable: false
    }, async () => {
      await memoryService.createMemory({
        title,
        content: clipboardContent,
        memory_type: selectedType.value,
        tags: ["clipboard", "captured", "vscode"],
        metadata: {
          source: "clipboard",
          capturedAt: (/* @__PURE__ */ new Date()).toISOString()
        }
      });
    });
    vscode15.window.showInformationMessage(`\u{1F4CB} Clipboard captured: "${title}"`);
    vscode15.commands.executeCommand("lanonasis.refreshMemories");
    if (notifyOnboardingStep) {
      await notifyOnboardingStep("create_memory");
    }
  } catch (error) {
    vscode15.window.showErrorMessage(`Failed to capture clipboard: ${error instanceof Error ? error.message : "Unknown error"}`);
  }
}
function deactivate() {
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  activate,
  deactivate
});
//# sourceMappingURL=extension.js.map
