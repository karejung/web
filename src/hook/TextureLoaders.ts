import { KTX2Loader } from 'three/addons/loaders/KTX2Loader.js';
import { BASE_PATH } from '@/hook/basePath';

/**
 * 모바일 환경 감지
 */
function isMobileDevice(): boolean {
  if (typeof window === 'undefined') return false;
  
  // User agent 체크
  const userAgent = navigator.userAgent || navigator.vendor || (window as any).opera;
  const mobileRegex = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i;
  
  // 화면 크기 체크 (768px 이하를 모바일로 간주)
  const isSmallScreen = window.innerWidth <= 768;
  
  return mobileRegex.test(userAgent.toLowerCase()) || isSmallScreen;
}

/**
 * KTX2 URL을 모바일 버전으로 변환 (.ktx2 -> _m.ktx2)
 */
function getMobileTextureUrl(url: string): string {
  if (url.endsWith('.ktx2') && !url.endsWith('_m.ktx2')) {
    return url.replace('.ktx2', '_m.ktx2');
  }
  return url;
}

/**
 * 모바일용 KTX2Loader 래퍼 - _m 버전 우선 로드, 실패 시 원본으로 폴백
 */
class MobileAwareKTX2Loader extends KTX2Loader {
  private isMobile: boolean;

  constructor() {
    super();
    this.isMobile = isMobileDevice();
  }

  load(
    url: string,
    onLoad: (texture: any) => void,
    onProgress?: (event: ProgressEvent) => void,
    onError?: (error: unknown) => void
  ): any {
    // 모바일이 아니면 원본 로드
    if (!this.isMobile) {
      return super.load(url, onLoad, onProgress, onError);
    }

    // 모바일: _m 버전 먼저 시도
    const mobileUrl = getMobileTextureUrl(url);
    
    // 이미 _m 버전이거나 변환 불가능한 경우 원본 로드
    if (mobileUrl === url) {
      return super.load(url, onLoad, onProgress, onError);
    }

    console.log(`[Mobile] Trying: ${mobileUrl}`);

    // _m 버전 시도, 실패하면 원본으로 폴백
    return super.load(
      mobileUrl,
      (texture) => {
        console.log(`[Mobile] Loaded: ${mobileUrl}`);
        onLoad(texture);
      },
      onProgress,
      (error) => {
        console.warn(`[Mobile] Fallback to original: ${url}`);
        super.load(url, onLoad, onProgress, onError);
      }
    );
  }
}

/**
 * KTX2Loader 싱글톤 관리 클래스 (WebGPU/WebGL 지원)
 */
export class TextureLoaderManager {
  private static instance: TextureLoaderManager | null = null;
  private ktx2Loader: KTX2Loader | null = null;

  private constructor() {}

  public static getInstance(): TextureLoaderManager {
    if (!TextureLoaderManager.instance) {
      TextureLoaderManager.instance = new TextureLoaderManager();
    }
    return TextureLoaderManager.instance;
  }

  public initializeKTX2Loader(renderer: any): KTX2Loader {
    if (!this.ktx2Loader) {
      // 모바일 환경에서는 MobileAwareKTX2Loader 사용
      const ktx2Loader = new MobileAwareKTX2Loader();
      ktx2Loader.setTranscoderPath(`${BASE_PATH}/basis/`);
      
      if (renderer) {
        try {
          ktx2Loader.detectSupport(renderer);
        } catch (error) {
          console.warn('KTX2 detectSupport error:', error);
        }
      }
      
      ktx2Loader.setWorkerLimit(2);
      this.ktx2Loader = ktx2Loader;
    }
    return this.ktx2Loader;
  }

  public dispose(): void {
    if (this.ktx2Loader) {
      this.ktx2Loader.dispose();
      this.ktx2Loader = null;
    }
  }
}
