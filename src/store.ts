// Centralised state (Zustand). Every UI control and the 3D model read/write THIS store,
// so they can never drift out of sync. Angles are in degrees; the 3D scene converts to radians.
import { create } from 'zustand'

export const JOINTS = [
  { key: 'base', label: 'Base', min: -180, max: 180 },
  { key: 'shoulder', label: 'Shoulder', min: -90, max: 90 },
  { key: 'elbow', label: 'Elbow', min: 0, max: 135 },
  { key: 'pitch', label: 'Wrist Pitch', min: -90, max: 90 },
  { key: 'roll', label: 'Wrist Rotation', min: -180, max: 180 },
] as const

export const HOME = [0, 0, 90, 0, 0] // upper arm vertical, forearm horizontal
export const PRESETS = {
  pick: { label: 'Pick', angles: [0, 50, 60, 70, 0], grip: 1 as number | undefined },
  place: { label: 'Place', angles: [120, 40, 70, 70, 0], grip: 1 as number | undefined },
  inspect: { label: 'Inspect', angles: [-45, 20, 100, -20, 90], grip: undefined as number | undefined },
}
export type PresetKey = keyof typeof PRESETS
export type Mode = 'manual' | 'joystick'
interface Entry { id: number; time: string; text: string }

interface S {
  current: number[]; target: number[]   // current = what the 3D arm shows, target = where it is heading
  gripCur: number; gripTarget: number   // 0 = closed, 1 = fully open
  speed: number; eStop: boolean; mode: Mode
  joy: { x: number; y: number }; moving: boolean; history: Entry[]
  log: (t: string) => void
  setJoint: (i: number, v: number) => void
  commitJoint: (i: number) => void
  resetJoint: (i: number) => void
  setSpeed: (v: number) => void
  setGrip: (open: boolean) => void
  setMode: (m: Mode) => void
  setJoy: (x: number, y: number) => void
  goHome: () => void
  resetAll: () => void
  preset: (k: PresetKey) => void
  estop: () => void
  resetSafety: () => void
  tick: (dt: number) => void
}

const clampJoint = (i: number, v: number) => Math.min(JOINTS[i].max, Math.max(JOINTS[i].min, v))

export const useStore = create<S>()((set, get) => {
  let id = 0
  const log = (text: string) =>
    set((s) => ({ history: [{ id: ++id, time: new Date().toLocaleTimeString(), text }, ...s.history].slice(0, 14) }))
  // Emergency-stop gate: every movement command passes through here first.
  const blocked = (what?: string) => {
    if (!get().eStop) return false
    if (what) log(`${what} blocked: emergency stop active`)
    return true
  }
  const withTarget = (i: number, v: number) => get().target.map((t, j) => (j === i ? clampJoint(i, v) : t))

  return {
    current: [...HOME], target: [...HOME], gripCur: 1, gripTarget: 1,
    speed: 1, eStop: false, mode: 'manual', joy: { x: 0, y: 0 }, moving: false, history: [],
    log,
    setJoint: (i, v) => { if (!blocked()) set({ target: withTarget(i, v) }) },
    commitJoint: (i) => log(`${JOINTS[i].label} set to ${Math.round(get().target[i])}°`),
    resetJoint: (i) => { if (blocked(`Reset ${JOINTS[i].label}`)) return; set({ target: withTarget(i, HOME[i]) }); log(`${JOINTS[i].label} reset to ${HOME[i]}°`) },
    setSpeed: (v) => set({ speed: v }),
    setGrip: (open) => {
      if (blocked(open ? 'Open gripper' : 'Close gripper')) return
      set({ gripTarget: open ? 1 : 0 }); log(open ? 'Gripper opening' : 'Gripper closing')
    },
    setMode: (m) => { set({ mode: m, joy: { x: 0, y: 0 } }); log(`${m === 'manual' ? 'Manual' : 'Joystick'} mode selected`) },
    setJoy: (x, y) => { if (!blocked()) set({ joy: { x, y } }) },
    goHome: () => { if (blocked('Home')) return; set({ target: [...HOME] }); log('Returning to home position') },
    resetAll: () => {
      if (blocked('Reset')) return
      set({ target: [...HOME], gripTarget: 1, speed: 1, mode: 'manual', joy: { x: 0, y: 0 } }); log('Reset to default configuration')
    },
    preset: (k) => {
      const p = PRESETS[k]; if (blocked(`${p.label} preset`)) return
      set((s) => ({ target: [...p.angles], gripTarget: p.grip ?? s.gripTarget })); log(`${p.label} preset started`)
    },
    // E-stop: target := current freezes every joint where it is; joystick zeroed; further commands blocked.
    estop: () => {
      set((s) => ({ eStop: true, target: [...s.current], gripTarget: s.gripCur, joy: { x: 0, y: 0 }, moving: false }))
      log('EMERGENCY STOP activated')
    },
    // Reset only clears the flag. Targets already equal current, so the arm does NOT move.
    resetSafety: () => { set({ eStop: false }); log('Safety reset: movement enabled') },

    // Called every frame from the 3D scene. dt in seconds.
    tick: (dt) => {
      const s = get(); if (s.eStop) return
      let target = s.target
      // Joystick mode: stick deflection = angular velocity of base / shoulder (deg/s, scaled by speed).
      if (s.mode === 'joystick' && (s.joy.x || s.joy.y)) {
        target = [...target]
        target[0] = clampJoint(0, target[0] + s.joy.x * 90 * s.speed * dt)
        target[1] = clampJoint(1, target[1] + s.joy.y * 60 * s.speed * dt)
      }
      // Exponential smoothing: each frame close a fraction k of the remaining gap. Higher speed → bigger k.
      const k = 1 - Math.exp(-dt * 3 * s.speed)
      let moving = !!(s.joy.x || s.joy.y)
      const current = s.current.map((c, i) => {
        const d = target[i] - c
        if (Math.abs(d) < 0.05) return target[i]
        moving = true; return c + d * k
      })
      const gd = s.gripTarget - s.gripCur
      let gripCur = s.gripTarget
      if (Math.abs(gd) > 0.002) { moving = true; gripCur = s.gripCur + gd * Math.min(1, k * 1.5) }
      const changed = target !== s.target || gripCur !== s.gripCur || current.some((v, i) => v !== s.current[i])
      if (changed || moving !== s.moving) set({ current, target, gripCur, moving })
    },
  }
})
