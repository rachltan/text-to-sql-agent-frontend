## CoPoint Prototype – Frontend & Backend Setup

This guide explains how to clone and run **Rachel’s React frontend** together with **Iason’s FastAPI backend** so everyone on the team can get a working prototype locally.

> **Assumptions**
> - Frontend repo: this repository (`agent`) with the React app in `frontend/`.
> - Backend repo: Iason’s FastAPI service, available at a Git URL like `git@github.com:ORG/iason-backend.git` (replace with the real URL).
> - Target backend base URL (as used in the frontend): `http://127.0.0.1:8000`.

---

### 1. Prerequisites

- **Git**: `git --version`
- **Node.js + npm** (or Yarn) for the React app  
  - Recommended: Node 18+  
  - Check: `node -v` and `npm -v`
- **Python 3.10+** and **pip** for the FastAPI backend  
  - Check: `python3 --version` and `pip3 --version`

On macOS you can install tools via Homebrew if needed:

```bash
brew install git node python
```

---

### 2. Clone the Repositories

#### 2.1 Clone Rachel’s frontend

```bash
cd /path/where/you/want/projects
git clone git@github.com:ORG/agent.git   # or the HTTPS URL
cd agent
```

The React app lives in:

- `frontend/` – main React project (entry point `frontend/src/App.js`)

#### 2.2 Clone Iason’s backend

In a **separate folder** (sibling to `agent` or wherever you prefer), clone the backend:

```bash
cd /path/where/you/want/projects
git clone <IASON_BACKEND_GIT_URL>
cd <iason-backend-folder>
```

Replace `<IASON_BACKEND_GIT_URL>` and `<iason-backend-folder>` with the actual values from Iason.

---

### 3. Backend Setup (Iason’s FastAPI service)

These steps are generic for a FastAPI app – adjust folder/file names if Iason’s README says otherwise.

#### 3.1 Create and activate a virtual environment

```bash
cd <iason-backend-folder>
python3 -m venv .venv
source .venv/bin/activate   # on macOS / Linux
# On Windows (PowerShell):
# .venv\Scripts\Activate.ps1
```

#### 3.2 Install backend dependencies

If there is a `requirements.txt`:

```bash
pip install --upgrade pip
pip install -r requirements.txt
```

If there is a `pyproject.toml` / `poetry.lock`, follow the commands in Iason’s README instead.

#### 3.3 Run the FastAPI server on port 8000

Most FastAPI apps use `uvicorn`:

```bash
uvicorn main:app --reload --host 127.0.0.1 --port 8000
```

or, if the app module is named differently:

```bash
uvicorn backend.app:app --reload --host 127.0.0.1 --port 8000
```

Keep this terminal **running**.  
The frontend expects the backend endpoints at:

- `http://127.0.0.1:8000/ask`
- `http://127.0.0.1:8000/history`

You can quickly check the backend is healthy by visiting in a browser:

- `http://127.0.0.1:8000/docs` – FastAPI interactive docs (if enabled)

---

### 4. Frontend Setup (React app)

Open a **new terminal window/tab** for the frontend.

#### 4.1 Install frontend dependencies

From the root of this repo (`agent`):

```bash
cd /path/where/you/cloned/agent
cd frontend
npm install
# or: yarn
```

#### 4.2 Configure the backend URL (optional)

By default, `frontend/src/App.js` calls:

- `http://127.0.0.1:8000/ask`
- `http://127.0.0.1:8000/history`

If Iason’s backend runs on a **different host or port**, update those URLs in `App.js` or introduce an environment variable (e.g. `REACT_APP_API_BASE_URL`) and wire it into the axios calls.

#### 4.3 Run the frontend dev server

```bash
cd frontend
npm start
# or: yarn start
```

This should open the app at something like:

- `http://localhost:3000`

---

### 5. Verifying the End-to-End Prototype

Once both servers are running:

1. **Backend**: FastAPI on `http://127.0.0.1:8000` (check `/docs` if available).
2. **Frontend**: React app on `http://localhost:3000`.

In the frontend:

- Type a question into the main input and press **Enter** or click **Run query**.
- The frontend will send a `POST` to `http://127.0.0.1:8000/ask` and display:
  - The **answer** text.
  - Any **chart data** and **result preview table**.
  - The generated **SQL** and **data sources** in the right-hand panel.
- Your last questions should appear in the **Recent questions** list on the left, backed by the `/history` endpoints.

If you see the in-app error message:

> “We couldn't reach the analytics backend. Make sure the FastAPI server is running on http://127.0.0.1:8000 and then try again.”

then:

- Confirm the backend terminal is still running and listening on port `8000`.
- Confirm there are no firewalls/VPN issues blocking `127.0.0.1`.

---

### 6. Common Troubleshooting Tips

- **Port already in use**  
  - If `uvicorn` or `npm start` complain about a port in use, either stop the older process or change the port (and update the URLs in the frontend if you change the backend port).

- **CORS errors in the browser**  
  - If the browser console shows CORS errors when calling `http://127.0.0.1:8000`, ensure Iason’s FastAPI app has CORS middleware configured to allow `http://localhost:3000`.

- **Dependency mismatches**  
  - If `npm install` or `pip install` fail, delete `node_modules` or recreate the Python virtualenv and reinstall.

---

### 7. Summary – Minimum Steps for a Working Prototype

1. **Clone both repos** (Rachel’s `agent` frontend and Iason’s FastAPI backend).
2. **Backend**: create venv → install requirements → run FastAPI on `127.0.0.1:8000`.
3. **Frontend**: `cd agent/frontend` → `npm install` → `npm start`.
4. Open `http://localhost:3000`, ask a question, and confirm responses come from the backend.

