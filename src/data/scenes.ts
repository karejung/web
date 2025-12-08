export type Position3D = [number, number, number];
export type Rotation3D = [number, number, number];
export type Scale3D = [number, number, number];
export type Size2D = [number, number];
export type ColorString = string;


export interface ModelConfig {
  component: string;
  scale: number;
  position: Position3D;
  rotation: Rotation3D;
}

export interface Label {
  title: string;
  content: string;
  position: Position3D;
}

export interface ReflectorItemConfig {
  type?: 'plane' | 'floor';
  position: Position3D;
  rotation: Rotation3D;
  args?: Size2D;
  radius?: number;
  resolution?: number;
  mixStrength?: number;
  color?: ColorString;
  roughness?: number;
  metalness?: number;
  opacity?: number;
  overlayOpacity?: number;
  overlayOffset?: Position3D;
  meshPath?: string;
}

export interface ReflectorConfig {
  enabled: boolean;
  items: ReflectorItemConfig[];
}

export interface SceneConfig {
  id: string;
  title: string;
  location: string;
  description?: string;
  thumbnail?: string;
  model: ModelConfig;
  labels?: Label[];
  reflector?: ReflectorConfig;
}

export const scenesData: SceneConfig[] = [
  {
    id: "1",
    title: "Klar's Room",
    location: "Tokyo, Japan",
    model: {
      component: "1",
      scale: 1,
      position: [0, 0, 0],
      rotation: [0, 0, 0],
    },
    reflector: {
      enabled: true,
      items: [
        {
          type: 'plane',
          position: [0, 1, 1.75],
          rotation: [-Math.PI / 1, 0, 0],
          args: [1.74, 1.96],
          mixStrength: 0.1,
          color: "#222222",
          overlayOpacity: 0.5,
          overlayOffset: [0, 0, -0.01]
        },
        {
          type: 'plane',
          position: [-1.16, 0.6, 1.64],
          rotation: [-Math.PI / 1.025, 0, 0],
          args: [.25, 1.11],
          mixStrength: 0.5,
          color: "#222222",
          overlayOpacity: 0,
          overlayOffset: [0, 0, -0.01]
        },
        {
          type: 'floor',
          meshPath: "/gltf/1/texture/reflector.glb",
          position: [0, 0.01, 0],
          rotation: [-Math.PI / 2, 0, 0],
          resolution: 1024,
          mixStrength: 0.5,
          color: "#222222",
          opacity: 0.05,
          roughness: 0.8,
          metalness: 0.1
        }
      ]
    }
  },
  {
    id: "2",
    title: "Scene 2",
    location: "Location",
    model: {
      component: "2",
      scale: 1,
      position: [0, 0, 0],
      rotation: [0, 0, 0],
    },
    reflector: {
      enabled: true,
      items: [
        {
          type: 'plane',
          position: [3.15, 1.85, 0],
          rotation: [0, -Math.PI / 2, 0],
          args: [2, 3.26],
          mixStrength: 0.5,
          color: "#222222",
          overlayOpacity: 0,
          overlayOffset: [0, 0, -0.01]
        },
        {
          type: 'plane',
          position: [-1.64, 0.72, -2.31],
          rotation: [-Math.PI / 24, 0, Math.PI / 1],
          args: [0.84, 1.43],
          mixStrength: 0.5,
          color: "#222222",
          overlayOpacity: 0,
          overlayOffset: [0, 0, -0.01]
        }
      ]
    }
  },
];