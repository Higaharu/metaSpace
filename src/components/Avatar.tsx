import { useRef, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import { Box, Sphere, Cylinder } from '@react-three/drei'
import * as THREE from 'three'

interface AvatarProps {
  position: [number, number, number]
  rotation: [number, number, number]
  isMoving: boolean
  isKicking?: boolean // キック状態を追加
}

const Avatar = ({ position, rotation, isMoving, isKicking = false }: AvatarProps) => {
  const avatarRef = useRef<THREE.Group>(null)
  const leftLegRef = useRef<THREE.Mesh>(null)
  const rightLegRef = useRef<THREE.Mesh>(null)
  
  // アバターの位置と回転を更新
  useEffect(() => {
    if (avatarRef.current) {
      avatarRef.current.position.set(position[0], position[1], position[2])
      avatarRef.current.rotation.set(rotation[0], rotation[1], rotation[2])
    }
  }, [position, rotation])

  // シンプルなアニメーション（移動中の揺れ）
  useFrame((state, delta) => {
    if (avatarRef.current) {
      const time = state.clock.getElapsedTime()
      
      // 脚のアニメーション参照
      const leftLeg = leftLegRef.current
      const rightLeg = rightLegRef.current
      
      if (isMoving) {
        // 移動中は軽く上下に揺らす
        const bobHeight = Math.sin(time * 10) * 0.05
        avatarRef.current.position.y = position[1] + bobHeight
        
        // 腕を動かすアニメーション
        if (avatarRef.current.children.length > 3) {
          const leftArm = avatarRef.current.children[2] as THREE.Mesh
          const rightArm = avatarRef.current.children[3] as THREE.Mesh
          
          if (leftArm && rightArm) {
            leftArm.rotation.x = Math.sin(time * 10) * 0.4
            rightArm.rotation.x = Math.sin(time * 10 + Math.PI) * 0.4
          }
        }
        
        // 脚を動かすアニメーション
        if (leftLeg && rightLeg) {
          leftLeg.rotation.x = Math.sin(time * 10) * 0.4
          rightLeg.rotation.x = Math.sin(time * 10 + Math.PI) * 0.4
        }
      } else {
        // 静止中は初期位置に戻す
        avatarRef.current.position.y = position[1]
        
        // 腕と脚を初期位置に戻す
        if (avatarRef.current.children.length > 3) {
          const leftArm = avatarRef.current.children[2] as THREE.Mesh
          const rightArm = avatarRef.current.children[3] as THREE.Mesh
          
          if (leftArm && rightArm) {
            leftArm.rotation.x = 0
            rightArm.rotation.x = 0
          }
        }
        
        if (leftLeg && rightLeg) {
          leftLeg.rotation.x = 0
          rightLeg.rotation.x = 0
        }
      }
      
      // キックアニメーション
      if (isKicking && rightLeg) {
        rightLeg.rotation.x = -0.8 // 右脚を前に出す
      }
    }
  })

  return (
    <group ref={avatarRef}>
      {/* 胴体 */}
      <Box args={[0.5, 0.7, 0.25]} position={[0, 0.6, 0]} castShadow>
        <meshStandardMaterial color="#1E90FF" metalness={0.2} roughness={0.7} />
      </Box>
      
      {/* 頭 */}
      <Sphere args={[0.2, 16, 16]} position={[0, 1.1, 0]} castShadow>
        <meshStandardMaterial color="#FFD700" metalness={0.1} roughness={0.6} />
      </Sphere>
      
      {/* 左腕 */}
      <Box 
        args={[0.15, 0.5, 0.15]} 
        position={[-0.325, 0.6, 0]} 
        castShadow
      >
        <meshStandardMaterial color="#1E90FF" metalness={0.2} roughness={0.7} />
      </Box>
      
      {/* 右腕 */}
      <Box 
        args={[0.15, 0.5, 0.15]} 
        position={[0.325, 0.6, 0]} 
        castShadow
      >
        <meshStandardMaterial color="#1E90FF" metalness={0.2} roughness={0.7} />
      </Box>
      
      {/* 左脚 - 回転の基点を上部に設定 */}
      <group position={[-0.15, 0.25, 0]}>
        <Box 
          ref={leftLegRef}
          args={[0.2, 0.5, 0.2]} 
          position={[0, -0.25, 0]} // 回転の基点から下に配置
          castShadow
        >
          <meshStandardMaterial color="#4169E1" metalness={0.1} roughness={0.8} />
        </Box>
      </group>
      
      {/* 右脚 - 回転の基点を上部に設定 */}
      <group position={[0.15, 0.25, 0]}>
        <Box 
          ref={rightLegRef}
          args={[0.2, 0.5, 0.2]} 
          position={[0, -0.25, 0]} // 回転の基点から下に配置
          castShadow
        >
          <meshStandardMaterial color="#4169E1" metalness={0.1} roughness={0.8} />
        </Box>
      </group>
      
      {/* 目 */}
      <Sphere args={[0.05, 8, 8]} position={[-0.08, 1.15, -0.15]} castShadow>
        <meshStandardMaterial color="black" />
      </Sphere>
      <Sphere args={[0.05, 8, 8]} position={[0.08, 1.15, -0.15]} castShadow>
        <meshStandardMaterial color="black" />
      </Sphere>
      
      {/* 口 */}
      <Box 
        args={[0.1, 0.03, 0.05]} 
        position={[0, 1.05, 0.15]} 
        castShadow
      >
        <meshStandardMaterial color="#FF6347" />
      </Box>
    </group>
  )
}

export default Avatar 