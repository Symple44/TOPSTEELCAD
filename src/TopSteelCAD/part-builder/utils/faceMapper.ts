import { Vector3 } from './Vector3';
import { FaceType, ProfileDimensions, ProfileType } from '../types';

export class FaceMapper {
  static mapPositionToFace(
    localPosition: Vector3,
    face: FaceType,
    profileType: ProfileType,
    dimensions: ProfileDimensions,
    length: number
  ): Vector3 {
    switch (profileType) {
      case 'IPE':
      case 'HEA':
      case 'HEB':
        return this.mapIShapePosition(localPosition, face, dimensions, length);
      case 'UPE':
      case 'UAP':
        return this.mapUShapePosition(localPosition, face, dimensions, length);
      case 'L':
        return this.mapLShapePosition(localPosition, face, dimensions, length);
      case 'RHS':
        return this.mapRHSPosition(localPosition, face, dimensions, length);
      case 'CHS':
        return this.mapCHSPosition(localPosition, face, dimensions, length);
      case 'T':
        return this.mapTShapePosition(localPosition, face, dimensions, length);
      case 'PLATE':
        return this.mapPlatePosition(localPosition, face, dimensions, length);
      default:
        return localPosition;
    }
  }

  private static mapIShapePosition(
    localPos: Vector3,
    face: FaceType,
    dimensions: ProfileDimensions,
    length: number
  ): Vector3 {
    const h = dimensions.height || 0;
    const w = dimensions.width || 0;
    const tw = dimensions.webThickness || 0;
    const tf = dimensions.flangeThickness || 0;

    switch (face) {
      case 'TOP_FLANGE':
        return new Vector3(
          localPos.x,
          h / 2,
          localPos.z
        );
      case 'BOTTOM_FLANGE':
        return new Vector3(
          localPos.x,
          -h / 2,
          localPos.z
        );
      case 'WEB_LEFT':
        return new Vector3(
          -tw / 2,
          localPos.y,
          localPos.z
        );
      case 'WEB_RIGHT':
        return new Vector3(
          tw / 2,
          localPos.y,
          localPos.z
        );
      case 'FRONT':
        return new Vector3(
          localPos.x,
          localPos.y,
          length / 2
        );
      case 'BACK':
        return new Vector3(
          localPos.x,
          localPos.y,
          -length / 2
        );
      default:
        return localPos;
    }
  }

  private static mapUShapePosition(
    localPos: Vector3,
    face: FaceType,
    dimensions: ProfileDimensions,
    length: number
  ): Vector3 {
    const h = dimensions.height || 0;
    const w = dimensions.width || 0;
    const tw = dimensions.webThickness || 0;
    const tf = dimensions.flangeThickness || 0;

    switch (face) {
      case 'TOP_FLANGE':
        return new Vector3(
          localPos.x,
          h / 2,
          localPos.z
        );
      case 'BOTTOM_FLANGE':
        return new Vector3(
          localPos.x,
          -h / 2,
          localPos.z
        );
      case 'WEB_LEFT':
        return new Vector3(
          -w / 2,
          localPos.y,
          localPos.z
        );
      default:
        return localPos;
    }
  }

  private static mapLShapePosition(
    localPos: Vector3,
    face: FaceType,
    dimensions: ProfileDimensions,
    length: number
  ): Vector3 {
    const h = dimensions.height || 0;
    const w = dimensions.width || 0;
    const t = dimensions.thickness || 0;

    switch (face) {
      case 'WEB_LEFT':
        return new Vector3(
          -t / 2,
          localPos.y,
          localPos.z
        );
      case 'WEB_RIGHT':
        return new Vector3(
          t / 2,
          localPos.y,
          localPos.z
        );
      case 'TOP_FLANGE':
        return new Vector3(
          localPos.x,
          t / 2,
          localPos.z
        );
      case 'BOTTOM_FLANGE':
        return new Vector3(
          localPos.x,
          -t / 2,
          localPos.z
        );
      default:
        return localPos;
    }
  }

