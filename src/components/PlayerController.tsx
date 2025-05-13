import { useEffect, useState, useRef } from 'react'
import { useThree, useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import Avatar from './Avatar'
import { useBallStore } from './Scene'

// シーン内の静的オブジェクトの位置と大きさ（衝突判定用）
const STATIC_OBJECTS = [
  // 中央の立方体は削除
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

// 壁の位置（衝突判定用）
const FLOOR_SIZE = 20
const WALL_THICKNESS = 0.2

// カメラの視点モード
type CameraMode = 'thirdPerson' | 'firstPerson' | 'topDown'

interface PlayerControllerProps {
  position: [number, number, number]
  rotation: [number, number, number]
  setPosition: React.Dispatch<React.SetStateAction<[number, number, number]>>
  setRotation: React.Dispatch<React.SetStateAction<[number, number, number]>>
  cameraMode: CameraMode
}

const PlayerController = ({
  position,
  rotation,
  setPosition,
  setRotation,
  cameraMode
}: PlayerControllerProps) => {
  // キー入力の状態
  const [keys, setKeys] = useState({
    forward: false,
    backward: false,
    left: false,
    right: false,
    kick: false // キック用のキー
  })
  
  // 移動中かどうか
  const [isMoving, setIsMoving] = useState(false)
  
  // ボールの状態を取得
  const ballPosition = useBallStore((state) => state.position)
  const kickBall = useBallStore((state) => state.kickBall)
  const setAvatarPosition = useBallStore((state) => state.setAvatarPosition)
  
  // キック状態
  const [isKicking, setIsKicking] = useState(false)
  const kickCooldown = useRef(0)
  
  // カメラ参照
  const { camera } = useThree()
  
  // キーボードイベントのセットアップ
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'w' || e.key === 'ArrowUp') setKeys(prev => ({ ...prev, forward: true }))
      if (e.key === 's' || e.key === 'ArrowDown') setKeys(prev => ({ ...prev, backward: true }))
      if (e.key === 'a' || e.key === 'ArrowLeft') setKeys(prev => ({ ...prev, left: true }))
      if (e.key === 'd' || e.key === 'ArrowRight') setKeys(prev => ({ ...prev, right: true }))
      if (e.key === ' ' || e.key === 'Spacebar') {
        setKeys(prev => ({ ...prev, kick: true }))
        e.preventDefault() // スクロールなどのデフォルト動作を防止
      }
    }
    
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'w' || e.key === 'ArrowUp') setKeys(prev => ({ ...prev, forward: false }))
      if (e.key === 's' || e.key === 'ArrowDown') setKeys(prev => ({ ...prev, backward: false }))
      if (e.key === 'a' || e.key === 'ArrowLeft') setKeys(prev => ({ ...prev, left: false }))
      if (e.key === 'd' || e.key === 'ArrowRight') setKeys(prev => ({ ...prev, right: false }))
      if (e.key === ' ' || e.key === 'Spacebar') {
        setKeys(prev => ({ ...prev, kick: false }))
        e.preventDefault() // スクロールなどのデフォルト動作を防止
      }
    }
    
    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
    }
  }, [])
  
  // 移動状態の更新
  useEffect(() => {
    const movementKeys = [keys.forward, keys.backward, keys.left, keys.right]
    const anyKeyPressed = movementKeys.some(value => value)
    setIsMoving(anyKeyPressed)
  }, [keys])
  
  // 衝突判定関数
  const checkCollision = (newPos: [number, number, number]): boolean => {
    // アバターのバウンディングボックス（単純化）
    const avatarSize = [0.5, 1, 0.25]
    const avatarHalfWidth = avatarSize[0] / 2
    const avatarHalfDepth = avatarSize[2] / 2
    
    // 壁との衝突判定
    if (
      newPos[0] - avatarHalfWidth <= -FLOOR_SIZE / 2 + WALL_THICKNESS ||
      newPos[0] + avatarHalfWidth >= FLOOR_SIZE / 2 - WALL_THICKNESS ||
      newPos[2] - avatarHalfDepth <= -FLOOR_SIZE / 2 + WALL_THICKNESS ||
      newPos[2] + avatarHalfDepth >= FLOOR_SIZE / 2 - WALL_THICKNESS
    ) {
      return true
    }
    
    // 静的オブジェクトとの衝突判定
    for (const obj of STATIC_OBJECTS) {
      const objHalfWidth = obj.size[0] / 2
      const objHalfDepth = obj.size[2] / 2
      
      if (
        newPos[0] + avatarHalfWidth > obj.position[0] - objHalfWidth &&
        newPos[0] - avatarHalfWidth < obj.position[0] + objHalfWidth &&
        newPos[2] + avatarHalfDepth > obj.position[2] - objHalfDepth &&
        newPos[2] - avatarHalfDepth < obj.position[2] + objHalfDepth
      ) {
        return true
      }
    }
    
    return false
  }
  
  // ボールとの距離を計算
  const getDistanceToBall = (pos: [number, number, number]): number => {
    const dx = pos[0] - ballPosition[0]
    const dz = pos[2] - ballPosition[2]
    return Math.sqrt(dx * dx + dz * dz)
  }
  
  // フレームごとの更新
  useFrame((state, delta) => {
    // 移動速度
    const moveSpeed = 3 * delta
    
    // 現在の位置と回転
    let newPos: [number, number, number] = [...position]
    let newRot: [number, number, number] = [...rotation]
    
    // アバターの高さを地面に固定（浮かないようにする）
    newPos[1] = 0.0 // 地面の高さ
    
    // 移動方向ベクトル（ワールド座標系）
    const moveVector = new THREE.Vector3(0, 0, 0)
    
    // 入力に基づいて移動方向を設定（スクリーン座標系）
    if (keys.forward) moveVector.z = -1  // 前方向
    if (keys.backward) moveVector.z = 1  // 後方向
    if (keys.left) moveVector.x = -1     // 左方向
    if (keys.right) moveVector.x = 1     // 右方向
    
    // 移動ベクトルが存在する場合のみ処理
    if (moveVector.length() > 0) {
      // 移動ベクトルを正規化
      moveVector.normalize()
      
      // 移動方向に基づいて回転角度を設定
      const angle = Math.atan2(-moveVector.x, -moveVector.z)
      newRot = [0, angle, 0]
      
      // 前方向ベクトルを計算（アバターの向いている方向）
      const forwardVector = new THREE.Vector3(0, 0, -1)
      forwardVector.applyAxisAngle(new THREE.Vector3(0, 1, 0), angle)
      forwardVector.multiplyScalar(moveSpeed)
      
      // 新しい位置を計算
      const potentialNewPos: [number, number, number] = [
        newPos[0] + forwardVector.x,
        newPos[1],
        newPos[2] + forwardVector.z
      ]
      
      // 衝突判定
      if (!checkCollision(potentialNewPos)) {
        newPos = potentialNewPos
      }
    }
    
    // キックの処理
    if (keys.kick && kickCooldown.current <= 0) {
      // ボールとの距離を確認
      const distanceToBall = getDistanceToBall(newPos)
      
      if (distanceToBall < 1.5) { // キック可能な距離
        // キックの方向（プレイヤーの向いている方向）
        const kickDirection: [number, number, number] = [
          -Math.sin(newRot[1]),
          0.2, // 少し上向きに
          -Math.cos(newRot[1])
        ]
        
        // ボールを蹴る
        kickBall(kickDirection, 10) // 力の強さ
        
        // キックのクールダウン設定
        kickCooldown.current = 0.5 // 0.5秒
        setIsKicking(true)
        
        // キックアニメーション終了タイマー
        setTimeout(() => {
          setIsKicking(false)
        }, 300)
      }
    }
    
    // キックのクールダウンを減らす
    if (kickCooldown.current > 0) {
      kickCooldown.current -= delta
    }
    
    // 状態の更新
    if (
      newPos[0] !== position[0] ||
      newPos[1] !== position[1] ||
      newPos[2] !== position[2] ||
      newRot[0] !== rotation[0] ||
      newRot[1] !== rotation[1] ||
      newRot[2] !== rotation[2]
    ) {
      setPosition(newPos)
      setRotation(newRot)
      
      // アバターの位置情報をボールの衝突判定用に更新
      setAvatarPosition(newPos)
    }
    
    // カメラモードに基づいてカメラの位置と向きを更新
    updateCamera(newPos, newRot, camera, cameraMode)
  })

  // カメラの更新関数
  const updateCamera = (
    pos: [number, number, number], 
    rot: [number, number, number], 
    camera: THREE.Camera, 
    mode: CameraMode
  ) => {
    switch (mode) {
      case 'firstPerson':
        // 1人称視点: アバターの頭の位置から前方を見る
        camera.position.set(
          pos[0] - Math.sin(rot[1]) * 0.15, // 少し前方にオフセット
          pos[1] + 1.0, // 頭の高さを少し下げる
          pos[2] - Math.cos(rot[1]) * 0.15  // 少し前方にオフセット
        )
        // 視線方向
        const lookAtFirst = new THREE.Vector3(
          pos[0] - Math.sin(rot[1]) * 3, // より遠くを見る
          pos[1] + 0.9, // 視線を少し下げる
          pos[2] - Math.cos(rot[1]) * 3  // より遠くを見る
        )
        camera.lookAt(lookAtFirst)
        break
        
      case 'topDown':
        // 上からの視点: アバターの真上から見下ろす
        camera.position.set(
          pos[0],
          pos[1] + 15, // 高さ
          pos[2]
        )
        camera.lookAt(new THREE.Vector3(pos[0], pos[1], pos[2]))
        break
        
      case 'thirdPerson':
      default:
        // 三人称視点: アバターの後ろから追従
        const cameraHeight = 2.5
        const cameraDistance = 4
        
        // カメラ位置（アバターの後ろ側に配置）
        const cameraOffsetX = Math.sin(0) * +cameraDistance
        const cameraOffsetZ = Math.cos(0) * +cameraDistance
        
        // カメラ位置を設定（アバターの後ろ上方）
        camera.position.set(
          pos[0] + cameraOffsetX,
          pos[1] + cameraHeight,
          pos[2] + cameraOffsetZ
        )
        
        // アバターの少し前方を注視点とする
        const lookAheadDistance = 1
        const lookAtPoint = new THREE.Vector3(
          pos[0] + Math.sin(0) * lookAheadDistance,
          pos[1] + 0.8,  // アバターの頭の高さ付近
          pos[2] + Math.cos(0) * lookAheadDistance
        )
        camera.lookAt(lookAtPoint)
        break
    }
  }
  
  // アバターの表示/非表示を決定（1人称視点の場合は非表示）
  const showAvatar = cameraMode !== 'firstPerson'
  
  return (
    <>
      <Avatar 
        position={position} 
        rotation={rotation} 
        isMoving={isMoving} 
        isKicking={isKicking}
      />
    </>
  )
}

export default PlayerController 