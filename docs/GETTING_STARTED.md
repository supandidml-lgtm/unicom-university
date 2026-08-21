# Getting Started — Local Development

## Prerequisites
- **Node.js**: >= 20.0.0 (Node 24 recommended)
- **npm**: >= 10.0.0
- **PostgreSQL**: >= 15.0
- **Redis**: >= 7.0

---

## Quick Start

### 1. Clone & Install Dependencies
```bash
npm install
```

### 2. Configure Environment Variables
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```

### 3. Build Shared Packages
```bash
npm run build
```

### 4. Run Development Servers
To start all workspaces in parallel (Web, API, Worker):
```bash
npm run dev
```

The services will be accessible at:
- **Web Frontend**: `http://localhost:3000`
- **Backend API**: `http://localhost:4000/api/v1`
- **API Health Probes**: `http://localhost:4000/api/v1/health`
