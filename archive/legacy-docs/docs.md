public-facing documentation section for docs.lanonasis.com.

⸻

✅ Suggested File Structure for docs.lanonasis.com

Create a new markdown file at:

/docs/overview.md

Paste the following structured content inside:

⸻


# 🧠 Memory as a Service (MaaS) – B2B2C Platform Overview

## 🎯 Business Model

Transform your memory infrastructure into a **revenue-generating service**. The platform enables:

- 💰 API Usage Pricing (Free / Pro / Enterprise)
- 🔑 SDK Licensing for third parties
- ☁️ Managed Hosting options
- 🤝 Reseller Network enablement

## ✨ Platform Capabilities

### 🧠 Advanced Memory Engine
- Vector storage via OpenAI (1536D)
- Semantic search (cosine similarity)
- Memory types: conversation, knowledge, project, context, reference
- Bulk import/export (JSON, YAML, Markdown, CSV)
- Hierarchical topic organization

### 🔐 Dual Authentication
- Supabase JWT + Custom API keys
- Plan-based access control
- Multi-tenant isolation

### 🛠 Developer Ecosystem
- TypeScript SDK with React Hooks
- CLI Tool (`@seyederick/memory-cli`)
- Memory visualizer and bulk uploader
- REST API (OpenAPI)
- Zero-integration with `sd-ghost-protocol`

---

## 🏗️ Architecture

```txt
RESELLER NETWORK
     │
┌──────────────┐ ┌─────────────┐
│ SaaS Apps    │ │ AI Platforms│
│ CRM/ERP      │ │ Agent Tools │
└──────────────┘ └─────────────┘
     │
MaaS SDK Distribution Layer
┌────────────────────────────┐
│ SDK (React + Hooks)        │
│ Visual Components          │
└────────────────────────────┘
     │
MaaS Control API (Express + Auth)
     │
sd-ghost-protocol (PostgreSQL + pgvector)


⸻

🚀 Quick Start

Prerequisites
	•	Node.js 18+, npm/yarn
	•	Supabase with vector support
	•	OpenAI API key
	•	Existing sd-ghost-protocol setup

Integration Steps

git clone https://github.com/seyederick/vibe-memory.git
cd vibe-memory
npm install

# Apply aligned schema
psql -f src/db/schema-aligned.sql

# Configure environment
cp .env.example .env

# Start platform
npm run dev


⸻

📚 API & SDK Usage

Authentication

# JWT Auth
curl -H "Authorization: Bearer <supabase-jwt>" https://your-maas.com/api/v1/memory

# API Key Auth
curl -H "X-API-Key: <your-api-key>" https://your-maas.com/api/v1/memory

SDK Example

import { createMaaSClient } from '@seyederick/maas-client';

const client = createMaaSClient({
  apiUrl: 'https://your-maas.com',
  apiKey: 'your-api-key'
});


⸻

💼 Use Cases

Platform Operators
	•	📈 Monetize infrastructure
	•	🔑 Sell API access
	•	🏢 Enterprise white-label offers
	•	📊 Analytics and insights

Developers
	•	🚀 Rapid onboarding
	•	🎨 Custom UI integration
	•	⚡ Production-ready tools
	•	📱 Multi-platform support

⸻

📊 Pricing

Plan	Memory Limit	API Calls	Features	Price
Free	100	60/min	Basic API	$0
Pro	10,000	300/min	SDK, Support	$29/month
Enterprise	Unlimited	1,000/min	SLA, White-label, Custom	Custom


⸻

🗺️ Roadmap

✅ Phase 1: Core (Complete)
	•	Vector memory
	•	Dual auth
	•	CLI + SDK

🔄 Phase 2: Business Features (In Progress)
	•	Billing
	•	Analytics
	•	Multi-region deploy

📋 Phase 3: Advanced Features (Planned)
	•	Collaboration
	•	Embedding model selection
	•	Plugin marketplace

⸻

Built with ❤️ by Seye Derick
📘 Platform Docs

---

### ✅ Next Steps

- Deploy this at `https://docs.lanonasis.com/overview`
- Add to sidebar nav as: `MaaS Overview`
- (Optional) Break out SDK, CLI, and Auth sections into `docs/sdk.md`, `docs/cli.md`, `docs/auth.md`

Let me know if you'd like me to generate those too.