@echo off
title RunwayIQ - Merchant Cashflow Intelligence
echo Starting Backend and Frontend...

start "Backend Server" cmd /k "py -3.11 -m uvicorn backend.main:app --port 8000 --reload"
timeout /t 2 /nobreak >nul

cd frontend
start "Frontend Dashboard" cmd /k "npm run dev"
timeout /t 2 /nobreak >nul

start http://localhost:5173
echo Application launched! http://localhost:5173
