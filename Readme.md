# 💧 Water Forecast System

The **Water Forecast System** is a full-stack application that monitors, predicts, and visualizes water usage across facilities.  
It combines IoT-based sensor data, leak detection, and AI-powered forecasting into a single platform.

---

## 🚀 Tech Stack
- **Frontend (Client)**: React.js, TypeScript, Tailwind CSS, Recharts  
- **Backend (Server)**: Node.js, Express.js, Sequelize/Prisma, PostgreSQL/MySQL  
- **Deployment**: Docker, Kubernetes, AWS (EKS, S3, API Gateway, Lambda)  
- **Authentication**: JWT-based  

---

## 📂 Project Structure
```
project-root/
├── client/   # React frontend
│   ├── src/
│   └── package.json
├── server/   # Node.js backend
│   ├── src/
│   └── package.json
└── README.md # This file
```

---

## ⚙️ Setup Instructions

### 1️⃣ Clone the Repository
```bash
git clone https://github.com/your-username/water-forecast.git
cd water-forecast
```

### 2️⃣ Install Dependencies
- **Client**
```bash
cd client
npm install
```

- **Server**
```bash
cd server
npm install
```

### 3️⃣ Configure Environment Variables
- **Client** → `client/.env`
```
REACT_APP_API_URL=http://localhost:5000/api
```

- **Server** → `server/.env`
```
PORT=5000
DB_HOST=localhost
DB_PORT=5432
DB_NAME=water_forecast
DB_USER=postgres
DB_PASS=yourpassword
JWT_SECRET=supersecretkey
```

### 4️⃣ Run the Project
- Start backend (server):
```bash
cd server
npm run dev
```

- Start frontend (client):
```bash
cd client
npm start
```

- Open **http://localhost:3000** in your browser 🚀

---

## 📡 API Documentation

### 🔑 Authentication
- **POST** `/api/auth/login` → User login, returns JWT  
- **POST** `/api/auth/register` → Register new user  

### 💧 Water Data
- **GET** `/api/water/usage` → Get current usage  
- **GET** `/api/water/forecast` → Get forecasted usage  
- **POST** `/api/water/log` → Insert new sensor log  

### 🚨 Leak Detection
- **GET** `/api/leak/status` → Get leak detection alerts  

### 🏢 Buildings & Sensors
- **GET** `/api/buildings` → List all buildings  
- **GET** `/api/buildings/:id/sensors` → Get sensors for a building  

---

## 🧪 Testing
- **Client**:
```bash
cd client
npm test
```

- **Server**:
```bash
cd server
npm test
```

---

## 📦 Deployment
- **Frontend**: Deploy via Netlify, Vercel, or AWS Amplify / S3  
- **Backend**: Deploy via Docker, AWS ECS/EKS, or Heroku  
- **CI/CD**: GitHub Actions / ArgoCD / Jenkins  

---

## 👥 Contributors
- **Kanishka sharma**  
- Additional team members (add here)

---

## 📜 License
MIT License – feel free to use, modify, and distribute this project.