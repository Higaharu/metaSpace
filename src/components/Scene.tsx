import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Box, Sphere, Cylinder, Icosahedron, useGLTF } from '@react-three/drei'
import * as THREE from 'three'
import { create } from 'zustand'

// ボールの状態を管理するストア
interface BallState {
  position: [number, number, number]
  velocity: [number, number, number]
  avatarPosition?: [number, number, number] // アバターの位置を追加
  setPosition: (position: [number, number, number]) => void
  setVelocity: (velocity: [number, number, number]) => void
  setAvatarPosition: (position: [number, number, number]) => void // アバターの位置を設定する関数を追加
  kickBall: (direction: [number, number, number], force: number) => void
}

export const useBallStore = create<BallState>((set) => ({
  position: [0, 0.5, 3], // 初期位置を地面に近づける（高さを0.5に）
  velocity: [0, 0, 0],
  avatarPosition: [0, 0, 5], // アバターの初期位置
  setPosition: (position) => set({ position }),
  setVelocity: (velocity) => set({ velocity }),
  setAvatarPosition: (position) => set({ avatarPosition: position }), // アバターの位置を設定する関数
  kickBall: (direction, force) => {
    set((state) => ({
      velocity: [
        direction[0] * force,
        direction[1] * force + 0.1, // 少し上向きの力を加える
        direction[2] * force
      ]
    }))
  }
}))

// シーン内の静的オブジェクトの位置と大きさ（衝突判定用）
const STATIC_OBJECTS = [
  // 周囲の立方体
  { position: [-3, 0.5, -3] as [number, number, number], size: [1, 1, 1] as [number, number, number] },
  { position: [3, 0.5, -3] as [number, number, number], size: [1, 1, 1] as [number, number, number] },
  { position: [-3, 0.5, 3] as [number, number, number], size: [1, 1, 1] as [number, number, number] },
  { position: [3, 0.5, 3] as [number, number, number], size: [1, 1, 1] as [number, number, number] },
  // 大きなオブジェクト
  { position: [-5, 1, 0] as [number, number, number], size: [1, 2, 3] as [number, number, number] },
  { position: [5, 1, 0] as [number, number, number], size: [1, 2, 3] as [number, number, number] },
  // 建物
  { position: [-7, 1.5, -7] as [number, number, number], size: [4, 3, 4] as [number, number, number] },
  // 木
  { position: [7, 1, -7] as [number, number, number], size: [1.5, 4, 1.5] as [number, number, number] },
  { position: [7, 1, 7] as [number, number, number], size: [1.5, 4, 1.5] as [number, number, number] },
  { position: [-7, 1, 7] as [number, number, number], size: [1.5, 4, 1.5] as [number, number, number] },
]

interface ModelProps {
  url: string
  position: [number, number, number]
  scale?: number
  rotation?: [number, number, number]
}

