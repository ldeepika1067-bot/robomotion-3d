import { AnimatePresence, motion } from 'framer-motion'
import { Cpu, ShieldAlert, ShieldCheck, Home, RotateCcw } from 'lucide-react'
import { useStore } from './store'
import RobotArm3D from './components/RobotArm3D'
import { EmergencyStop, GripperControls, JointControls, Joystick, ModeToggle, PresetControls, SpeedControl } from './components/Controls'
import { MovementHistory, SystemStatus } from './components/Status'

function Navbar() {
  const eStop = useStore((s) => s.eStop)
  return (
    <header className="flex items-center justify-between border-b border-slate-200 bg-white/90 px-5 py-3 backdrop-blur">
      <div className="flex items-center gap-3">
        <div className="grid h-10 w-10 place-items-center rounded-xl bg-[#0f1f3d] text-white shadow-md"><Cpu size={20} /></div>
        <div>
          <h1 className="text-lg font-bold leading-none tracking-tight">Robo<span className="text-[#1d5bff]">Motion</span> 3D</h1>
          <p className="mt-1 hidden text-xs text-slate-500 sm:block">Interactive Robotic Arm Simulation &amp; Control Platform</p>
        </div>
      </div>
      <div className={`flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold ${eStop ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'}`}>
        {eStop ? <ShieldAlert size={14} /> : <ShieldCheck size={14} />}{eStop ? 'Halted' : 'System online'}
      </div>
    </header>
  )
}

export default function App() {
  const eStop = useStore((s) => s.eStop)
  const goHome = useStore((s) => s.goHome), resetAll = useStore((s) => s.resetAll)
  return (
    <div className="flex h-full flex-col">
      <Navbar />
      <main className="grid min-h-0 flex-1 gap-3 overflow-y-auto p-3 lg:grid-cols-[320px_1fr_300px] lg:overflow-hidden">
        <aside className="flex flex-col gap-3 lg:overflow-y-auto">
          <div className="panel"><EmergencyStop /></div>
          <div className="panel"><ModeToggle /><div className="mt-3"><Joystick /></div></div>
          <div className="panel"><JointControls /></div>
          <div className="panel space-y-4"><SpeedControl /><GripperControls />
            <div className="grid grid-cols-2 gap-2">
              <button className="btn" disabled={eStop} onClick={goHome}><Home size={15} />Home</button>
              <button className="btn" disabled={eStop} onClick={resetAll}><RotateCcw size={15} />Reset</button>
            </div>
          </div>
        </aside>
        <section className="relative min-h-[460px] overflow-hidden rounded-2xl border border-slate-200 shadow-sm">
          <RobotArm3D />
          <PresetControls />
          <AnimatePresence>
            {eStop && (
              <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                className="absolute left-1/2 top-4 -translate-x-1/2 rounded-full bg-red-600 px-5 py-2 text-sm font-bold tracking-wide text-white shadow-lg">
                EMERGENCY STOP ACTIVE
              </motion.div>
            )}
          </AnimatePresence>
        </section>
        <aside className="flex flex-col gap-3 lg:overflow-y-auto"><SystemStatus /><MovementHistory /></aside>
      </main>
    </div>
  )
}
