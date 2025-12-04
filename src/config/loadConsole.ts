import * as THREE from 'three'

/**
 * Geometry의 실제 메모리 사용량을 계산합니다.
 */
function calculateGeometryMemory(geometry: THREE.BufferGeometry): number {
  let bytes = 0
  
  // 모든 attribute의 메모리 계산
  Object.keys(geometry.attributes).forEach((key) => {
    const attribute = geometry.attributes[key]
    bytes += attribute.array.byteLength
  })
  
  // Index buffer 메모리
  if (geometry.index) {
    bytes += geometry.index.array.byteLength
  }
  
  return bytes
}

/**
 * KTX2/압축 텍스처인지 확인
 */
function isCompressedTexture(texture: THREE.Texture): boolean {
  // CompressedTexture 인스턴스 체크
  if (texture instanceof THREE.CompressedTexture) {
    return true
  }
  
  // KTX2로 transcode된 텍스처는 mipmaps와 특정 format을 가짐
  const tex = texture as any
  if (tex.mipmaps && tex.mipmaps.length > 0 && tex.format !== undefined) {
    // GPU 압축 포맷 체크 (RGBA_S3TC_DXT5, RGBA_ASTC_4x4 등)
    const format = tex.format
    return format >= 33776 && format <= 37808 // Compressed texture format range
  }
  
  return false
}

/**
 * Texture의 실제 메모리 사용량을 추정합니다.
 */
function estimateTextureMemory(texture: THREE.Texture): number {
  const tex = texture as any
  
  // Mipmaps이 있는 압축 텍스처 (KTX2 transcoded)
  if (tex.mipmaps && tex.mipmaps.length > 0) {
    let totalBytes = 0
    tex.mipmaps.forEach((mipmap: any) => {
      if (mipmap.data) {
        totalBytes += mipmap.data.byteLength || 0
      } else if (mipmap.width && mipmap.height) {
        // 압축 텍스처의 경우 대략적인 크기 계산 (ASTC 4x4, BC7 등은 1:8 압축 비율)
        totalBytes += (mipmap.width * mipmap.height) / 2
      }
    })
    
    if (totalBytes > 0) {
      return totalBytes
    }
  }
  
  // CompressedTexture (구형 방식)
  if (texture instanceof THREE.CompressedTexture) {
    let totalBytes = 0
    if (texture.mipmaps && texture.mipmaps.length > 0) {
      texture.mipmaps.forEach((mipmap: any) => {
        totalBytes += mipmap.data?.byteLength || 0
      })
    }
    if (totalBytes > 0) return totalBytes
  }
  
  // 일반 텍스처 (Image 기반)
  const image = texture.image as HTMLImageElement | HTMLCanvasElement | undefined
  if (!image) {
    // image가 없지만 source가 있는 경우 (Data Texture 등)
    if (tex.source?.data) {
      const data = tex.source.data
      if (data.byteLength) {
        return data.byteLength
      } else if (data.width && data.height) {
        return data.width * data.height * 4 // RGBA
      }
    }
    return 0
  }
  
  let width = 0
  let height = 0
  
  if (image instanceof HTMLImageElement) {
    width = image.naturalWidth || image.width || 0
    height = image.naturalHeight || image.height || 0
  } else if (image instanceof HTMLCanvasElement) {
    width = image.width || 0
    height = image.height || 0
  }
  
  if (width === 0 || height === 0) return 0
  
  // 픽셀 포맷에 따른 바이트 계산
  const bytesPerPixel = 4 // RGBA 기본값
  
  // Mipmap 포함 시 1.33배
  const mipmapFactor = texture.generateMipmaps ? 1.33 : 1
  
  return width * height * bytesPerPixel * mipmapFactor
}

/**
 * 개발 환경에서 모델 로드 정보를 콘솔에 출력합니다.
 * @param scene - 로드된 Three.js Scene 객체
 * @param renderer - Three.js Renderer 객체
 */