// GLTFモデルを使用したサッカーボールコンポーネント
const SoccerBall = ({ position }: { position: [number, number, number] }) => {
  const ballRef = useRef<THREE.Group>(null)
  const { scene } = useGLTF('/models/high_quality_soccer_ball_model/scene.gltf')
  
  // ボールの状態を取得
  const ballPosition = useBallStore((state) => state.position)
  const ballVelocity = useBallStore((state) => state.velocity)
  const setPosition = useBallStore((state) => state.setPosition)
  const setVelocity = useBallStore((state) => state.setVelocity)
  
  // オブジェクトとの衝突判定
  const checkObjectCollision = (pos: [number, number, number], vel: [number, number, number]): [boolean, [number, number, number], [number, number, number]] => {
    const ballRadius = 0.5 * 0.5 // スケールを考慮したボールの半径
    
    // 静的オブジェクトとの衝突判定
    for (const obj of STATIC_OBJECTS) {
      const objHalfWidth = obj.size[0] / 2
      const objHalfHeight = obj.size[1] / 2
      const objHalfDepth = obj.size[2] / 2
      
      // ボールとオブジェクトの距離を計算
      const dx = pos[0] - obj.position[0]
      const dy = pos[1] - obj.position[1]
      const dz = pos[2] - obj.position[2]
      
      // 衝突判定（簡易的な方法）
      if (
        Math.abs(dx) < objHalfWidth + ballRadius &&
        Math.abs(dy) < objHalfHeight + ballRadius &&
        Math.abs(dz) < objHalfDepth + ballRadius
      ) {
        // 衝突方向を特定
        const overlapX = objHalfWidth + ballRadius - Math.abs(dx)
        const overlapY = objHalfHeight + ballRadius - Math.abs(dy)
        const overlapZ = objHalfDepth + ballRadius - Math.abs(dz)
        
        // 最も小さいオーバーラップを見つけて、その方向に押し出す
        let newPos = [...pos] as [number, number, number]
        let newVel = [...vel] as [number, number, number]
        
        if (overlapX <= overlapY && overlapX <= overlapZ) {
          // X軸方向の衝突
          newPos[0] = pos[0] + (dx > 0 ? overlapX : -overlapX)
          newVel[0] = -vel[0] * 0.8 // 反発係数
        } else if (overlapY <= overlapX && overlapY <= overlapZ) {
          // Y軸方向の衝突
          newPos[1] = pos[1] + (dy > 0 ? overlapY : -overlapY)
          newVel[1] = -vel[1] * 0.6 // 反発係数
        } else {
          // Z軸方向の衝突
          newPos[2] = pos[2] + (dz > 0 ? overlapZ : -overlapZ)
          newVel[2] = -vel[2] * 0.8 // 反発係数
        }
        
        return [true, newPos, newVel]
      }
    }
    
    // アバターとの衝突判定
    const avatarPosition = useBallStore.getState().avatarPosition
    if (avatarPosition) {
      // アバターのバウンディングボックス（単純化）
      const avatarWidth = 0.5
      const avatarHeight = 1.5
      const avatarDepth = 0.25
      
      // ボールとアバターの距離を計算
      const dx = pos[0] - avatarPosition[0]
      const dy = pos[1] - (avatarPosition[1] + avatarHeight / 2) // アバターの中心点
      const dz = pos[2] - avatarPosition[2]
      
      // 衝突判定
      if (
        Math.abs(dx) < avatarWidth / 2 + ballRadius &&
        Math.abs(dy) < avatarHeight / 2 + ballRadius &&
        Math.abs(dz) < avatarDepth / 2 + ballRadius
      ) {
        // 衝突方向を特定
        const overlapX = avatarWidth / 2 + ballRadius - Math.abs(dx)
        const overlapY = avatarHeight / 2 + ballRadius - Math.abs(dy)
        const overlapZ = avatarDepth / 2 + ballRadius - Math.abs(dz)
        
        // 最も小さいオーバーラップを見つけて、その方向に押し出す
        let newPos = [...pos] as [number, number, number]
        let newVel = [...vel] as [number, number, number]
        
        if (overlapX <= overlapY && overlapX <= overlapZ) {
          // X軸方向の衝突
          newPos[0] = pos[0] + (dx > 0 ? overlapX : -overlapX)
          newVel[0] = -vel[0] * 0.8 + (dx > 0 ? 2 : -2) // 反発係数 + アバターの動きの影響
        } else if (overlapY <= overlapX && overlapY <= overlapZ) {
          // Y軸方向の衝突
          newPos[1] = pos[1] + (dy > 0 ? overlapY : -overlapY)
          newVel[1] = -vel[1] * 0.6 // 反発係数
        } else {
          // Z軸方向の衝突
          newPos[2] = pos[2] + (dz > 0 ? overlapZ : -overlapZ)
          newVel[2] = -vel[2] * 0.8 + (dz > 0 ? 2 : -2) // 反発係数 + アバターの動きの影響
        }
        
        return [true, newPos, newVel]
      }
    }
    
    return [false, pos, vel]
  }
  
  // 物理演算
  useFrame((state, delta) => {
    if (ballRef.current) {
      // 回転アニメーション
      ballRef.current.rotation.y += ballVelocity[0] * delta * 0.5
      ballRef.current.rotation.x += ballVelocity[2] * delta * 0.5
      
      // 位置の更新
      const newPosition: [number, number, number] = [
        ballPosition[0] + ballVelocity[0] * delta,
        ballPosition[1] + ballVelocity[1] * delta,
        ballPosition[2] + ballVelocity[2] * delta
      ]
      
      // 重力
      const gravity = 9.8
      const newVelocity: [number, number, number] = [
        ballVelocity[0] * 0.98, // 空気抵抗
        ballVelocity[1] - gravity * delta,
        ballVelocity[2] * 0.98  // 空気抵抗
      ]
      
      // 地面との衝突判定
      if (newPosition[1] < 0.25) { // ボールの半径を考慮（0.5 * 0.5 = 0.25）
        newPosition[1] = 0.25
        newVelocity[1] = -newVelocity[1] * 0.6 // 反発係数
      }
      
      // 壁との衝突判定
      const floorSize = 20
      const ballRadius = 0.5 * 0.5 // スケールを考慮したボールの半径
      const wallThickness = 0.2
      
      // 北の壁との衝突
      if (newPosition[2] < -floorSize / 2 + ballRadius + wallThickness) {
        newPosition[2] = -floorSize / 2 + ballRadius + wallThickness
        newVelocity[2] = -newVelocity[2] * 0.8 // 反発係数
      }
      
      // 南の壁との衝突
      if (newPosition[2] > floorSize / 2 - ballRadius - wallThickness) {
        newPosition[2] = floorSize / 2 - ballRadius - wallThickness
        newVelocity[2] = -newVelocity[2] * 0.8 // 反発係数
      }
      
      // 西の壁との衝突
      if (newPosition[0] < -floorSize / 2 + ballRadius + wallThickness) {
        newPosition[0] = -floorSize / 2 + ballRadius + wallThickness
        newVelocity[0] = -newVelocity[0] * 0.8 // 反発係数
      }
      
      // 東の壁との衝突
      if (newPosition[0] > floorSize / 2 - ballRadius - wallThickness) {
        newPosition[0] = floorSize / 2 - ballRadius - wallThickness
        newVelocity[0] = -newVelocity[0] * 0.8 // 反発係数
      }
      
      // オブジェクトとの衝突判定
      const [hasCollision, collisionPos, collisionVel] = checkObjectCollision(newPosition, newVelocity)
      if (hasCollision) {
        // 衝突があった場合は、衝突後の位置と速度を使用
        newPosition[0] = collisionPos[0]
        newPosition[1] = collisionPos[1]
        newPosition[2] = collisionPos[2]
        
        newVelocity[0] = collisionVel[0]
        newVelocity[1] = collisionVel[1]
        newVelocity[2] = collisionVel[2]
      }
      
      // 静止判定
      if (Math.abs(newVelocity[0]) < 0.01 && Math.abs(newVelocity[2]) < 0.01 && Math.abs(newVelocity[1]) < 0.01 && newPosition[1] <= 0.51) {
        newVelocity[0] = 0
        newVelocity[1] = 0
        newVelocity[2] = 0
      }
      
      // 状態の更新
      setPosition(newPosition)
      setVelocity(newVelocity)
    }
  })
  
  return (
    <group position={ballPosition} ref={ballRef} scale={0.5}>
      <primitive object={scene.clone()} castShadow receiveShadow />
    </group>
  )
}