  private static mapRHSPosition(
    localPos: Vector3,
    face: FaceType,
    dimensions: ProfileDimensions,
    length: number
  ): Vector3 {
    const h = dimensions.height || 0;
    const w = dimensions.width || 0;

    switch (face) {
      case 'TOP_FLANGE':
        return new Vector3(
          localPos.x,
          h / 2,
          localPos.z
        );
      case 'BOTTOM_FLANGE':
        return new Vector3(
          localPos.x,
          -h / 2,
          localPos.z
        );
      case 'WEB_LEFT':
        return new Vector3(
          -w / 2,
          localPos.y,
          localPos.z
        );
      case 'WEB_RIGHT':
        return new Vector3(
          w / 2,
          localPos.y,
          localPos.z
        );
      default:
        return localPos;
    }
  }

  private static mapCHSPosition(
    localPos: Vector3,
    face: FaceType,
    dimensions: ProfileDimensions,
    length: number
  ): Vector3 {
    const radius = dimensions.radius || 0;
    const angle = localPos.x;
    const z = localPos.z;

    return new Vector3(
      radius * Math.cos(angle),
      radius * Math.sin(angle),
      z
    );
  }

  private static mapTShapePosition(
    localPos: Vector3,
    face: FaceType,
    dimensions: ProfileDimensions,
    length: number
  ): Vector3 {
    const h = dimensions.height || 0;
    const w = dimensions.width || 0;
    const tw = dimensions.webThickness || 0;
    const tf = dimensions.flangeThickness || 0;

    switch (face) {
      case 'TOP_FLANGE':
        return new Vector3(
          localPos.x,
          h / 2,
          localPos.z
        );
      case 'WEB_LEFT':
        return new Vector3(
          -tw / 2,
          localPos.y,
          localPos.z
        );
      case 'WEB_RIGHT':
        return new Vector3(
          tw / 2,
          localPos.y,
          localPos.z
        );
      default:
        return localPos;
    }
  }

  private static mapPlatePosition(
    localPos: Vector3,
    face: FaceType,
    dimensions: ProfileDimensions,
    length: number
  ): Vector3 {
    const h = dimensions.height || 0;
    const w = dimensions.width || 0;
    const t = dimensions.thickness || 0;

    switch (face) {
      case 'TOP_FLANGE':
        return new Vector3(
          localPos.x,
          t / 2,
          localPos.z
        );
      case 'BOTTOM_FLANGE':
        return new Vector3(
          localPos.x,
          -t / 2,
          localPos.z
        );
      default:
        return localPos;
    }
  }

  static getFacesForProfile(profileType: ProfileType): FaceType[] {
    switch (profileType) {
      case 'IPE':
      case 'HEA':
      case 'HEB':
        return ['TOP_FLANGE', 'BOTTOM_FLANGE', 'WEB_LEFT', 'WEB_RIGHT', 'FRONT', 'BACK'];
      case 'UPE':
      case 'UAP':
        return ['TOP_FLANGE', 'BOTTOM_FLANGE', 'WEB_LEFT', 'FRONT', 'BACK'];
      case 'L':
        return ['WEB_LEFT', 'WEB_RIGHT', 'TOP_FLANGE', 'BOTTOM_FLANGE', 'FRONT', 'BACK'];
      case 'RHS':
        return ['TOP_FLANGE', 'BOTTOM_FLANGE', 'WEB_LEFT', 'WEB_RIGHT', 'FRONT', 'BACK'];
      case 'CHS':
        return ['FRONT', 'BACK'];
      case 'T':
        return ['TOP_FLANGE', 'WEB_LEFT', 'WEB_RIGHT', 'FRONT', 'BACK'];
      case 'PLATE':
        return ['TOP_FLANGE', 'BOTTOM_FLANGE', 'FRONT', 'BACK'];
      default:
        return [];
    }
  }
}