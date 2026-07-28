# Readify

A social platform for readers — track what you're reading, review and rate books, follow other readers, and discover new books through both a live activity feed and a graph-based recommendation engine.

Built as a 3rd year, 2nd semester college project.

## Structure

```
Readify/
├── readify-frontend/   # React + TypeScript + Vite client
├── readify-backend/    # Node.js + Express API, PostgreSQL
└── readify-ai/         # Python recommendation engine (Discover page)
└── docs/               # report folder
```

Each folder has its own README/docs with full setup details:
- [`readify-frontend`](./readify-frontend)
- [`readify-backend`](./readify-backend) — see also [API.md](./readify-backend/API.md) and [DATABASE.md](./readify-backend/DATABASE.md)
- [`readify-ai`](./readify-ai/README.md)

## Report

Full project report (methodology, architecture, evaluation): [Readify_Report.pdf](./docs/Readify_Report.pdf)

## Tech Stack

- **Frontend:** React, TypeScript, Vite
- **Backend:** Node.js, Express, PostgreSQL
- **AI:** Python, PyTorch (Heterogeneous Graph Attention Network) for Discover recommendations

## Quick Start

```bash
# Backend
cd readify-backend
npm install
npm start

# Frontend
cd readify-frontend
npm install
npm run dev

# AI (optional, powers the Discover page)
cd readify-ai
pip install -r requirements.txt --break-system-packages
python jobs/build_and_train_discover_graph.py
```

Each folder needs its own `.env` file (database credentials, JWT secret, mail config, Gemini API key, etc.) — see the respective folder's docs.

## Links

- Repository: https://github.com/fedupGenJi/Readify
