import { useRef } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { Environment, Grid, Lightformer, OrbitControls } from '@react-three/drei'
import * as THREE from 'three'
import { Camera, LayoutGrid } from 'lucide-react'
import { useStore } from '../store'

const MAT = { silver: ['#cfd6e0', 0.9, 0.22], navy: ['#14274e', 0.6, 0.35], blue: ['#2f6bff', 0.5, 0.3] } as const
type M = keyof typeof MAT
type V3 = [number, number, number]
const Mat = ({ m }: { m: M }) => <meshStandardMaterial color={MAT[m][0]} metalness={MAT[m][1]} roughness={MAT[m][2]} />
const Box = ({ s, p = [0, 0, 0], m }: { s: V3; p?: V3; m: M }) => (<mesh position={p} castShadow><boxGeometry args={s} /><Mat m={m} /></mesh>)
// Cylinder: axis along Y by default; `z` lays it along Z (used for hinge joints that rotate about Z).
const Cyl = ({ r, h, p = [0, 0, 0], m, z }: { r: number; h: number; p?: V3; m: M; z?: boolean }) => (
  <mesh position={p} rotation={z ? [Math.PI / 2, 0, 0] : [0, 0, 0]} castShadow><cylinderGeometry args={[r, r, h, 40]} /><Mat m={m} /></mesh>
)
const rad = (d: number) => (d * Math.PI) / 180

/**
 * Hierarchy (each child inherits every parent transform, so moving a joint moves everything after it):
 * base(yaw) → shoulder(pitch) → elbow(pitch) → wristPitch → wristRoll → fingers
 * Every group's ORIGIN is its joint pivot; links are offset along +Y so they swing about the pivot.
 */
function Arm() {
  const base = useRef<THREE.Group>(null), sh = useRef<THREE.Group>(null), el = useRef<THREE.Group>(null)
  const wp = useRef<THREE.Group>(null), wr = useRef<THREE.Group>(null)
  const f1 = useRef<THREE.Group>(null), f2 = useRef<THREE.Group>(null)

  useFrame((_, dt) => {
    useStore.getState().tick(Math.min(dt, 0.05)) // advance the simulation
    const { current: a, gripCur } = useStore.getState()
    base.current!.rotation.y = rad(a[0])   // yaw about vertical axis
    sh.current!.rotation.z = -rad(a[1])    // negative Z-rotation tips +Y toward +X (forward)
    el.current!.rotation.z = -rad(a[2])
    wp.current!.rotation.z = -rad(a[3])
    wr.current!.rotation.y = rad(a[4])     // roll about the tool's own axis
    const gap = 0.07 + 0.14 * gripCur      // symmetric fingers: equal and opposite X offsets
    f1.current!.position.x = gap; f2.current!.position.x = -gap
  })

  return (
    <group>
      <Cyl r={0.9} h={0.2} p={[0, 0.1, 0]} m="navy" /><Cyl r={0.92} h={0.04} p={[0, 0.2, 0]} m="blue" />
      <group ref={base} position={[0, 0.2, 0]}>
        <Cyl r={0.6} h={0.3} p={[0, 0.15, 0]} m="silver" /><Cyl r={0.62} h={0.04} p={[0, 0.32, 0]} m="blue" />
        <group ref={sh} position={[0, 0.6, 0]}>
          <Cyl r={0.3} h={0.7} m="silver" z /><Cyl r={0.2} h={0.78} m="blue" z />
          <Box s={[0.34, 1.6, 0.36]} p={[0, 0.8, 0]} m="silver" /><Box s={[0.36, 1.2, 0.1]} p={[0, 0.8, 0]} m="navy" />
          <group ref={el} position={[0, 1.6, 0]}>
            <Cyl r={0.25} h={0.5} m="navy" z /><Cyl r={0.15} h={0.56} m="blue" z />
            <Box s={[0.28, 1.4, 0.3]} p={[0, 0.7, 0]} m="navy" /><Box s={[0.3, 0.9, 0.08]} p={[0, 0.7, 0]} m="silver" />
            <group ref={wp} position={[0, 1.4, 0]}>
              <Cyl r={0.17} h={0.36} m="blue" z /><Cyl r={0.12} h={0.3} p={[0, 0.15, 0]} m="silver" />
              <group ref={wr} position={[0, 0.3, 0]}>
                <Cyl r={0.17} h={0.08} p={[0, 0.04, 0]} m="navy" /><Box s={[0.44, 0.14, 0.2]} p={[0, 0.15, 0]} m="silver" />
                <group ref={f1} position={[0.21, 0.22, 0]}><Box s={[0.06, 0.34, 0.14]} p={[0, 0.17, 0]} m="blue" /></group>
                <group ref={f2} position={[-0.21, 0.22, 0]}><Box s={[0.06, 0.34, 0.14]} p={[0, 0.17, 0]} m="blue" /></group>
              </group>
            </group>
          </group>
        </group>
      </group>
    </group>
  )
}

