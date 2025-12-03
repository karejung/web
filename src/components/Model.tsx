import { useGLTF } from '@react-three/drei'
import { useThree } from '@react-three/fiber'
import { DRACOLoader } from 'three-stdlib'
import { KTX2Loader } from 'three-stdlib'
import { BASE_PATH } from '@/config/basePath'
import type { ModelConfig } from '@/data/scenes'

type ModelProps = React.JSX.IntrinsicElements['group'] & {
  config: ModelConfig
}

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
    
    // KTX2 로더 설정 (WebGPU도 지원)
    const ktx2Loader = new KTX2Loader()
    ktx2Loader.setTranscoderPath('/basis/')
    ktx2Loader.detectSupport(gl)
    loader.setKTX2Loader(ktx2Loader)
  })

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

