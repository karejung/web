import { useGLTF } from '@react-three/drei'
import { BASE_PATH } from '@/config/basePath'
import type { ModelConfig } from '@/data/scenes'

type ModelProps = React.JSX.IntrinsicElements['group'] & {
  config: ModelConfig
}

export function Model({ config, ...props }: ModelProps) {
  // 모델 경로 생성
  const modelPath = `${BASE_PATH}/gltf/${config.component}/model.gltf`
  
  // GLTF 모델 로드
  const { scene } = useGLTF(modelPath)

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
useGLTF.preload(`${BASE_PATH}/gltf/1/model.gltf`)

