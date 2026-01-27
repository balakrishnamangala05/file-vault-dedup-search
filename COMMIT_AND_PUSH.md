# Step-by-Step: Commit and Push to GitHub

Run these commands in PowerShell, one section at a time:

## Step 1: Initialize Git and Create First Commit (Project Setup)

```powershell
cd c:\project\file-vault-dedup-search
git init
git add docker-compose.yml
git add .gitignore
git add README.md
git add GITHUB_SETUP.md
git commit -m "Initial commit: Add Docker setup and project structure

- Add docker-compose.yml for backend and frontend services
- Add .gitignore for Python, Node, and OS files
- Add README.md with project documentation
- Add GitHub setup guide"
```

## Step 2: Backend - Django Models and Migrations

```powershell
git add backend/requirements.txt
git add backend/Dockerfile
git add backend/manage.py
git add backend/vault/settings.py
git add backend/vault/wsgi.py
git add backend/api/__init__.py
git add backend/api/apps.py
git add backend/api/models.py
git add backend/api/migrations/
git commit -m "Backend: Add Django models and database migrations

- Add Django REST Framework and dependencies
- Create StoredFile and FileUpload models with SHA-256 deduplication
- Add initial database migrations
- Configure Django settings with CORS and REST framework"
```

## Step 3: Backend - API Views and Serializers

```powershell
git add backend/api/views.py
git add backend/api/serializers.py
git add backend/api/urls.py
git add backend/vault/urls.py
git commit -m "Backend: Implement API endpoints for file operations

- Add file upload with SHA-256 hash computation
- Implement file listing with search functionality
- Add file download endpoint
- Create REST API serializers for data formatting
- Configure URL routing for API endpoints"
```

## Step 4: Backend - Exception Handling

```powershell
git add backend/api/exceptions.py
git commit -m "Backend: Add custom exception handler for JSON responses

- Implement custom exception handler for consistent JSON error responses
- Handle database errors gracefully
- Improve API error messaging"
```

## Step 5: Frontend - React Application

```powershell
git add frontend/package.json
git add frontend/Dockerfile
git add frontend/vite.config.js
git add frontend/index.html
git add frontend/src/main.jsx
git add frontend/src/App.jsx
git add frontend/src/api.js
git commit -m "Frontend: Add React application with file upload and search

- Set up React with Vite
- Implement file upload functionality
- Add file listing with search feature
- Create API client for backend communication
- Add responsive UI with file management table"
```

## Step 6: Final Documentation and Cleanup

```powershell
git add COMMIT_AND_PUSH.md
git commit -m "Docs: Add commit guide and finalize documentation

- Add commit and push instructions
- Update README with complete setup guide"
```

## Step 7: Create GitHub Repository and Push

### 7a. Create Repository on GitHub
1. Go to https://github.com/new
2. Repository name: `file-vault-dedup-search`
3. Description: "Secure file vault with SHA-256 deduplication"
4. Choose Public or Private
5. **DO NOT** initialize with README, .gitignore, or license
6. Click "Create repository"

### 7b. Add Remote and Push

```powershell
# Replace YOUR_USERNAME with your GitHub username
git remote add origin https://github.com/YOUR_USERNAME/file-vault-dedup-search.git
git branch -M main
git push -u origin main
```

**Note:** When prompted for credentials:
- Username: Your GitHub username
- Password: Use a Personal Access Token (not your password)
  - Generate at: https://github.com/settings/tokens
  - Select `repo` scope

## Alternative: All Commits at Once

If you prefer to do all commits in one go:

```powershell
cd c:\project\file-vault-dedup-search
git init
git add .
git commit -m "Initial commit: File Vault with deduplication and search

- Backend: Django REST API with SHA-256 deduplication
- Frontend: React app with file upload and search
- Docker: Full stack containerization
- Features: File upload, deduplication, search, download"
```

Then follow Step 7 to push to GitHub.
