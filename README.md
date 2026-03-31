# Tic-Tac-Toe with Nakama Server

A modern, real-time multiplayer Tic-Tac-Toe application built with a React frontend, Vite, and a Heroic Labs Nakama authoritative server backend.

## Features
- **Real-Time Multiplayer Queue**: Jump into quick matches against live opponents using Nakama matchmaking.
- **Computer Mode**: Play instantly against a custom-built AI.
- **Timed Mode**: 30-second turn limits for intense gameplay.
- **Beautiful UI**: Modern, glassmorphic React design using TailwindCSS and Framer Motion.
- **Authoritative Server**: Server-side game validation, leaderboards, and turn timers.

## Prerequisites
- [Docker](https://www.docker.com/) and Docker Compose (to run the Nakama server locally)
- [Node.js](https://nodejs.org/) (v16+ recommended for the frontend)

## Installation and Setup

### 1. Start the Nakama Backend Server
The authoritative game logic is written in TypeScript and executed by Nakama's embedded JavaScript runtime.

1. Navigate to the server folder:
   ```bash
   cd nakama-server
   ```
2. Install server dependencies:
   ```bash
   npm install
   ```
3. Build the TypeScript game modules into the build directory:
   ```bash
   npm run build
   ```
4. Start the Nakama Docker container:
   ```bash
   docker-compose up -d
   ```
*(The Nakama server will now run locally on `localhost:7350`)*

### 2. Start the React Frontend
1. Navigate to the frontend folder:
   ```bash
   cd frontend
   ```
2. Install frontend dependencies:
   ```bash
   npm install
   ```
3. Run the development server:
   ```bash
   npm run dev
   ```
4. Open [http://localhost:5173/](http://localhost:5173/) in your web browser.

## How to Play
You can test the multiplayer by opening two browser windows side-by-side or simply select the **"Play vs Computer"** mode! Have fun!
