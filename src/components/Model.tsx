import { useGLTF } from '@react-three/drei'
import { useThree } from '@react-three/fiber'
import { DRACOLoader } from 'three-stdlib'
import { BASE_PATH } from '@/config/basePath'
import type { ModelConfig } from '@/data/scenes'
import { TextureLoaderManager } from '@/utils/TextureLoaders'

type ModelProps = React.JSX.IntrinsicElements['group'] & {
  config: ModelConfig
  children?: React.ReactNode
}

export function Model({ config, children, ...props }: ModelProps) {
  const { gl } = useThree()
  const modelPath = `${BASE_PATH}/gltf/${config.component}/model_draco.gltf`
  
  const { scene } = useGLTF(modelPath, true, undefined, (loader) => {
    // Draco 로더 설정
    const dracoLoader = new DRACOLoader()
    dracoLoader.setDecoderPath('/draco/')
    dracoLoader.setDecoderConfig({ type: 'wasm' })
    loader.setDRACOLoader(dracoLoader)
    
    // KTX2 로더 설정 (WebGPU 지원)
    const textureLoaderManager = TextureLoaderManager.getInstance()
    const ktx2Loader = textureLoaderManager.initializeKTX2Loader(gl)
    loader.setKTX2Loader(ktx2Loader as any)
  })


  return (
    <group 
      {...props}
      position={config.position}
      rotation={config.rotation}
      scale={config.scale}
    >
      <primitive object={scene} />
      {children}
    </group>
  )
}

