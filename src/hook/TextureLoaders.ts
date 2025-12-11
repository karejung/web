import { KTX2Loader } from 'three/addons/loaders/KTX2Loader.js';
import { BASE_PATH } from '@/hook/basePath';

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
      const ktx2Loader = new KTX2Loader();
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
