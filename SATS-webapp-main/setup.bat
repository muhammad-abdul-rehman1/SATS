@echo off
REM SATS Web App Setup Script for Windows
REM This script automates the installation and setup of the SATS web application

setlocal enabledelayedexpansion

echo ==================================================
echo Smart Asset Tracker - Web App Setup
echo ==================================================
echo.

REM Check if Node.js is installed
where node >nul 2>nul
if errorlevel 1 (
    echo Error: Node.js is not installed. Please install Node.js 18+ first.
    exit /b 1
)

for /f "tokens=*" %%i in ('node --version') do set NODE_VERSION=%%i
echo ✓ Node.js version: %NODE_VERSION%
echo.

REM Install dependencies
echo Installing dependencies...
call npm install
if errorlevel 1 (
    echo Error: Failed to install dependencies
    exit /b 1
)

echo.
echo ✓ Dependencies installed successfully
echo.

REM Create .env.local if it doesn't exist
if not exist .env.local (
    echo Creating .env.local file...
    copy .env.local.example .env.local
    echo ✓ .env.local created. Please update the API URL if needed.
) else (
    echo Info: .env.local already exists
)

echo.
echo ==================================================
echo Setup Complete!
echo ==================================================
echo.
echo Next steps:
echo 1. Update API URL in .env.local if needed
echo 2. Run 'npm run dev' to start the development server
echo 3. Open http://localhost:3000 in your browser
echo.
echo Default login credentials:
echo   Email: admin@example.com
echo   Password: password123
echo.
pause
