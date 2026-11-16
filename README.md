# RoboMotion 3D
Interactive Robotic Arm Simulation & Control Platform (React + TypeScript + Vite + Tailwind + React Three Fiber + Drei + Framer Motion + Lucide + Zustand).

## Run locally
```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # type-check + production build in dist/
```

## Structure
- `src/store.ts` – single source of truth (joint targets/current, speed, gripper, E-stop, mode, history) and the per-frame `tick()` simulation.
- `src/components/RobotArm3D.tsx` – procedural arm (hierarchical groups), lighting, grid, camera views.
- `src/components/Controls.tsx` – Joystick, JointControls, SpeedControl, GripperControls, EmergencyStop, PresetControls, ModeToggle.
- `src/components/Status.tsx` – SystemStatus, MovementHistory.

## Upload to GitHub
```bash
git init && git add . && git commit -m "RoboMotion 3D"
git branch -M main
git remote add origin https://github.com/<you>/robomotion-3d.git
git push -u origin main
```

## Deploy
**Vercel:** import the GitHub repo → framework *Vite* (auto-detected) → Deploy. Or `npx vercel`.
**Netlify:** New site from Git → build command `npm run build`, publish directory `dist`. Or `npx netlify deploy --prod --dir=dist`.
