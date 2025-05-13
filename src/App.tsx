import { useState, useEffect } from 'react'
import { Canvas } from '@react-three/fiber'
import { Sky, Environment, Stars } from '@react-three/drei'
import { EffectComposer, Bloom, SSAO } from '@react-three/postprocessing'
import './App.css'
import Scene from './components/Scene'
import PlayerController from './components/PlayerController'
import ControlsInfo from './components/ControlsInfo'

// カメラの視点モード
type CameraMode = 'thirdPerson' | 'firstPerson' | 'topDown'

function App() {
  const [playerPosition, setPlayerPosition] = useState<[number, number, number]>([0, 1, 5])
  const [playerRotation, setPlayerRotation] = useState<[number, number, number]>([0, 0, 0])
  const [cameraMode, setCameraMode] = useState<CameraMode>('thirdPerson')
  const [dayTime, setDayTime] = useState<boolean>(true)

  // カメラモードを切り替える関数
  const toggleCameraMode = () => {
    setCameraMode(prevMode => {
      if (prevMode === 'thirdPerson') return 'firstPerson'
      if (prevMode === 'firstPerson') return 'topDown'
      return 'thirdPerson'
    })
  }

  // 昼夜を切り替える関数
  const toggleDayTime = () => {
    setDayTime(prev => !prev)
  }
  
  // キーボードイベントのセットアップ
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // スペースキーはボールを蹴る操作に割り当てるため、ここでは処理しない
      
      // Tキーで昼夜切り替え
      if (e.key === 't' || e.key === 'T') {
        toggleDayTime()
      }
      
      // Cキーでカメラ切り替え
      if (e.key === 'c' || e.key === 'C') {
        toggleCameraMode()
      }
      
      // スペースキーのデフォルトの動作（スクロールなど）を防止
      if (e.key === ' ' || e.key === 'Spacebar') {
        e.preventDefault()
      }
    }
    
    window.addEventListener('keydown', handleKeyDown)
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [])

  return (
    <div className="app">
      <Canvas
        shadows
        camera={{ position: [0, 5, 10], fov: 50 }}
        style={{ width: '100vw', height: '100vh' }}
      >
        {/* 環境設定 */}
        {dayTime ? (
          <Sky sunPosition={[100, 10, 100]} />
        ) : (
          <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade />
        )}
        
        <Environment preset={dayTime ? "sunset" : "night"} />
        
        {/* 照明 */}
        <ambientLight intensity={dayTime ? 0.3 : 0.3} />
        <directionalLight 
          position={[10, 10, 10]} 
          intensity={dayTime ? 1.0 : 0.5} 
          castShadow 
          shadow-mapSize={[2048, 2048]} 
        />
        
        {/* 夜の場合、追加の照明 */}
        {!dayTime && (
          <>
            <pointLight position={[0, 3, 0]} intensity={3} color="#ff7700" distance={15} />
            <spotLight position={[-7, 4, -7]} angle={0.5} penumbra={0.5} intensity={2} color="#ffffff" castShadow />
          </>
        )}
        
        {/* 昼の場合、より自然な照明 */}
        {dayTime && (
          <>
            <hemisphereLight 
              intensity={0.5} 
              color="#87CEEB" 
              groundColor="#8B4513" 
            />
          </>
        )}
        
        <Scene />
        <PlayerController 
          position={playerPosition} 
          rotation={playerRotation}
          setPosition={setPlayerPosition}
          setRotation={setPlayerRotation}
          cameraMode={cameraMode}
        />
        
        {/* ポストプロセッシング効果 */}
        <EffectComposer>
          <Bloom luminanceThreshold={0.2} luminanceSmoothing={0.9} height={300} />
          <SSAO samples={31} radius={0.1} intensity={20} luminanceInfluence={0.6} />
        </EffectComposer>
      </Canvas>
      <ControlsInfo 
        toggleCameraMode={toggleCameraMode} 
        cameraMode={cameraMode}
        toggleDayTime={toggleDayTime}
        dayTime={dayTime}
      />
    </div>
  )
}

export default App
