@echo off
title Merchant Cash-Flow Decision Intelligence System
echo ======================================================================
echo Starting Merchant Cash-Flow Decision Intelligence System
echo ======================================================================

echo [1/2] Launching FastAPI Backend on http://localhost:8000...
start "FastAPI Backend" cmd /k "py -3.11 -m uvicorn backend.main:app --port 8000 --reload"

timeout /t 2 /nobreak >nul

echo [2/2] Launching Vite React Dashboard on http://localhost:5173...
cd frontend
start "React Dashboard" cmd /k "npm run dev"

timeout /t 3 /nobreak >nul

echo Opening browser at http://localhost:5173...
start http://localhost:5173

echo ======================================================================
echo Both servers are running! Keep this window or the opened terminals open.
echo ======================================================================
pause
