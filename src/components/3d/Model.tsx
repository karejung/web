import { useRef, useEffect, useMemo } from 'react'
import { useGLTF, OrbitControls } from '@react-three/drei'
import { useThree, useFrame } from '@react-three/fiber'
import { animated, useSpring } from '@react-spring/three'
import { DRACOLoader } from 'three-stdlib'
import * as THREE from 'three/webgpu'
import { BASE_PATH } from '@/config/basePath'
import type { ModelConfig } from '@/data/scenes'
import { TextureLoaderManager } from '@/utils/TextureLoaders'

// 스프링 애니메이션 설정
const SPRING_CONFIG = {
  tension: 200,
  friction: 30,
  precision: 0.001
}

type ModelProps = React.JSX.IntrinsicElements['group'] & {
  config: ModelConfig
  index: number
  currentIndex: number
  screenWidth: number
  children?: React.ReactNode
}

export function Model({ config, index, currentIndex, screenWidth, children, ...props }: ModelProps) {
  const { gl, camera } = useThree()
  const modelPath = `${BASE_PATH}/gltf/${config.component}/model_draco.gltf`
  
  const isCurrentModel = index === currentIndex
  
  // screenWidth를 prop으로 받아서 사용
  const width = screenWidth
  
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
  
  // 화면 크기에 따른 스케일 팩터 계산 (width가 바뀔 때마다 재계산)
  const scaleFactor = useMemo(() => {
    if (width > 1440) return 1.2
    if (width > 1024) return 1.05
    if (width > 768) return 0.9
    if (width > 480) return 0.8
    return 0.7
  }, [width])
  
  // 화면 크기에 따른 Y 오프셋 계산
  const yOffset = useMemo(() => {
    if (width > 1440) return -0.3
    if (width > 1024) return -0.2
    if (width > 768) return -0.1
    return 0
  }, [width])
  
  // 화면 크기에 따른 Y 간격 계산
  const ySpacing = useMemo(() => {
    if (width <= 768) return 4
    if (width <= 1440) return 5
    return 6
  }, [width])
  
  // 최종 스케일 및 위치 계산
  const targetScale = config.scale * scaleFactor
  const targetPositionX = config.position[0]
  const targetPositionY = config.position[1] + yOffset + (index * -ySpacing)
  const targetPositionZ = config.position[2]
  
  // 스프링 애니메이션 적용
  const { animatedScale, positionX, positionY, positionZ } = useSpring({
    animatedScale: targetScale,
    positionX: targetPositionX,
    positionY: targetPositionY,
    positionZ: targetPositionZ,
    config: SPRING_CONFIG
  })

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

  // 현재 모델 여부에 따른 emissive intensity 조절
  useEffect(() => {
    if (!scene) return
    
    scene.traverse((child) => {
      if ((child as any).isMesh) {
        const mesh = child as THREE.Mesh
        const material = mesh.material as THREE.MeshStandardMaterial
        if (material && material.emissiveIntensity !== undefined) {
          material.emissiveIntensity = isCurrentModel ? 1 : 0.5
        }
      }
    })
  }, [scene, isCurrentModel])

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
    <animated.group 
      {...props}
      position-x={positionX}
      position-y={positionY}
      position-z={positionZ}
      rotation={config.rotation}
      scale={animatedScale}
    >
      <primitive object={scene} />
      {children}
      
      {/* 현재 모델일 때만 OrbitControls 활성화 */}
      {isCurrentModel && (
        <OrbitControls 
          autoRotate={true} 
          autoRotateSpeed={0.05} 
          enableZoom={false}
          enablePan={false}
          enableDamping 
          makeDefault 
          target={[0, 1.5, 0]}
          minPolarAngle={Math.PI / 3}
          maxPolarAngle={Math.PI / 3}
          minAzimuthAngle={-Math.PI / -2} // 좌측 90도 제한
          maxAzimuthAngle={Math.PI / -2} // 우측 90도 제한 (총 180도)
        />
      )}
    </animated.group>
  )
}
