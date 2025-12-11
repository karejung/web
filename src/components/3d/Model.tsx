import { useRef, useEffect } from 'react'
import { useGLTF } from '@react-three/drei'
import { useThree, useFrame } from '@react-three/fiber'
import { DRACOLoader } from 'three-stdlib'
import * as THREE from 'three/webgpu'
import { BASE_PATH } from '@/config/basePath'
import { TextureLoaderManager } from '@/config/TextureLoaders'

type ModelProps = React.JSX.IntrinsicElements['group'] & {
  modelName: string
  rotation: [number, number, number]
  isCurrentModel: boolean
  children?: React.ReactNode
}

export function Model({ modelName, rotation, isCurrentModel, children, ...props }: ModelProps) {
  const { gl, camera } = useThree()
  const modelPath = `${BASE_PATH}/gltf/${modelName}/model_draco.gltf`
  
  const { scene } = useGLTF(modelPath, true, undefined, (loader) => {
    // Draco 로더 설정
    const dracoLoader = new DRACOLoader()
    dracoLoader.setDecoderPath(`${BASE_PATH}/draco/`)
    dracoLoader.setDecoderConfig({ type: 'wasm' })
    loader.setDRACOLoader(dracoLoader)
    
    // KTX2 로더 설정 (WebGPU 지원)
    const textureLoaderManager = TextureLoaderManager.getInstance()
    const ktx2Loader = textureLoaderManager.initializeKTX2Loader(gl)
    loader.setKTX2Loader(ktx2Loader as any)
  })

  // 메쉬 참조 저장
  const modelLRef = useRef<THREE.Mesh | null>(null)
  const modelMRef = useRef<THREE.Mesh | null>(null)
  const modelRRef = useRef<THREE.Mesh | null>(null)
  
  // 초기 azimuth 각도 저장
  const initialAzimuthRef = useRef<number | null>(null)

  // scene이 로드되면 메쉬 찾기
  useEffect(() => {
    if (!scene) return

    scene.traverse((child) => {
      if ((child as any).isMesh) {
        const mesh = child as THREE.Mesh
        if (mesh.name === 'modelL') {
          modelLRef.current = mesh
        } else if (mesh.name === 'modelM') {
          modelMRef.current = mesh
        } else if (mesh.name === 'modelR') {
          modelRRef.current = mesh
        }
      }
    })

    // 정면 방향(z축 음의 방향)을 기준(0도)으로 설정
    if (modelLRef.current && modelRRef.current) {
      initialAzimuthRef.current = Math.PI
    }
  }, [scene])


  // 매 프레임마다 카메라 각도에 따라 메쉬 가시성 제어 (현재 모델만)
  useFrame(() => {
    // 현재 모델이 아니면 visibility 제어 스킵
    if (!isCurrentModel) return
    
    // modelL과 modelR이 모두 있는 경우에만 visibility 제어 활성화
    if (!modelLRef.current || !modelRRef.current) return

    // OrbitControls target 위치
    const targetX = 0
    const targetZ = 0

    // 현재 Azimuth angle 계산 (수평 회전 각도)
    const currentAzimuth = Math.atan2(
      camera.position.x - targetX,
      camera.position.z - targetZ
    )

    // 초기 각도 저장 (첫 프레임)
    if (initialAzimuthRef.current === null) {
      initialAzimuthRef.current = currentAzimuth
    }

    // 초기 위치로부터의 상대적 회전 각도 계산
    let relativeAngle = currentAzimuth - initialAzimuthRef.current

    // -π ~ π 범위로 정규화
    while (relativeAngle > Math.PI) relativeAngle -= 2 * Math.PI
    while (relativeAngle < -Math.PI) relativeAngle += 2 * Math.PI

    // 각도에 따른 메쉬 가시성 제어
    // 왼쪽으로 회전: modelR 숨김
    if (relativeAngle > Math.PI / 20) {
      modelRRef.current.visible = false
    } else {
      modelRRef.current.visible = true
    }

    // 오른쪽으로 회전: modelL 숨김
    if (relativeAngle < -Math.PI / 20) {
      modelLRef.current.visible = false
    } else {
      modelLRef.current.visible = true
    }

    // modelM이 있으면 항상 표시
    if (modelMRef.current) {
      modelMRef.current.visible = true
    }
  })

  return (
    <group 
      {...props}
      rotation={rotation}
    >
      <primitive object={scene} />
      {children}
    </group>
  )
}
