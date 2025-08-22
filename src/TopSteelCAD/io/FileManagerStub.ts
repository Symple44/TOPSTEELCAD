/**
 * FileManager - Version stub minimale pour compilation
 */
import * as THREE from 'three';

export enum FileFormat {
  GLTF = 'gltf',
  GLB = 'glb',
  OBJ = 'obj',
  STL = 'stl',
  FBX = 'fbx',
  DSTV = 'dstv',
  IFC = 'ifc',
  STEP = 'step'
}

export interface ExportOptions {
  format: FileFormat;
  binary?: boolean;
  embedTextures?: boolean;
  animations?: boolean;
}

export interface ImportOptions {
  format?: FileFormat;
  centerModel?: boolean;
  normalizeScale?: boolean;
}

export class FileManager {
  constructor() {
    console.warn('FileManager: stub implementation');
  }

  async exportScene(_scene: THREE.Scene, _options: ExportOptions): Promise<Blob> {
    console.warn('FileManager.exportScene: stub implementation');
    return new Blob();
  }

  async importFile(_file: File, _options?: ImportOptions): Promise<THREE.Group> {
    console.warn('FileManager.importFile: stub implementation');
    return new THREE.Group();
  }

  async saveToFile(_blob: Blob, _filename: string): Promise<void> {
    console.warn('FileManager.saveToFile: stub implementation');
  }
}