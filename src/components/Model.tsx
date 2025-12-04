import { useGLTF } from '@react-three/drei'
import { useThree } from '@react-three/fiber'
import { useEffect } from 'react'
import { DRACOLoader } from 'three-stdlib'
import { KTX2Loader } from 'three-stdlib'
import { BASE_PATH } from '@/config/basePath'
import { logModelLoadInfo } from '@/config/loadConsole'
import type { ModelConfig } from '@/data/scenes'

type ModelProps = React.JSX.IntrinsicElements['group'] & {
  config: ModelConfig
}

// 로그 표시 여부 플래그 (한 번만 표시)
let hasLoggedModelInfo = false

export function Model({ config, ...props }: ModelProps) {
  // 렌더러 가져오기
  const { gl } = useThree()
  
  // 모델 경로 생성 (압축된 버전 사용)
  const modelPath = `${BASE_PATH}/gltf/${config.component}/model_draco.gltf`
  
  // GLTF 모델 로드 with Draco and KTX2 loaders
  const { scene } = useGLTF(modelPath, true, undefined, (loader) => {
    // Draco 로더 설정
    const dracoLoader = new DRACOLoader()
    dracoLoader.setDecoderPath('/draco/')
    dracoLoader.setDecoderConfig({ type: 'wasm' })
    loader.setDRACOLoader(dracoLoader)
    
    // KTX2 로더 설정 (WebGPU 및 WebGL 지원)
    const ktx2Loader = new KTX2Loader()
    ktx2Loader.setTranscoderPath('/basis/')
    ktx2Loader.detectSupport(gl)
    
    // 워커 제한 설정 (선택적, 성능 최적화)
    ktx2Loader.setWorkerLimit(2)
    
    loader.setKTX2Loader(ktx2Loader)
    
    // 에러 핸들링 - KTX2 로드 실패 시 WebP fallback
    loader.manager.onError = (url) => {
      if (url.includes('.ktx2')) {
        console.warn(`KTX2 texture failed to load: ${url}`)
        console.warn('Falling back to WebP texture')
      } else {
        console.error(`Failed to load: ${url}`)
      }
    }
  })

  // 모델 로드 후 정보 출력 (개발 모드, 한 번만)
  useEffect(() => {
    if (scene && !hasLoggedModelInfo) {
      hasLoggedModelInfo = true
      
      // 약간의 딜레이를 주어 모든 리소스가 로드되도록 함
      setTimeout(() => {
        logModelLoadInfo(scene, gl)
      }, 100)
    }
  }, [scene, gl])

  return (
    <group {...props}>
      <primitive 
        object={scene} 
        position={config.position}
        rotation={config.rotation}
        scale={config.scale}
      />
    </group>
  )
}

// 모델 프리로드
useGLTF.preload(`${BASE_PATH}/gltf/1/model_draco.gltf`)