const DEFAULT_CAM = new THREE.Vector3(5.5, 4, 6.5), TOP_CAM = new THREE.Vector3(0, 11, 0.01)
function CameraRig({ goal }: { goal: React.MutableRefObject<THREE.Vector3 | null> }) {
  useFrame((s) => { // glide camera to the requested view
    if (!goal.current) return
    s.camera.position.lerp(goal.current, 0.12)
    if (s.camera.position.distanceTo(goal.current) < 0.02) goal.current = null
  })
  return null
}

export default function RobotArm3D() {
  const goal = useRef<THREE.Vector3 | null>(null)
  const ctrl = useRef<{ target: THREE.Vector3 } | null>(null)
  const view = (v: THREE.Vector3) => { goal.current = v.clone(); ctrl.current?.target.set(1, 1.4, 0) }
  return (
    <div className="relative h-full w-full bg-gradient-to-b from-[#f7f9fd] to-[#dfe7f5]">
      <Canvas shadows camera={{ position: DEFAULT_CAM.toArray(), fov: 38 }}>
        <fog attach="fog" args={['#e6ecf7', 14, 30]} />
        <ambientLight intensity={0.5} />
        <directionalLight position={[5, 8, 4]} intensity={1.6} castShadow shadow-mapSize={[2048, 2048]}
          shadow-camera-left={-6} shadow-camera-right={6} shadow-camera-top={6} shadow-camera-bottom={-6} />
        <Environment resolution={256}>
          <Lightformer form="rect" intensity={4} position={[0, 6, 0]} rotation-x={Math.PI / 2} scale={[12, 12, 1]} />
          <Lightformer form="rect" intensity={2} position={[-6, 2, 3]} scale={[6, 4, 1]} />
          <Lightformer form="rect" intensity={2} position={[6, 1, -3]} rotation-y={-Math.PI / 2} scale={[6, 4, 1]} />
        </Environment>
        <Arm />
        <mesh rotation-x={-Math.PI / 2} receiveShadow><planeGeometry args={[40, 40]} /><shadowMaterial opacity={0.22} /></mesh>
        <Grid position={[0, 0.002, 0]} infiniteGrid cellSize={0.5} sectionSize={2.5} cellColor="#c3d0e6" sectionColor="#6f98e8" fadeDistance={22} />
        <OrbitControls ref={ctrl as never} makeDefault target={[1, 1.4, 0]} minDistance={3} maxDistance={16} maxPolarAngle={Math.PI / 2.02} />
        <CameraRig goal={goal} />
      </Canvas>
      <div className="absolute right-3 top-3 flex gap-2">
        <button className="btn" onClick={() => view(DEFAULT_CAM)}><Camera size={15} />Reset view</button>
        <button className="btn" onClick={() => view(TOP_CAM)}><LayoutGrid size={15} />Top view</button>
      </div>
    </div>
  )
}
