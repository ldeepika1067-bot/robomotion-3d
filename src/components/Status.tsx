import { AnimatePresence, motion } from 'framer-motion'
import { Activity, History } from 'lucide-react'
import { useStore, JOINTS } from '../store'

const Row = ({ k, v, tone }: { k: string; v: string; tone?: string }) => (
  <div className="flex items-center justify-between py-1.5 text-sm"><span className="text-slate-500">{k}</span><span className={`mono text-xs ${tone ?? 'text-[#0f1f3d]'}`}>{v}</span></div>
)

export function SystemStatus() {
  const { current, speed, gripCur, gripTarget, eStop, mode, moving } = useStore()
  const gd = gripTarget - gripCur
  const grip = Math.abs(gd) > 0.01 ? (gd > 0 ? 'Opening' : 'Closing') : gripCur > 0.98 ? 'Open' : gripCur < 0.02 ? 'Closed' : 'Partial'
  return (
    <div className="panel">
      <div className="h"><Activity size={16} className="text-[#1d5bff]" />Live status</div>
      {JOINTS.map((j, i) => (
        <div key={j.key} className="py-1">
          <div className="flex justify-between text-xs"><span className="text-slate-500">{j.label}</span><span className="mono">{current[i].toFixed(1)}°</span></div>
          <div className="mt-1 h-1 rounded-full bg-slate-200"><div className="h-full rounded-full bg-[#1d5bff]" style={{ width: `${((current[i] - j.min) / (j.max - j.min)) * 100}%` }} /></div>
        </div>
      ))}
      <div className="mt-2 divide-y divide-slate-100 border-t border-slate-100">
        <Row k="Speed" v={`${speed.toFixed(2)}×`} />
        <Row k="Gripper" v={`${grip} · ${Math.round(gripCur * 100)}%`} />
        <Row k="Movement" v={eStop ? 'Halted' : moving ? 'Moving' : 'Idle'} tone={moving && !eStop ? 'text-[#1d5bff]' : undefined} />
        <Row k="Control mode" v={mode === 'manual' ? 'Manual' : 'Joystick'} />
        <Row k="System" v={eStop ? 'Stopped' : 'Operational'} tone={eStop ? 'text-red-600' : 'text-emerald-600'} />
        <Row k="E-stop" v={eStop ? 'ACTIVE' : 'Clear'} tone={eStop ? 'text-red-600' : 'text-emerald-600'} />
      </div>
    </div>
  )
}

export function MovementHistory() {
  const history = useStore((s) => s.history)
  return (
    <div className="panel min-h-[160px] flex-1">
      <div className="h"><History size={16} className="text-[#1d5bff]" />Recent actions</div>
      {history.length === 0 && <p className="text-xs text-slate-400">Move a joint, use the joystick, or run a preset. Your actions will appear here.</p>}
      <ul className="space-y-1.5">
        <AnimatePresence initial={false}>
          {history.map((h) => (
            <motion.li key={h.id} layout initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} className="flex gap-2 text-xs">
              <span className="mono shrink-0 text-slate-400">{h.time}</span><span>{h.text}</span>
            </motion.li>
          ))}
        </AnimatePresence>
      </ul>
    </div>
  )
}