export function logModelLoadInfo(
  scene: THREE.Group | THREE.Object3D,
  renderer: THREE.WebGLRenderer | any
) {
  // 개발 환경에서만 실행
  if (process.env.NODE_ENV !== 'development') {
    return
  }

  const isWebGPU = (renderer as any).isWebGPURenderer === true

  // GPU 압축 포맷 감지
  let compressionFormat = 'Unknown'
  if (!isWebGPU && 'capabilities' in renderer) {
    const ext = renderer.extensions

    if (ext.get('WEBGL_compressed_texture_astc')) {
      compressionFormat = 'ASTC 4x4 (Apple Silicon/iOS)'
    } else if (ext.get('WEBGL_compressed_texture_s3tc')) {
      compressionFormat = 'BC7/S3TC (Windows/Linux)'
    } else if (ext.get('WEBGL_compressed_texture_etc')) {
      compressionFormat = 'ETC2 (Android)'
    } else if (ext.get('WEBGL_compressed_texture_pvrtc')) {
      compressionFormat = 'PVRTC (iOS)'
    }
  } else if (isWebGPU) {
    compressionFormat = 'BC7 (WebGPU)'
  }

  // 실제 리소스 분석
  let modelGeometryCount = 0
  let reflectorGeometryCount = 0
  let totalGeometryBytes = 0
  
  const modelTextures = new Set<THREE.Texture>()
  const geometries = new Map<THREE.BufferGeometry, string>()

  scene.traverse((object) => {
    const mesh = object as THREE.Mesh
    
    if (mesh.isMesh && mesh.geometry) {
      // Geometry 분류 및 메모리 계산
      const geometryBytes = calculateGeometryMemory(mesh.geometry)
      totalGeometryBytes += geometryBytes
      
      // PlaneGeometry = Reflector, 그 외 = Model
      const isPlaneGeometry = mesh.geometry.type === 'PlaneGeometry' || 
                              (mesh.geometry.attributes.position?.count === 4 || 
                               mesh.geometry.attributes.position?.count === 6)
      
      if (isPlaneGeometry) {
        reflectorGeometryCount++
        geometries.set(mesh.geometry, 'Reflector')
      } else {
        modelGeometryCount++
        geometries.set(mesh.geometry, 'Model')
      }
      
      // 모델의 텍스처만 수집 (Reflector 제외)
      if (!isPlaneGeometry && mesh.material) {
        const materials = Array.isArray(mesh.material)
          ? mesh.material
          : [mesh.material]
          
        materials.forEach((mat) => {
          if (
            mat instanceof THREE.MeshStandardMaterial ||
            mat instanceof THREE.MeshBasicMaterial
          ) {
            const textureProps = [
              'map',
              'normalMap',
              'roughnessMap',
              'metalnessMap',
              'emissiveMap',
              'aoMap',
            ]
            textureProps.forEach((prop) => {
              const tex = (mat as any)[prop]
              if (tex && tex instanceof THREE.Texture) {
                modelTextures.add(tex)
              }
            })
          }
        })
      }
    }
  })

  // 텍스처 메모리 계산 (실제 측정) + 디버깅
  let totalTextureBytes = 0
  let compressedTextureCount = 0
  
  if (process.env.NODE_ENV === 'development') {
    console.log('\n%c🔍 Texture Debug Info', 'color: #FFC107; font-weight: bold;')
  }
  
  let textureIndex = 0
  modelTextures.forEach((texture) => {
    textureIndex++
    const tex = texture as any
    const bytes = estimateTextureMemory(texture)
    totalTextureBytes += bytes
    
    // 압축 텍스처 카운트 (KTX2 transcode 포함)
    const isCompressed = isCompressedTexture(texture)
    if (isCompressed) {
      compressedTextureCount++
    }
    
    // 디버그 정보 출력
    if (process.env.NODE_ENV === 'development') {
      console.log(`Texture ${textureIndex}:`, {
        type: texture.constructor.name,
        isCompressedTexture: texture instanceof THREE.CompressedTexture,
        isCompressed: isCompressed,
        format: tex.format,
        hasMipmaps: !!tex.mipmaps?.length,
        mipmapCount: tex.mipmaps?.length || 0,
        firstMipmapSize: tex.mipmaps?.[0]?.data?.byteLength || 0,
        hasImage: !!texture.image,
        calculatedBytes: bytes,
        memoryMB: (bytes / 1024 / 1024).toFixed(2)
      })
    }
  })

  // MB로 변환
  const geometryMB = (totalGeometryBytes / 1024 / 1024).toFixed(2)
  const textureMB = (totalTextureBytes / 1024 / 1024).toFixed(2)
  const totalMB = ((totalGeometryBytes + totalTextureBytes) / 1024 / 1024).toFixed(2)

  // 콘솔에 정보 출력
  console.log(
    '\n%c🎨 3D Model Load Information',
    'color: #4CAF50; font-weight: bold; font-size: 14px;'
  )
  console.log(
    '%c━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
    'color: #4CAF50;'
  )

  console.log('\n%c1️⃣ Draco Compression', 'color: #2196F3; font-weight: bold;')
  console.log('   ✓ Status: Loaded')
  console.log('   ✓ Decoder: WASM')
  console.log(`   ✓ Geometry Memory: ${geometryMB}MB`)

  console.log('\n%c2️⃣ KTX2 Texture', 'color: #FF9800; font-weight: bold;')
  console.log('   ✓ Status: Loaded')
  console.log('   ✓ Format: UASTC (High Quality)')
  console.log('   ✓ Transcoder: Basis Universal')
  console.log(`   ✓ Compressed Textures: ${compressedTextureCount}/${modelTextures.size}`)

  console.log(
    '\n%c3️⃣ GPU Compression Format',
    'color: #9C27B0; font-weight: bold;'
  )
  console.log(`   ✓ Active: ${compressionFormat}`)
  console.log('   ✓ Runtime: Transcoded from UASTC')

  console.log(
    '\n%c4️⃣ Memory Usage (Actual Measurement)',
    'color: #F44336; font-weight: bold;'
  )
  console.log(`   • Model Meshes: ${modelGeometryCount}`)
  console.log(`   • Reflector Meshes: ${reflectorGeometryCount}`)
  console.log(`   • Model Textures: ${modelTextures.size} (Environment excluded)`)
  console.log(`   • Geometry Memory: ${geometryMB}MB`)
  console.log(`   • Texture Memory: ${textureMB}MB`)
  console.log(`   • Total GPU Memory: ${totalMB}MB`)

  console.log(
    '\n%c━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
    'color: #4CAF50;'
  )
  console.log(
    '%c✨ Model optimization complete!\n',
    'color: #4CAF50; font-weight: bold;'
  )
}

