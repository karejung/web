import { useMemo, useEffect } from 'react'
import * as THREE from 'three/webgpu'
import { reflector, uniform } from 'three/tsl'
import { useGLTF } from '@react-three/drei'
import { BASE_PATH } from '@/config/basePath'
import { useScreenSize } from '@/config/useScreenSize'
import type { ReflectorItemConfig } from '@/data/scenes'

type ReflectorProps = React.JSX.IntrinsicElements['group'] & {
  items?: ReflectorItemConfig[]
}

// 화면 크기에 따른 리플렉터 해상도 반환
function getReflectorResolution(width: number): number {
  if (width <= 480) return 512;    // 모바일
  if (width <= 768) return 1024;  // 태블릿
  return 2048;                      // PC
}

// 둥근 모서리 Shape 생성 함수 (추후 구현용)
const createRoundedRectShape = (width: number, height: number, radius: number) => {
  const shape = new THREE.Shape()
  const x = -width / 2
  const y = -height / 2
  
  shape.moveTo(x, y + radius)
  shape.lineTo(x, y + height - radius)
  shape.quadraticCurveTo(x, y + height, x + radius, y + height)
  shape.lineTo(x + width - radius, y + height)
  shape.quadraticCurveTo(x + width, y + height, x + width, y + height - radius)
  shape.lineTo(x + width, y + radius)
  shape.quadraticCurveTo(x + width, y, x + width - radius, y)
  shape.lineTo(x + radius, y)
  shape.quadraticCurveTo(x, y, x, y + radius)
  
  return shape
}

export function Reflector({ items = [], ...props }: ReflectorProps) {
  const { width } = useScreenSize();
  const baseResolution = getReflectorResolution(width);

  // 평면 리플렉터 처리
  const planeReflectors = useMemo(() => {
    return items
      .filter(item => !item.type || item.type === 'plane')
      .map((item) => {
        // WebGPU reflector 생성 (반응형 해상도)
        const resolution = item.resolution ?? baseResolution;
        const resolutionScale = resolution / 2048;
        const reflection = reflector({ 
          resolutionScale, 
          depth: true, 
          bounces: false 
        })
        
        // rotation을 quaternion으로 변환하여 적용
        const euler = new THREE.Euler(item.rotation[0], item.rotation[1], item.rotation[2])
        reflection.target.quaternion.setFromEuler(euler)
        reflection.target.position.set(item.position[0], item.position[1], item.position[2])
        
        // intensity uniform
        const intensity = item.mixStrength ?? 1
        const intensityUniform = uniform(intensity)
        
        // geometry 생성 (radius 지원)
        const width = item.args?.[0] ?? 1
        const height = item.args?.[1] ?? 1
        const radius = item.radius ?? 0
        
        // material 생성
        const material = new THREE.MeshStandardNodeMaterial()
        material.color = new THREE.Color(item.color || '#000')
        material.transparent = true
        material.opacity = item.opacity ?? 1
        material.emissiveNode = reflection.mul(intensityUniform)
        material.roughness = item.roughness ?? 0.8
        material.metalness = item.metalness ?? 0.1
        
        return {
          reflection,
          material,
          position: item.position,
          rotation: item.rotation,
          width,
          height,
          radius,
          overlayOpacity: item.overlayOpacity,
          overlayOffset: item.overlayOffset
        }
      })
  }, [items, baseResolution])

  // 바닥 메시 리플렉터 처리
  const floorReflectors = useMemo(() => {
    return items
      .filter(item => item.type === 'floor')
      .map((item) => {
        // WebGPU reflector 생성 (반응형 해상도)
        const resolution = item.resolution ?? baseResolution;
        const resolutionScale = resolution / 2048;
        const reflection = reflector({ 
          resolutionScale, 
          depth: true, 
          bounces: false 
        })
        
        // rotation 적용
        const euler = new THREE.Euler(item.rotation[0], item.rotation[1], item.rotation[2])
        reflection.target.quaternion.setFromEuler(euler)
        reflection.target.position.set(item.position[0], item.position[1], item.position[2])
        
        // intensity uniform
        const intensity = item.mixStrength ?? 0.5
        const intensityUniform = uniform(intensity)
        
        // material 생성
        const material = new THREE.MeshStandardNodeMaterial()
        material.color = new THREE.Color(item.color || '#222222')
        material.transparent = true
        material.opacity = item.opacity ?? 0.05
        material.emissiveNode = reflection.mul(intensityUniform)
        material.roughness = item.roughness ?? 0.8
        material.metalness = item.metalness ?? 0.1

        return { 
          reflection, 
          material, 
          meshPath: item.meshPath!,
          position: item.position
        }
      })
  }, [items, baseResolution])

  return (
    <group {...props}>
      {/* 평면 리플렉터들 */}
      {planeReflectors.map((item, index) => (
        <group key={`plane-${index}`}>
          {/* reflection target (보이지 않음) */}
          <primitive object={item.reflection.target} />
          
          {/* 실제 반사 mesh */}
          <mesh 
            position={item.position} 
            rotation={item.rotation}
            receiveShadow
          >
            {item.radius > 0 ? (
              <shapeGeometry args={[createRoundedRectShape(item.width, item.height, item.radius)]} />
            ) : (
              <planeGeometry args={[item.width, item.height]} />
            )}
            <primitive object={item.material} />
          </mesh>

          {/* 오버레이 메시 (overlayOpacity가 0이 아닐 때만) */}
          {item.overlayOpacity !== undefined && item.overlayOpacity !== 0 && (
            <mesh
              position={[
                item.position[0] + (item.overlayOffset?.[0] ?? 0),
                item.position[1] + (item.overlayOffset?.[1] ?? 0),
                item.position[2] + (item.overlayOffset?.[2] ?? 0)
              ]}
              rotation={item.rotation}
            >
              {item.radius > 0 ? (
                <shapeGeometry args={[createRoundedRectShape(item.width, item.height, item.radius)]} />
              ) : (
                <planeGeometry args={[item.width, item.height]} />
              )}
              <meshBasicMaterial
                color="#000000"
                transparent
                opacity={item.overlayOpacity}
                side={THREE.FrontSide}
              />
            </mesh>
          )}
        </group>
      ))}

      {/* 바닥 메시 리플렉터들 */}
      {floorReflectors.map((item, index) => (
        <FloorReflector 
          key={`floor-${index}`}
          reflection={item.reflection}
          material={item.material}
          meshPath={item.meshPath}
          position={item.position}
        />
      ))}
    </group>
  )
}

// 바닥 메시 리플렉터 컴포넌트
function FloorReflector({ 
  reflection, 
  material, 
  meshPath, 
  position 
}: { 
  reflection: any
  material: THREE.MeshStandardNodeMaterial
  meshPath: string
  position: [number, number, number]
}) {
  const { scene: floorScene } = useGLTF(`${BASE_PATH}${meshPath}`)

  // 바닥 메시에 material 적용
  useEffect(() => {
    if (!floorScene) return

    floorScene.traverse((child) => {
      if ((child as any).isMesh) {
        const mesh = child as THREE.Mesh
        mesh.material = material
        mesh.receiveShadow = true
      }
    })
  }, [floorScene, material])

  return (
    <>
      <primitive object={reflection.target} position={position} />
      <primitive object={floorScene} position={position} />
    </>
  )
}
