import { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { Download, Upload, Eye, RotateCcw, ShieldAlert, ShieldCheck, Hand, Grab, Gamepad2, SlidersHorizontal } from 'lucide-react'
import { useStore, JOINTS, PRESETS, type PresetKey } from '../store'

export function ModeToggle() {
  const mode = useStore((s) => s.mode), setMode = useStore((s) => s.setMode)
  const opts = [['manual', 'Manual', SlidersHorizontal], ['joystick', 'Joystick', Gamepad2]] as const
  return (
    <div className="relative grid grid-cols-2 rounded-xl bg-slate-100 p-1 text-sm font-medium">
      <motion.div layout transition={{ type: 'spring', stiffness: 500, damping: 35 }}
        className={`absolute inset-y-1 w-[calc(50%-4px)] rounded-lg bg-white shadow ${mode === 'manual' ? 'left-1' : 'left-[calc(50%+2px)]'}`} />
      {opts.map(([m, label, Icon]) => (
        <button key={m} onClick={() => setMode(m)} className={`relative z-10 flex items-center justify-center gap-1.5 py-2 ${mode === m ? 'text-[#1d5bff]' : 'text-slate-500'}`}>
          <Icon size={15} />{label}
        </button>
      ))}
    </div>
  )
}

/** Circular joystick: x → base rotation, y → shoulder. Pointer events cover mouse + touch. */
export function Joystick() {
  const mode = useStore((s) => s.mode), eStop = useStore((s) => s.eStop)
  const setJoy = useStore((s) => s.setJoy), log = useStore((s) => s.log)
  const pad = useRef<HTMLDivElement>(null), active = useRef(false)
  const [pos, setPos] = useState({ x: 0, y: 0 })
  const [drag, setDrag] = useState(false)
  const R = 52 // max thumb travel in px
  const disabled = eStop || mode !== 'joystick'

  const release = () => {
    if (!active.current) return
    active.current = false; setDrag(false); setPos({ x: 0, y: 0 }); setJoy(0, 0) // spring back to neutral
    const t = useStore.getState().target
    log(`Joystick released: base ${Math.round(t[0])}°, shoulder ${Math.round(t[1])}°`)
  }
  useEffect(() => { if (disabled && active.current) release() }, [disabled]) // eslint-disable-line

  const move = (e: React.PointerEvent) => {
    if (!active.current) return
    const r = pad.current!.getBoundingClientRect()
    let dx = e.clientX - (r.left + r.width / 2), dy = e.clientY - (r.top + r.height / 2)
    const m = Math.hypot(dx, dy); if (m > R) { dx *= R / m; dy *= R / m }
    setPos({ x: dx, y: dy }); setJoy(dx / R, -dy / R) // screen-up is negative y, so flip it
  }
  return (
    <div className="flex flex-col items-center gap-2">
      <div ref={pad} onPointerDown={(e) => { if (disabled) return; active.current = true; setDrag(true); e.currentTarget.setPointerCapture(e.pointerId); move(e) }}
        onPointerMove={move} onPointerUp={release} onPointerCancel={release}
        className={`relative h-40 w-40 touch-none select-none rounded-full border border-slate-200 bg-gradient-to-b from-slate-50 to-slate-200 shadow-inner ${disabled ? 'opacity-50' : 'cursor-grab'}`}>
        <div className="absolute left-1/2 top-3 h-[calc(100%-24px)] w-px bg-slate-300" />
        <div className="absolute left-3 top-1/2 h-px w-[calc(100%-24px)] bg-slate-300" />
        <div style={{ transform: `translate(calc(-50% + ${pos.x}px), calc(-50% + ${pos.y}px))` }}
          className={`absolute left-1/2 top-1/2 h-14 w-14 rounded-full bg-gradient-to-b from-[#3b7bff] to-[#0f3fc4] shadow-lg shadow-blue-500/40 ${drag ? '' : 'transition-transform duration-200'}`} />
      </div>
      <p className="text-xs text-slate-500">{mode === 'joystick' ? (eStop ? 'Locked by emergency stop' : '← → base   ↑ ↓ shoulder') : 'Switch to Joystick mode to use'}</p>
    </div>
  )
}

export function JointControls() {
  const current = useStore((s) => s.current), target = useStore((s) => s.target)
  const mode = useStore((s) => s.mode), eStop = useStore((s) => s.eStop)
  const { setJoint, commitJoint, resetJoint } = useStore.getState()
  return (
    <div>
      <div className="h"><SlidersHorizontal size={16} className="text-[#1d5bff]" />Joint controls</div>
      <div className="space-y-3">
        {JOINTS.map((j, i) => {
          const off = eStop || (mode === 'joystick' && i < 2) // joystick owns base + shoulder in joystick mode
          return (
            <div key={j.key}>
              <div className="mb-1 flex items-center justify-between text-xs">
                <span className="font-medium text-slate-600">{j.label}</span>
                <span className="flex items-center gap-2">
                  <span className="mono rounded bg-slate-100 px-1.5 py-0.5 text-[#0f1f3d]">{current[i].toFixed(0)}°</span>
                  <button title={`Reset ${j.label}`} disabled={eStop} onClick={() => resetJoint(i)} className="text-slate-400 hover:text-blue-600 disabled:opacity-40"><RotateCcw size={13} /></button>
                </span>
              </div>
              <input type="range" min={j.min} max={j.max} step={1} value={target[i]} disabled={off}
                onChange={(e) => setJoint(i, +e.target.value)} onPointerUp={() => !off && commitJoint(i)} onKeyUp={() => !off && commitJoint(i)} />
            </div>
          )
        })}
      </div>
    </div>
  )
}

export function SpeedControl() {
  const speed = useStore((s) => s.speed), setSpeed = useStore((s) => s.setSpeed), log = useStore((s) => s.log)
  return (
    <div>
      <div className="h justify-between"><span>Speed</span><span className="mono text-[#1d5bff]">{speed.toFixed(2)}×</span></div>
      <input type="range" min={0.25} max={2} step={0.05} value={speed} onChange={(e) => setSpeed(+e.target.value)} onPointerUp={() => log(`Speed set to ${speed.toFixed(2)}×`)} />
      <div className="mt-1 flex justify-between text-[11px] text-slate-500"><span>Min 0.25×</span><span>Normal 1×</span><span>Max 2×</span></div>
    </div>
  )
}

export function GripperControls() {
  const g = useStore((s) => s.gripCur), eStop = useStore((s) => s.eStop), setGrip = useStore((s) => s.setGrip)
  return (
    <div>
      <div className="h justify-between"><span>Gripper</span><span className="mono text-[#1d5bff]">{Math.round(g * 100)}%</span></div>
      <div className="mb-2 h-1.5 overflow-hidden rounded-full bg-slate-200"><div className="h-full bg-[#1d5bff]" style={{ width: `${g * 100}%` }} /></div>
      <div className="grid grid-cols-2 gap-2">
        <button className="btn" disabled={eStop} onClick={() => setGrip(true)}><Hand size={15} />Open</button>
        <button className="btn" disabled={eStop} onClick={() => setGrip(false)}><Grab size={15} />Close</button>
      </div>
    </div>
  )
}

export function EmergencyStop() {
  const eStop = useStore((s) => s.eStop), estop = useStore((s) => s.estop), reset = useStore((s) => s.resetSafety)
  return (
    <div className="space-y-2">
      <button onClick={estop} disabled={eStop}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-b from-red-500 to-red-700 py-3.5 text-sm font-bold tracking-wide text-white shadow-lg shadow-red-500/30 transition active:scale-95 disabled:opacity-60">
        <ShieldAlert size={18} />EMERGENCY STOP
      </button>
      <button onClick={reset} disabled={!eStop} className="btn w-full"><ShieldCheck size={15} />Reset safety</button>
    </div>
  )
}

const presetIcons = { pick: Download, place: Upload, inspect: Eye }
export function PresetControls() {
  const eStop = useStore((s) => s.eStop), preset = useStore((s) => s.preset)
  return (
    <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-2 rounded-2xl border border-slate-200 bg-white/90 p-2 shadow-lg backdrop-blur">
      {(Object.keys(PRESETS) as PresetKey[]).map((k) => { const I = presetIcons[k]; return (
        <button key={k} className="btn" disabled={eStop} onClick={() => preset(k)}><I size={15} />{PRESETS[k].label}</button>
      )})}
    </div>
  )
}
