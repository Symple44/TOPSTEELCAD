import React, { useState, useEffect, useCallback } from 'react';
import {
  Card, CardContent, CardHeader, CardTitle,
  Button,
  Tabs, TabsContent, TabsList, TabsTrigger,
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
  Input,
  Label,
  Slider,
  Switch,
  ScrollArea
} from './components/ui';
import {
  Plus,
  Minus,
  Save,
  Upload,
  Download,
  Eye,
  EyeOff,
  Grid3X3,
  Circle,
  Square,
  Triangle,
  Trash2,
  Copy,
  Settings
} from 'lucide-react';

import { Part, ProfileType, FaceType, Hole, Notch, HolePattern, ProfileDimensions } from './types';
import { HoleEditor } from './components/HoleEditor';
import { NotchEditor } from './components/NotchEditor';
import { FeaturesList } from './components/FeaturesList';
import { ProfileSelector } from './components/ProfileSelector';
import { PartViewer3D } from './components/PartViewer3D';
import { ExportDialog } from './components/ExportDialog';
import { ImportDialog } from './components/ImportDialog';
import { Vector3 } from './utils/Vector3';

export const PartBuilder: React.FC = () => {
  const [currentPart, setCurrentPart] = useState<Part>({
    id: 'part-' + Date.now(),
    name: 'New Part',
    profileType: 'IPE',
    dimensions: {
      height: 200,
      width: 100,
      webThickness: 5.6,
      flangeThickness: 8.5,
    },
    length: 3000,
    material: 'S235',
    features: {
      holes: [],
      notches: [],
      cuts: [],
    }
  });

  const [selectedFace, setSelectedFace] = useState<FaceType>('TOP_FLANGE');
  const [selectedFeatureId, setSelectedFeatureId] = useState<string | null>(null);
  const [previewMode, setPreviewMode] = useState(true);
  const [gridSnap, setGridSnap] = useState(true);
  const [snapDistance, setSnapDistance] = useState(10);
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [showImportDialog, setShowImportDialog] = useState(false);

  const addHole = useCallback((hole: Omit<Hole, 'id'>) => {
    const newHole: Hole = {
      ...hole,
      id: 'hole-' + Date.now(),
    };
    setCurrentPart(prev => ({
      ...prev,
      features: {
        ...prev.features,
        holes: [...prev.features.holes, newHole],
      }
    }));
  }, []);

  const addNotch = useCallback((notch: Omit<Notch, 'id'>) => {
    const newNotch: Notch = {
      ...notch,
      id: 'notch-' + Date.now(),
    };
    setCurrentPart(prev => ({
      ...prev,
      features: {
        ...prev.features,
        notches: [...prev.features.notches, newNotch],
      }
    }));
  }, []);

  const deleteFeature = useCallback((featureId: string) => {
    setCurrentPart(prev => ({
      ...prev,
      features: {
        ...prev.features,
        holes: prev.features.holes.filter(h => h.id !== featureId),
        notches: prev.features.notches.filter(n => n.id !== featureId),
      }
    }));
    setSelectedFeatureId(null);
  }, []);

  const duplicateFeature = useCallback((featureId: string) => {
    const hole = currentPart.features.holes.find(h => h.id === featureId);
    if (hole) {
      const newHole: Hole = {
        ...hole,
        id: 'hole-' + Date.now(),
        position: new Vector3(
          hole.position.x + 50,
          hole.position.y,
          hole.position.z
        ),
      };
      setCurrentPart(prev => ({
        ...prev,
        features: {
          ...prev.features,
          holes: [...prev.features.holes, newHole],
        }
      }));
      return;
    }

    const notch = currentPart.features.notches.find(n => n.id === featureId);
    if (notch) {
      const newNotch: Notch = {
        ...notch,
        id: 'notch-' + Date.now(),
        position: new Vector3(
          notch.position.x + 50,
          notch.position.y,
          notch.position.z
        ),
      };
      setCurrentPart(prev => ({
        ...prev,
        features: {
          ...prev.features,
          notches: [...prev.features.notches, newNotch],
        }
      }));
    }
  }, [currentPart]);

  const updatePartDimensions = useCallback((dimensions: ProfileDimensions) => {
    setCurrentPart(prev => ({
      ...prev,
      dimensions,
    }));
  }, []);

  const updatePartProfile = useCallback((profileType: ProfileType) => {
    setCurrentPart(prev => ({
      ...prev,
      profileType,
    }));
  }, []);

  const handleExport = useCallback((format: string, options: any) => {
    console.log('Exporting part:', format, options, currentPart);
    setShowExportDialog(false);
  }, [currentPart]);

  const handleImport = useCallback((data: Part) => {
    setCurrentPart(data);
    setShowImportDialog(false);
  }, []);

  return (
    <div className="flex h-screen bg-gray-50">
      <div className="w-96 border-r bg-white overflow-y-auto">
        <div className="p-4 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                Part Builder
                <div className="flex gap-2">
                  <Button size="icon" variant="outline" onClick={() => setShowImportDialog(true)}>
                    <Upload className="h-4 w-4" />
                  </Button>
                  <Button size="icon" variant="outline" onClick={() => setShowExportDialog(true)}>
                    <Download className="h-4 w-4" />
                  </Button>
                  <Button size="icon" variant="outline">
                    <Save className="h-4 w-4" />
                  </Button>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Part Name</Label>
                <Input
                  value={currentPart.name}
                  onChange={(e) => setCurrentPart(prev => ({ ...prev, name: e.target.value }))}
                />
              </div>

              <ProfileSelector
                profileType={currentPart.profileType}
                dimensions={currentPart.dimensions}
                onProfileChange={updatePartProfile}
                onDimensionsChange={updatePartDimensions}
              />

              <div>
                <Label>Length (mm)</Label>
                <Input
                  type="number"
                  value={currentPart.length}
                  onChange={(e) => setCurrentPart(prev => ({ ...prev, length: Number(e.target.value) }))}
                />
              </div>

              <div>
                <Label>Material</Label>
                <Select value={currentPart.material} onValueChange={(value) => setCurrentPart(prev => ({ ...prev, material: value }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="S235">S235</SelectItem>
                    <SelectItem value="S275">S275</SelectItem>
                    <SelectItem value="S355">S355</SelectItem>
                    <SelectItem value="S450">S450</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>View Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <Label>Preview Mode</Label>
                <Switch checked={previewMode} onCheckedChange={setPreviewMode} />
              </div>
              <div className="flex items-center justify-between">
                <Label>Grid Snap</Label>
                <Switch checked={gridSnap} onCheckedChange={setGridSnap} />
              </div>
              {gridSnap && (
                <div>
                  <Label>Snap Distance: {snapDistance}mm</Label>
                  <Slider
                    value={[snapDistance]}
                    onValueChange={([value]) => setSnapDistance(value)}
                    min={1}
                    max={50}
                    step={1}
                  />
                </div>
              )}
            </CardContent>
          </Card>

          <Tabs defaultValue="holes" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="holes">Holes</TabsTrigger>
              <TabsTrigger value="notches">Notches</TabsTrigger>
              <TabsTrigger value="list">List</TabsTrigger>
            </TabsList>

            <TabsContent value="holes">
              <HoleEditor
                selectedFace={selectedFace}
                onAddHole={addHole}
                gridSnap={gridSnap}
                snapDistance={snapDistance}
              />
            </TabsContent>

            <TabsContent value="notches">
              <NotchEditor
                selectedFace={selectedFace}
                onAddNotch={addNotch}
                gridSnap={gridSnap}
                snapDistance={snapDistance}
              />
            </TabsContent>

            <TabsContent value="list">
              <FeaturesList
                features={currentPart.features}
                selectedFeatureId={selectedFeatureId}
                onSelectFeature={setSelectedFeatureId}
                onDeleteFeature={deleteFeature}
                onDuplicateFeature={duplicateFeature}
              />
            </TabsContent>
          </Tabs>
        </div>
      </div>

      <div className="flex-1 relative">
        <PartViewer3D
          part={currentPart}
          selectedFace={selectedFace}
          selectedFeatureId={selectedFeatureId}
          onFaceSelect={setSelectedFace}
          onFeatureSelect={setSelectedFeatureId}
          previewMode={previewMode}
          gridSnap={gridSnap}
          snapDistance={snapDistance}
        />
      </div>

      {showExportDialog && (
        <ExportDialog
          part={currentPart}
          onExport={handleExport}
          onClose={() => setShowExportDialog(false)}
        />
      )}

      {showImportDialog && (
        <ImportDialog
          onImport={handleImport}
          onClose={() => setShowImportDialog(false)}
        />
      )}
    </div>
  );
};