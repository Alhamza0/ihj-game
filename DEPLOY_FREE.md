# Deploy (Free) - Vercel + Render

This setup keeps Socket.IO on a persistent Node server (Render) and hosts the Vite client on Vercel.

## 1) Push repository to GitHub

If not already pushed, create a GitHub repo and push this project.

## 2) Deploy backend on Render (Free)

1. Open Render dashboard.
2. Create: New + > Blueprint.
3. Select this repository.
4. Render will detect `render.yaml` and create a web service.
5. Wait for deploy, then copy the service URL, for example:
   https://ihj-game-server.onrender.com
6. Verify health endpoint:
   https://ihj-game-server.onrender.com/health

## 3) Deploy frontend on Vercel (Free)

1. Open Vercel dashboard.
2. Import the same repository.
3. Keep project root as repository root.
4. Vercel will read `vercel.json`.
5. Add Environment Variable:
   - Name: VITE_SERVER_URL
   - Value: your Render URL (example: https://ihj-game-server.onrender.com)
6. Deploy.

## 4) Optional CORS hardening

Current server config allows all origins (`CLIENT_ORIGIN=*`) for easier testing.
After first successful test, set `CLIENT_ORIGIN` in Render to your Vercel domain.

## 5) Known free-tier behavior

- Render free web services may sleep after inactivity.
- First request after sleep can take some seconds.
