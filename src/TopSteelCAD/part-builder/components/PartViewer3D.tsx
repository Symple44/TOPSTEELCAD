import React, { useEffect, useRef, useState } from 'react';
import { Button, Card, Badge } from './ui';
import { Eye, Move, RotateCw, ZoomIn, ZoomOut, Grid3X3, Home } from 'lucide-react';

import { Part, FaceType, ProfileType } from '../types';
import { FaceMapper } from '../utils/faceMapper';
import { PatternGenerator } from '../utils/patternGenerator';
import { Vector3 } from '../utils/Vector3';

interface PartViewer3DProps {
  part: Part;
  selectedFace: FaceType;
  selectedFeatureId: string | null;
  onFaceSelect: (face: FaceType) => void;
  onFeatureSelect: (featureId: string | null) => void;
  previewMode: boolean;
  gridSnap: boolean;
  snapDistance: number;
}

export const PartViewer3D: React.FC<PartViewer3DProps> = ({
  part,
  selectedFace,
  selectedFeatureId,
  onFaceSelect,
  onFeatureSelect,
  previewMode,
  gridSnap,
  snapDistance,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [viewMode, setViewMode] = useState<'orbit' | 'pan' | 'zoom'>('orbit');
  const [showGrid, setShowGrid] = useState(true);
  const [showAxes, setShowAxes] = useState(true);

  const availableFaces = FaceMapper.getFacesForProfile(part.profileType);

  const generateHoleElements = () => {
    return part.features.holes.map(hole => {
      const positions = PatternGenerator.generateHolePositions(hole.position, hole.pattern || { type: 'SINGLE' });
      return positions.map((pos, idx) => ({
        id: `${hole.id}-${idx}`,
        originalId: hole.id,
        type: 'hole' as const,
        position: FaceMapper.mapPositionToFace(pos, hole.face, part.profileType, part.dimensions, part.length),
        diameter: hole.diameter,
        depth: hole.depth,
        isThrough: hole.isThrough,
        face: hole.face,
      }));
    }).flat();
  };

  const generateNotchElements = () => {
    return part.features.notches.map(notch => ({
      id: notch.id,
      type: 'notch' as const,
      position: FaceMapper.mapPositionToFace(notch.position, notch.face, part.profileType, part.dimensions, part.length),
      width: notch.width,
      height: notch.height,
      depth: notch.depth,
      notchType: notch.type,
      face: notch.face,
    }));
  };

  const handleResetView = () => {
    console.log('Reset view to default');
  };

  const handleZoomIn = () => {
    console.log('Zoom in');
  };

  const handleZoomOut = () => {
    console.log('Zoom out');
  };

  useEffect(() => {
    if (!containerRef.current) return;

    console.log('Initialize 3D viewer with part:', part);

    const holes = generateHoleElements();
    const notches = generateNotchElements();

    console.log('Generated features:', { holes, notches });

    return () => {
      console.log('Cleanup 3D viewer');
    };
  }, [part, selectedFace, selectedFeatureId, previewMode]);

  return (
    <div className="relative h-full bg-gray-100" ref={containerRef}>
      <div className="absolute top-4 left-4 z-10 space-y-4">
        <Card className="p-2">
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant={viewMode === 'orbit' ? 'default' : 'outline'}
              onClick={() => setViewMode('orbit')}
            >
              <RotateCw className="h-4 w-4" />
            </Button>
            <Button
              size="sm"
              variant={viewMode === 'pan' ? 'default' : 'outline'}
              onClick={() => setViewMode('pan')}
            >
              <Move className="h-4 w-4" />
            </Button>
            <Button
              size="sm"
              variant={viewMode === 'zoom' ? 'default' : 'outline'}
              onClick={() => setViewMode('zoom')}
            >
              <ZoomIn className="h-4 w-4" />
            </Button>
          </div>
        </Card>

        <Card className="p-2">
          <div className="flex flex-col gap-2">
            <Button size="sm" variant="outline" onClick={handleResetView}>
              <Home className="h-4 w-4" />
            </Button>
            <Button size="sm" variant="outline" onClick={handleZoomIn}>
              <ZoomIn className="h-4 w-4" />
            </Button>
            <Button size="sm" variant="outline" onClick={handleZoomOut}>
              <ZoomOut className="h-4 w-4" />
            </Button>
          </div>
        </Card>

        <Card className="p-2">
          <div className="flex flex-col gap-2">
            <Button
              size="sm"
              variant={showGrid ? 'default' : 'outline'}
              onClick={() => setShowGrid(!showGrid)}
            >
              <Grid3X3 className="h-4 w-4" />
            </Button>
            <Button
              size="sm"
              variant={showAxes ? 'default' : 'outline'}
              onClick={() => setShowAxes(!showAxes)}
            >
              <Eye className="h-4 w-4" />
            </Button>
          </div>
        </Card>
      </div>

      <div className="absolute top-4 right-4 z-10">
        <Card className="p-4">
          <div className="space-y-2">
            <div className="font-medium">Face Selection</div>
            <div className="flex flex-wrap gap-1 max-w-xs">
              {availableFaces.map(face => (
                <Badge
                  key={face}
                  className={`cursor-pointer ${
                    selectedFace === face
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-200 hover:bg-gray-300'
                  }`}
                  onClick={() => onFaceSelect(face)}
                >
                  {face.replace(/_/g, ' ')}
                </Badge>
              ))}
            </div>
          </div>
        </Card>
      </div>

      <div className="absolute bottom-4 left-4 z-10">
        <Card className="p-2">
          <div className="text-sm space-y-1">
            <div>Profile: {part.profileType}</div>
            <div>Length: {part.length}mm</div>
            <div>Holes: {part.features.holes.length}</div>
            <div>Notches: {part.features.notches.length}</div>
          </div>
        </Card>
      </div>

      {previewMode && (
        <div className="absolute bottom-4 right-4 z-10">
          <Badge variant="default" className="px-3 py-1">
            Preview Mode
          </Badge>
        </div>
      )}

      <div className="flex items-center justify-center h-full">
        <div className="text-gray-400 text-center">
          <div className="text-4xl mb-4">3D Viewer</div>
          <div className="text-lg">Profile: {part.profileType}</div>
          <div className="text-lg">Dimensions: {part.dimensions.height || 0} x {part.dimensions.width || 0} x {part.length}mm</div>
          <div className="mt-4 text-sm">
            Selected Face: {selectedFace}
          </div>
        </div>
      </div>
    </div>
  );
};