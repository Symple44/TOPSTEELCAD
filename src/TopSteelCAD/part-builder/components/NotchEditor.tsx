import React, { useState } from 'react';
import {
  Card, CardContent, CardHeader, CardTitle,
  Button,
  Input,
  Label,
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from './ui';
import { Plus, Square, Circle, Triangle } from 'lucide-react';

import { Notch, NotchType, FaceType } from '../types';
import { Vector3 } from '../utils/Vector3';

interface NotchEditorProps {
  selectedFace: FaceType;
  onAddNotch: (notch: Omit<Notch, 'id'>) => void;
  gridSnap: boolean;
  snapDistance: number;
}

export const NotchEditor: React.FC<NotchEditorProps> = ({
  selectedFace,
  onAddNotch,
  gridSnap,
  snapDistance,
}) => {
  const [notchType, setNotchType] = useState<NotchType>('RECTANGULAR');
  const [position, setPosition] = useState({ x: 0, y: 0, z: 0 });
  const [width, setWidth] = useState(50);
  const [height, setHeight] = useState(30);
  const [depth, setDepth] = useState(10);
  const [radius, setRadius] = useState(10);
  const [angle, setAngle] = useState(90);

  const snapValue = (value: number) => {
    if (!gridSnap) return value;
    return Math.round(value / snapDistance) * snapDistance;
  };

  const handleAddNotch = () => {
    const snappedPosition = new Vector3(
      snapValue(position.x),
      snapValue(position.y),
      snapValue(position.z)
    );

    const notch: Omit<Notch, 'id'> = {
      type: notchType,
      position: snappedPosition,
      width: snapValue(width),
      height: snapValue(height),
      depth: snapValue(depth),
      radius: notchType === 'CIRCULAR' || notchType === 'U_SHAPE' ? radius : undefined,
      angle: notchType === 'V_SHAPE' ? angle : undefined,
      face: selectedFace,
    };

    onAddNotch(notch);
  };

  const getNotchIcon = (type: NotchType) => {
    switch (type) {
      case 'RECTANGULAR':
        return <Square className="h-4 w-4" />;
      case 'CIRCULAR':
        return <Circle className="h-4 w-4" />;
      case 'V_SHAPE':
      case 'U_SHAPE':
        return <Triangle className="h-4 w-4" />;
      default:
        return <Square className="h-4 w-4" />;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Add Notches</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label>Selected Face: {selectedFace}</Label>
        </div>

        <div>
          <Label>Notch Type</Label>
          <Select value={notchType} onValueChange={(value) => setNotchType(value as NotchType)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="RECTANGULAR">
                <div className="flex items-center gap-2">
                  <Square className="h-4 w-4" />
                  <span>Rectangular</span>
                </div>
              </SelectItem>
              <SelectItem value="CIRCULAR">
                <div className="flex items-center gap-2">
                  <Circle className="h-4 w-4" />
                  <span>Circular</span>
                </div>
              </SelectItem>
              <SelectItem value="V_SHAPE">
                <div className="flex items-center gap-2">
                  <Triangle className="h-4 w-4" />
                  <span>V-Shape</span>
                </div>
              </SelectItem>
              <SelectItem value="U_SHAPE">
                <div className="flex items-center gap-2">
                  <Circle className="h-4 w-4" />
                  <span>U-Shape</span>
                </div>
              </SelectItem>
              <SelectItem value="CUSTOM">
                <span>Custom Shape</span>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label>Position</Label>
          <div className="grid grid-cols-3 gap-2">
            <div>
              <Label className="text-xs">X</Label>
              <Input
                type="number"
                value={position.x}
                onChange={(e) => setPosition(prev => ({ ...prev, x: Number(e.target.value) }))}
                step={gridSnap ? snapDistance : 1}
              />
            </div>
            <div>
              <Label className="text-xs">Y</Label>
              <Input
                type="number"
                value={position.y}
                onChange={(e) => setPosition(prev => ({ ...prev, y: Number(e.target.value) }))}
                step={gridSnap ? snapDistance : 1}
              />
            </div>
            <div>
              <Label className="text-xs">Z</Label>
              <Input
                type="number"
                value={position.z}
                onChange={(e) => setPosition(prev => ({ ...prev, z: Number(e.target.value) }))}
                step={gridSnap ? snapDistance : 1}
              />
            </div>
          </div>
        </div>

        <div>
          <Label>Dimensions</Label>
          <div className="space-y-2">
            {notchType !== 'CIRCULAR' && (
              <div>
                <Label className="text-xs">Width (mm)</Label>
                <Input
                  type="number"
                  value={width}
                  onChange={(e) => setWidth(Number(e.target.value))}
                  step={gridSnap ? snapDistance : 1}
                />
              </div>
            )}

            {notchType !== 'CIRCULAR' && (
              <div>
                <Label className="text-xs">Height (mm)</Label>
                <Input
                  type="number"
                  value={height}
                  onChange={(e) => setHeight(Number(e.target.value))}
                  step={gridSnap ? snapDistance : 1}
                />
              </div>
            )}

            <div>
              <Label className="text-xs">Depth (mm)</Label>
              <Input
                type="number"
                value={depth}
                onChange={(e) => setDepth(Number(e.target.value))}
                step={gridSnap ? snapDistance : 1}
              />
            </div>

            {(notchType === 'CIRCULAR' || notchType === 'U_SHAPE') && (
              <div>
                <Label className="text-xs">Radius (mm)</Label>
                <Input
                  type="number"
                  value={radius}
                  onChange={(e) => setRadius(Number(e.target.value))}
                  min={1}
                />
              </div>
            )}

            {notchType === 'V_SHAPE' && (
              <div>
                <Label className="text-xs">Angle (degrees)</Label>
                <Input
                  type="number"
                  value={angle}
                  onChange={(e) => setAngle(Number(e.target.value))}
                  min={1}
                  max={179}
                />
              </div>
            )}
          </div>
        </div>

        <div>
          <Label>Presets</Label>
          <div className="grid grid-cols-2 gap-2 mt-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setNotchType('RECTANGULAR');
                setWidth(50);
                setHeight(30);
                setDepth(10);
              }}
            >
              Standard Rect
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setNotchType('CIRCULAR');
                setRadius(25);
                setDepth(10);
              }}
            >
              Standard Circle
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setNotchType('V_SHAPE');
                setWidth(40);
                setHeight(40);
                setDepth(10);
                setAngle(90);
              }}
            >
              V-90°
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setNotchType('U_SHAPE');
                setWidth(50);
                setHeight(40);
                setDepth(10);
                setRadius(20);
              }}
            >
              U-Shape
            </Button>
          </div>
        </div>

        <Button onClick={handleAddNotch} className="w-full">
          <Plus className="h-4 w-4 mr-2" />
          Add Notch
        </Button>
      </CardContent>
    </Card>
  );
};