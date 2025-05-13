import React from 'react'

// カメラの視点モード
type CameraMode = 'thirdPerson' | 'firstPerson' | 'topDown'

interface ControlsInfoProps {
  toggleCameraMode: () => void
  cameraMode: CameraMode
  toggleDayTime?: () => void
  dayTime?: boolean
}

const ControlsInfo: React.FC<ControlsInfoProps> = ({ 
  toggleCameraMode, 
  cameraMode,
  toggleDayTime,
  dayTime
}) => {
  // カメラモードの表示名
  const cameraModeNames = {
    thirdPerson: '三人称視点',
    firstPerson: '一人称視点',
    topDown: '上からの視点'
  }

  return (
    <div className="controls-info">
      <h3>操作方法</h3>
      <ul>
        <li>W / ↑: 前進</li>
        <li>S / ↓: 後退</li>
        <li>A / ←: 左移動</li>
        <li>D / →: 右移動</li>
        <li>スペース: ボールを蹴る</li>
        <li>T: 昼夜切り替え</li>
        <li>C: カメラ視点切り替え</li>
      </ul>
      
      <div className="camera-controls">
        <p>現在の視点: {cameraModeNames[cameraMode]}</p>
        
        <div className="button-row">
          <button onClick={toggleCameraMode}>視点切替</button>
          
          {toggleDayTime && (
            <button onClick={toggleDayTime}>
              {dayTime ? '🌙 夜にする' : '☀️ 昼にする'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

export default ControlsInfo 