const Scene = () => {
  // 地面のサイズ
  const floorSize = 20

  // 壁の高さ
  const wallHeight = 3

  // 静的オブジェクトの配置データ
  const staticObjects = [
    // 中央の立方体は削除
    // 周囲の立方体
    { position: [-3, 0.5, -3] as [number, number, number], size: [1, 1, 1] as [number, number, number], color: 'lightblue' },
    { position: [3, 0.5, -3] as [number, number, number], size: [1, 1, 1] as [number, number, number], color: 'lightgreen' },
    { position: [-3, 0.5, 3] as [number, number, number], size: [1, 1, 1] as [number, number, number], color: 'orange' },
    { position: [3, 0.5, 3] as [number, number, number], size: [1, 1, 1] as [number, number, number], color: 'purple' },
    // 大きなオブジェクト
    { position: [-5, 1, 0] as [number, number, number], size: [1, 2, 3] as [number, number, number], color: 'tomato' },
    { position: [5, 1, 0] as [number, number, number], size: [1, 2, 3] as [number, number, number], color: 'gold' },
  ]

  // 建物コンポーネント
  const Building = () => {
    return (
      <group position={[-7, 0, -7]}>
        {/* 建物の基礎 */}
        <Box 
          position={[0, 1.5, 0]} 
          args={[4, 3, 4]} 
          castShadow 
          receiveShadow
        >
          <meshStandardMaterial color="#d8d8d8" metalness={0.2} roughness={0.7} />
        </Box>
        
        {/* 屋根 */}
        <Box 
          position={[0, 3.5, 0]} 
          args={[4.5, 0.5, 4.5]} 
          castShadow
        >
          <meshStandardMaterial color="#8B4513" roughness={0.8} />
        </Box>
        
        {/* 窓 */}
        <Box 
          position={[1, 1.5, 2.01]} 
          args={[1, 1, 0.1]} 
        >
          <meshStandardMaterial color="#87CEEB" metalness={0.9} roughness={0.1} />
        </Box>
        
        <Box 
          position={[-1, 1.5, 2.01]} 
          args={[1, 1, 0.1]} 
        >
          <meshStandardMaterial color="#87CEEB" metalness={0.9} roughness={0.1} />
        </Box>
        
        {/* ドア */}
        <Box 
          position={[0, 0.75, 2.01]} 
          args={[1, 1.5, 0.1]} 
        >
          <meshStandardMaterial color="#8B4513" roughness={0.8} />
        </Box>
      </group>
    )
  }

  // 木のコンポーネント
  const Tree = ({ position }: { position: [number, number, number] }) => {
    return (
      <group position={position}>
        {/* 幹 */}
        <Cylinder 
          position={[0, 1, 0]} 
          args={[0.2, 0.3, 2, 8]} 
          castShadow
        >
          <meshStandardMaterial color="#8B4513" roughness={0.9} />
        </Cylinder>
        
        {/* 葉 */}
        <Sphere 
          position={[0, 2.5, 0]} 
          args={[1, 16, 16]} 
          castShadow
        >
          <meshStandardMaterial color="#228B22" roughness={0.8} />
        </Sphere>
      </group>
    )
  }

  return (
    <>
      {/* 地面 */}
      <Box 
        position={[0, -0.05, 0] as [number, number, number]} 
        args={[floorSize, 0.1, floorSize]} 
        receiveShadow
      >
        <meshStandardMaterial color="#a9c388" roughness={0.8} />
      </Box>

      {/* 壁 - 北 */}
      <Box 
        position={[0, wallHeight / 2, -floorSize / 2] as [number, number, number]} 
        args={[floorSize, wallHeight, 0.2]} 
        castShadow 
        receiveShadow
      >
        <meshStandardMaterial color="#d8c4b6" roughness={0.7} />
      </Box>

      {/* 壁 - 南 */}
      <Box 
        position={[0, wallHeight / 2, floorSize / 2] as [number, number, number]} 
        args={[floorSize, wallHeight, 0.2]} 
        castShadow 
        receiveShadow
      >
        <meshStandardMaterial color="#d8c4b6" roughness={0.7} />
      </Box>

      {/* 壁 - 西 */}
      <Box 
        position={[-floorSize / 2, wallHeight / 2, 0] as [number, number, number]} 
        args={[0.2, wallHeight, floorSize]} 
        castShadow 
        receiveShadow
      >
        <meshStandardMaterial color="#d8c4b6" roughness={0.7} />
      </Box>

      {/* 壁 - 東 */}
      <Box 
        position={[floorSize / 2, wallHeight / 2, 0] as [number, number, number]} 
        args={[0.2, wallHeight, floorSize]} 
        castShadow 
        receiveShadow
      >
        <meshStandardMaterial color="#d8c4b6" roughness={0.7} />
      </Box>

      {/* 静的オブジェクト */}
      {staticObjects.map((obj, index) => (
        <Box
          key={index}
          position={obj.position}
          args={obj.size}
          castShadow
          receiveShadow
        >
          <meshStandardMaterial color={obj.color} roughness={0.7} />
        </Box>
      ))}

      {/* 手作りの建物と木 */}
      <Building />
      <Tree position={[7, 0, -7]} />
      <Tree position={[7, 0, 7]} />
      <Tree position={[-7, 0, 7]} />
      
      {/* サッカーボール */}
      <SoccerBall position={[0, 0.5, 3]} />
    </>
  )
}

export default Scene 