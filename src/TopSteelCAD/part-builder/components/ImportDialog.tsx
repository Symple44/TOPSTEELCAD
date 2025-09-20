import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  Button,
  Label,
  Textarea,
  Alert, AlertDescription
} from './ui';
import { Upload, FileJson, AlertCircle } from 'lucide-react';

import { Part } from '../types';
import { Vector3 } from '../utils/Vector3';

interface ImportDialogProps {
  onImport: (data: Part) => void;
  onClose: () => void;
}

export const ImportDialog: React.FC<ImportDialogProps> = ({
  onImport,
  onClose,
}) => {
  const [importData, setImportData] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);

  const parseImportData = (data: string): Part | null => {
    try {
      const parsed = JSON.parse(data);

      if (!parsed.profileType || !parsed.dimensions || !parsed.length) {
        throw new Error('Invalid part data: missing required fields');
      }

      const part: Part = {
        id: parsed.id || 'part-' + Date.now(),
        name: parsed.name || 'Imported Part',
        profileType: parsed.profileType,
        dimensions: parsed.dimensions,
        length: parsed.length,
        material: parsed.material,
        features: {
          holes: (parsed.features?.holes || []).map((h: any) => ({
            ...h,
            position: new Vector3(h.position.x, h.position.y, h.position.z),
          })),
          notches: (parsed.features?.notches || []).map((n: any) => ({
            ...n,
            position: new Vector3(n.position.x, n.position.y, n.position.z),
          })),
          cuts: parsed.features?.cuts || [],
        },
        position: parsed.position ? new Vector3(parsed.position.x, parsed.position.y, parsed.position.z) : undefined,
        rotation: parsed.rotation ? new Vector3(parsed.rotation.x, parsed.rotation.y, parsed.rotation.z) : undefined,
      };

      return part;
    } catch (e) {
      setError(`Parse error: ${e.message}`);
      return null;
    }
  };

  const handleImport = () => {
    const part = parseImportData(importData);
    if (part) {
      onImport(part);
      onClose();
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const content = e.target?.result as string;
        setImportData(content);
        setError(null);
      };
      reader.readAsText(file);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      const reader = new FileReader();
      reader.onload = (event) => {
        const content = event.target?.result as string;
        setImportData(content);
        setError(null);
      };
      reader.readAsText(file);
    }
  };

  const sampleData = {
    name: 'Sample Part',
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
      holes: [
        {
          id: 'hole-1',
          diameter: 20,
          position: { x: 100, y: 0, z: 500 },
          isThrough: true,
          face: 'TOP_FLANGE',
          pattern: { type: 'SINGLE' },
        },
        {
          id: 'hole-2',
          diameter: 16,
          position: { x: 200, y: 0, z: 1000 },
          isThrough: true,
          face: 'TOP_FLANGE',
          pattern: { type: 'LINE', count: 3, columnSpacing: 50 },
        },
      ],
      notches: [
        {
          id: 'notch-1',
          type: 'RECTANGULAR',
          position: { x: 0, y: 0, z: 0 },
          width: 50,
          height: 30,
          depth: 10,
          face: 'WEB_LEFT',
        },
      ],
      cuts: [],
    },
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Import Part</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div
            className={`border-2 border-dashed rounded-lg p-8 text-center ${
              dragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300'
            }`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            <FileJson className="h-12 w-12 mx-auto text-gray-400 mb-4" />
            <p className="text-sm text-gray-600 mb-2">
              Drag and drop a JSON file here, or click to select
            </p>
            <input
              type="file"
              accept=".json"
              onChange={handleFileSelect}
              className="hidden"
              id="file-upload"
            />
            <label htmlFor="file-upload">
              <Button variant="outline" className="cursor-pointer">
                <Upload className="h-4 w-4 mr-2" />
                Select File
              </Button>
            </label>
          </div>

          <div>
            <Label>Or paste JSON data directly</Label>
            <Textarea
              value={importData}
              onChange={(e) => {
                setImportData(e.target.value);
                setError(null);
              }}
              placeholder="Paste your part JSON data here..."
              className="font-mono text-xs h-64"
            />
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="text-sm text-gray-600">
            <details>
              <summary className="cursor-pointer hover:text-gray-800">
                Show sample format
              </summary>
              <pre className="mt-2 p-2 bg-gray-50 rounded text-xs overflow-auto">
                {JSON.stringify(sampleData, null, 2)}
              </pre>
            </details>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={handleImport}
            disabled={!importData || !!error}
          >
            <Upload className="h-4 w-4 mr-2" />
            Import
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};