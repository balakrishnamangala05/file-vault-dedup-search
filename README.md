# File Vault (Deduplication + Search)

A secure file vault system that supports SHA-256 based deduplication.
Multiple uploads referencing identical content point to a single stored file.

## Features
- ✅ Upload files with SHA-256 deduplication
- ✅ Two-table design (StoredFile + FileUpload)
- ✅ Reference counting
- ✅ Search by filename
- ✅ Download uploaded files
- ✅ Dockerized full stack

## Tech Stack
- Backend: Django + Django REST Framework
- Frontend: React + Vite
- Database: SQLite (default)
- DevOps: Docker Compose

## Deduplication Design
1. Compute SHA-256 hash while uploading
2. If hash exists → reuse stored file, increment ref_count
3. Else → store new physical file
4. Always create a new FileUpload metadata record

## Setup and Run

### Prerequisites
- Docker and Docker Compose installed
- Git (for cloning)

### Run with Docker
```bash
# Build and start containers
docker compose up --build

# Or run in detached mode
docker compose up --build -d

# Stop containers
docker compose down
```

### Access the Application
- **Frontend**: http://localhost:5173/
- **Backend API**: http://localhost:8001/api/
- **Backend Root**: http://localhost:8001/
- **Django Admin**: http://localhost:8001/admin/

### API Endpoints
- `GET /api/files/` - List all file uploads
- `GET /api/files/?q=search` - Search files by name
- `POST /api/files/upload/` - Upload a file
- `GET /api/files/<id>/download/` - Download a file
- `GET /api/stored-files/` - List all stored files

## Project Structure
```
file-vault-dedup-search/
├── backend/
│   ├── api/              # Django app
│   │   ├── models.py     # Database models
│   │   ├── views.py      # API views
│   │   ├── serializers.py
│   │   └── migrations/   # Database migrations
│   ├── vault/            # Django project settings
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── App.jsx       # Main React component
│   │   ├── api.js        # API client
│   │   └── main.jsx
│   └── package.json
└── docker-compose.yml
```

## Development

### Backend
```bash
cd backend
python manage.py migrate
python manage.py runserver
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```
