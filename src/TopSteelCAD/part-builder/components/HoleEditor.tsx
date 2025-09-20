import React, { useState } from 'react';
import {
  Card, CardContent, CardHeader, CardTitle,
  Button,
  Input,
  Label,
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
  Tabs, TabsContent, TabsList, TabsTrigger,
  Switch
} from './ui';
import { Plus, Grid3X3, Circle, Square, Minus } from 'lucide-react';

import { Hole, HolePattern, FaceType, HolePatternType } from '../types';
import { PatternGenerator } from '../utils/patternGenerator';
import { Vector3 } from '../utils/Vector3';

interface HoleEditorProps {
  selectedFace: FaceType;
  onAddHole: (hole: Omit<Hole, 'id'>) => void;
  gridSnap: boolean;
  snapDistance: number;
}

export const HoleEditor: React.FC<HoleEditorProps> = ({
  selectedFace,
  onAddHole,
  gridSnap,
  snapDistance,
}) => {
  const [diameter, setDiameter] = useState(10);
  const [isThrough, setIsThrough] = useState(true);
  const [depth, setDepth] = useState(20);
  const [position, setPosition] = useState({ x: 0, y: 0, z: 0 });
  const [patternType, setPatternType] = useState<HolePatternType>('SINGLE');
  const [patternSettings, setPatternSettings] = useState<HolePattern>({
    type: 'SINGLE',
  });

  const commonPatterns = PatternGenerator.generateCommonPatterns();

  const snapValue = (value: number) => {
    if (!gridSnap) return value;
    return Math.round(value / snapDistance) * snapDistance;
  };

  const handleAddHole = () => {
    const snappedPosition = new Vector3(
      snapValue(position.x),
      snapValue(position.y),
      snapValue(position.z)
    );

    const hole: Omit<Hole, 'id'> = {
      diameter,
      position: snappedPosition,
      depth: isThrough ? undefined : depth,
      isThrough,
      pattern: patternSettings,
      face: selectedFace,
    };

    onAddHole(hole);
  };

  const selectPresetPattern = (patternKey: string) => {
    const pattern = commonPatterns[patternKey as keyof typeof commonPatterns];
    setPatternSettings(pattern);
    setPatternType(pattern.type);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Add Holes</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label>Selected Face: {selectedFace}</Label>
        </div>

        <div>
          <Label>Diameter (mm)</Label>
          <Input
            type="number"
            value={diameter}
            onChange={(e) => setDiameter(Number(e.target.value))}
            min={1}
            step={0.5}
          />
        </div>

        <div className="flex items-center justify-between">
          <Label>Through Hole</Label>
          <Switch checked={isThrough} onCheckedChange={setIsThrough} />
        </div>

        {!isThrough && (
          <div>
            <Label>Depth (mm)</Label>
            <Input
              type="number"
              value={depth}
              onChange={(e) => setDepth(Number(e.target.value))}
              min={1}
            />
          </div>
        )}

        <div>
          <Label>Base Position</Label>
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
          <Label>Pattern Type</Label>
          <Tabs value={patternType} onValueChange={(value) => setPatternType(value as HolePatternType)}>
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="SINGLE">Single</TabsTrigger>
              <TabsTrigger value="LINE">Line</TabsTrigger>
              <TabsTrigger value="GRID">Grid</TabsTrigger>
              <TabsTrigger value="CIRCULAR">Circular</TabsTrigger>
            </TabsList>

            <TabsContent value="SINGLE">
              <p className="text-sm text-gray-600">Single hole at the specified position</p>
            </TabsContent>

            <TabsContent value="LINE">
              <div className="space-y-2">
                <div>
                  <Label>Count</Label>
                  <Input
                    type="number"
                    value={patternSettings.count || 2}
                    onChange={(e) => setPatternSettings(prev => ({ ...prev, count: Number(e.target.value) }))}
                    min={2}
                  />
                </div>
                <div>
                  <Label>Spacing (mm)</Label>
                  <Input
                    type="number"
                    value={patternSettings.columnSpacing || 50}
                    onChange={(e) => setPatternSettings(prev => ({ ...prev, columnSpacing: Number(e.target.value) }))}
                    step={gridSnap ? snapDistance : 1}
                  />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="GRID">
              <div className="space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label>Rows</Label>
                    <Input
                      type="number"
                      value={patternSettings.rows || 2}
                      onChange={(e) => setPatternSettings(prev => ({ ...prev, rows: Number(e.target.value) }))}
                      min={1}
                    />
                  </div>
                  <div>
                    <Label>Columns</Label>
                    <Input
                      type="number"
                      value={patternSettings.columns || 2}
                      onChange={(e) => setPatternSettings(prev => ({ ...prev, columns: Number(e.target.value) }))}
                      min={1}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label>Row Spacing</Label>
                    <Input
                      type="number"
                      value={patternSettings.rowSpacing || 50}
                      onChange={(e) => setPatternSettings(prev => ({ ...prev, rowSpacing: Number(e.target.value) }))}
                      step={gridSnap ? snapDistance : 1}
                    />
                  </div>
                  <div>
                    <Label>Column Spacing</Label>
                    <Input
                      type="number"
                      value={patternSettings.columnSpacing || 50}
                      onChange={(e) => setPatternSettings(prev => ({ ...prev, columnSpacing: Number(e.target.value) }))}
                      step={gridSnap ? snapDistance : 1}
                    />
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="CIRCULAR">
              <div className="space-y-2">
                <div>
                  <Label>Count</Label>
                  <Input
                    type="number"
                    value={patternSettings.count || 4}
                    onChange={(e) => setPatternSettings(prev => ({ ...prev, count: Number(e.target.value) }))}
                    min={2}
                  />
                </div>
                <div>
                  <Label>Radius (mm)</Label>
                  <Input
                    type="number"
                    value={patternSettings.radius || 100}
                    onChange={(e) => setPatternSettings(prev => ({ ...prev, radius: Number(e.target.value) }))}
                  />
                </div>
                <div>
                  <Label>Start Angle (deg)</Label>
                  <Input
                    type="number"
                    value={patternSettings.angle || 0}
                    onChange={(e) => setPatternSettings(prev => ({ ...prev, angle: Number(e.target.value) }))}
                  />
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>

        <div>
          <Label>Quick Patterns</Label>
          <div className="grid grid-cols-3 gap-2 mt-2">
            <Button size="sm" variant="outline" onClick={() => selectPresetPattern('single')}>
              Single
            </Button>
            <Button size="sm" variant="outline" onClick={() => selectPresetPattern('line2')}>
              2x1
            </Button>
            <Button size="sm" variant="outline" onClick={() => selectPresetPattern('line3')}>
              3x1
            </Button>
            <Button size="sm" variant="outline" onClick={() => selectPresetPattern('grid2x2')}>
              2x2
            </Button>
            <Button size="sm" variant="outline" onClick={() => selectPresetPattern('grid3x2')}>
              3x2
            </Button>
            <Button size="sm" variant="outline" onClick={() => selectPresetPattern('grid3x3')}>
              3x3
            </Button>
            <Button size="sm" variant="outline" onClick={() => selectPresetPattern('grid6x1')}>
              6x1
            </Button>
            <Button size="sm" variant="outline" onClick={() => selectPresetPattern('grid6x2')}>
              6x2
            </Button>
            <Button size="sm" variant="outline" onClick={() => selectPresetPattern('circular6')}>
              Circle 6
            </Button>
          </div>
        </div>

        <Button onClick={handleAddHole} className="w-full">
          <Plus className="h-4 w-4 mr-2" />
          Add Holes
        </Button>
      </CardContent>
    </Card>
  );
};