# Textile Analytics Dashboard

A comprehensive analytics platform for textile business intelligence, featuring customer behavior analysis, ABC/XYZ classification, RFM segmentation, demand forecasting, and more.

## 🚀 Quick Start

### Prerequisites

#### 1. Node.js (v18+) and npm

**Windows:**
```powershell
# Download and install from official website
# Visit: https://nodejs.org/
# Download the LTS version installer (.msi) and run it

# Verify installation
node --version
npm --version
```

**Linux (Ubuntu):**
```bash
# Install Node.js 18.x
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Verify installation
node --version
npm --version
```

#### 2. Python 3.12+

**Windows:**
```powershell
# Download and install from official website
# Visit: https://www.python.org/downloads/
# Download Python 3.12+ installer (.exe) and run it
# IMPORTANT: Check "Add Python to PATH" during installation

# Verify installation
python --version
```

**Linux (Ubuntu):**
```bash
# Add deadsnakes PPA for Python 3.12
sudo apt update
sudo apt install -y software-properties-common
sudo add-apt-repository ppa:deadsnakes/ppa
sudo apt update

# Install Python 3.12
sudo apt install -y python3.12 python3.12-venv python3.12-dev

# Verify installation
python3.12 --version
```

#### 3. uv (Python Package Manager)

**Windows:**
```powershell
# Install using PowerShell
powershell -c "irm https://astral.sh/uv/install.ps1 | iex"

# Verify installation
uv --version
```

**Linux (Ubuntu):**
```bash
# Install using curl
curl -LsSf https://astral.sh/uv/install.sh | sh

# Verify installation
uv --version
```

#### 4. PostgreSQL Database
**Already set up and configured** - no action needed.

### Setup Instructions

#### 1. Backend Setup

**Windows:**
```powershell
# Navigate to backend directory
cd backend

# Install dependencies and create virtual environment
uv sync

# Activate virtual environment
.venv\Scripts\activate

# Configure environment variables
# Edit the existing .env file and add your database credentials:
# DB_HOST=your_database_host
# DB_PORT=5432
# DB_NAME=priya_textile
# DB_USER=your_username
# DB_PASSWORD=your_password

# Run the backend server
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

**Linux (Ubuntu):**
```bash
# Navigate to backend directory
cd backend

# Install dependencies and create virtual environment
uv sync

# Activate virtual environment
source .venv/bin/activate

# Configure environment variables
# Edit the existing .env file and add your database credentials:
# DB_HOST=your_database_host
# DB_PORT=5432
# DB_NAME=priya_textile
# DB_USER=your_username
# DB_PASSWORD=your_password

# Run the backend server
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

**Backend will be available at:** `http://localhost:8000`

#### 2. Frontend Setup

**Windows & Linux:**
```bash
# Navigate to frontend directory
cd frontend

# Install dependencies
npm install

# Start development server
npm run dev
```

**Frontend will be available at:** `http://localhost:5173`

---

## 📁 Project Structure

```
TextileAnalytics/
├── backend/
│   ├── app/
│   │   ├── main.py              # FastAPI application entry point
│   │   ├── database.py          # Database connection & pooling
│   │   ├── schemas.py           # Pydantic models
│   │   ├── auth/                # JWT authentication
│   │   ├── endpoints/           # API route handlers
│   │   └── middleware/          # Logging & request middleware
│   ├── pyproject.toml           # Python dependencies
│   ├── Dockerfile               # Backend container config
│   └── .env                     # Environment variables
│
├── frontend/
│   ├── src/
│   │   ├── main.tsx             # React app entry point
│   │   ├── App.tsx              # Main app component with routing
│   │   ├── api/                 # API client & types
│   │   ├── components/          # Reusable UI components
│   │   ├── contexts/            # React contexts (Auth)
│   │   ├── pages/               # Page components
│   │   ├── layouts/             # Layout components
│   │   ├── services/            # Business logic & API calls
│   │   ├── theme/               # MUI theme configuration
│   │   └── constants/           # App constants
│   ├── package.json             # Node dependencies
│   ├── vite.config.ts           # Vite configuration
│   └── Dockerfile               # Frontend container config
│
├── server/                      # R scripts (legacy analytics)
├── prod/                        # Production data & SQL scripts
├── docker-compose.yml           # Multi-container orchestration
└── README.md                    # This file
```

---

## 🔐 Authentication

Default login credentials:
- **Username:** `kbg`
- **Password:** `kbg`

> ⚠️ **Important:** Change these credentials in production!

---

## 🛠️ Development

### Backend Development

**Windows:**
```powershell
cd backend
.venv\Scripts\activate
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

**Linux:**
```bash
cd backend
source .venv/bin/activate
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### Frontend Development

```bash
cd frontend
npm run dev
```

### Environment Variables

#### Backend `.env`
```env
JWT_SECRET_KEY=your_secret_key_here
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=60

# Database is already configured
# No need to modify DB settings
```

#### Frontend (optional)
Create `.env` in frontend directory if needed:
```env
VITE_API_BASE_URL=http://localhost:8000
```

---

## 🔧 Troubleshooting

### Backend Issues

**Port 8000 already in use:**

*Windows:*
```powershell
# Find process using port 8000
netstat -ano | findstr :8000
# Kill the process (replace PID with actual process ID)
taskkill /PID <PID> /F
```

*Linux:*
```bash
# Find and kill process using port 8000
lsof -ti:8000 | xargs kill -9
```

**Module not found errors:**

*Windows:*
```powershell
# Ensure virtual environment is activated
.venv\Scripts\activate
# Reinstall dependencies
uv pip install -e .
```

*Linux:*
```bash
# Ensure virtual environment is activated
source .venv/bin/activate
# Reinstall dependencies
uv pip install -e .
```

### Frontend Issues

**Port 5173 already in use:**

*Windows:*
```powershell
# Find process using port 5173
netstat -ano | findstr :5173
# Kill the process (replace PID with actual process ID)
taskkill /PID <PID> /F
```

*Linux:*
```bash
# Kill process on port 5173
lsof -ti:5173 | xargs kill -9
```

**Dependency conflicts:**

*Windows:*
```powershell
# Clear node_modules and reinstall
Remove-Item -Recurse -Force node_modules, package-lock.json
npm install
```

*Linux:*
```bash
# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
```

---

## 📦 Production Build

### Frontend Production Build
```bash
cd frontend
npm run build
# Artifacts will be in dist/ directory

# Serve production build locally
npm run serve
```

### Backend Production
```bash
cd backend
# Use production ASGI server
gunicorn app.main:app -w 4 -k uvicorn.workers.UvicornWorker
```

---

## 👥 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📄 License

This project is proprietary software. All rights reserved.

---

## 📞 Support

For issues or questions, please contact the development team.

---

## 🔄 Updates & Maintenance

- Database is already configured and populated
- Ensure all dependencies are up to date before deployment
- Regular backups of PostgreSQL database recommended
- Monitor application logs for errors and performance issues
