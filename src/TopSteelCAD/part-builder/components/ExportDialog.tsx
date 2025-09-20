import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  Button,
  Label,
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
  Checkbox,
  Textarea
} from './ui';
import { Download, FileJson, FileText, FileCog } from 'lucide-react';

import { Part, ExportFormat } from '../types';

interface ExportDialogProps {
  part: Part;
  onExport: (format: string, options: any) => void;
  onClose: () => void;
}

export const ExportDialog: React.FC<ExportDialogProps> = ({
  part,
  onExport,
  onClose,
}) => {
  const [format, setFormat] = useState<string>('JSON');
  const [includeMetadata, setIncludeMetadata] = useState(true);
  const [prettyPrint, setPrettyPrint] = useState(true);
  const [preview, setPreview] = useState('');

  const generatePreview = () => {
    if (format === 'JSON') {
      const exportData = {
        ...part,
        metadata: includeMetadata ? {
          exportDate: new Date().toISOString(),
          version: '1.0.0',
        } : undefined,
      };
      return JSON.stringify(exportData, null, prettyPrint ? 2 : 0);
    } else if (format === 'DSTV') {
      return `** DSTV Format Export **
ST ${part.profileType}
PR ${part.name}
LE ${part.length}
MA ${part.material || 'S235'}

** HOLES **
${part.features.holes.map(h => `BO ${h.diameter} ${h.position.x} ${h.position.y} ${h.position.z}`).join('\n')}

** NOTCHES **
${part.features.notches.map(n => `NO ${n.type} ${n.position.x} ${n.position.y} ${n.width} ${n.height}`).join('\n')}
`;
    } else if (format === 'DXF') {
      return `0\nSECTION\n2\nHEADER\n0\nENDSEC\n0\nSECTION\n2\nENTITIES\n${part.features.holes.map(h => `0\nCIRCLE\n10\n${h.position.x}\n20\n${h.position.y}\n40\n${h.diameter/2}`).join('\n')}\n0\nENDSEC\n0\nEOF`;
    }
    return '';
  };

  const handleExport = () => {
    const options = {
      includeMetadata,
      prettyPrint,
    };
    onExport(format, options);

    const blob = new Blob([generatePreview()], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${part.name}.${format.toLowerCase()}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  React.useEffect(() => {
    setPreview(generatePreview());
  }, [format, includeMetadata, prettyPrint, part]);

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Export Part</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Export Format</Label>
            <Select value={format} onValueChange={setFormat}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="JSON">
                  <div className="flex items-center gap-2">
                    <FileJson className="h-4 w-4" />
                    JSON
                  </div>
                </SelectItem>
                <SelectItem value="DSTV">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    DSTV (NC1)
                  </div>
                </SelectItem>
                <SelectItem value="DXF">
                  <div className="flex items-center gap-2">
                    <FileCog className="h-4 w-4" />
                    DXF
                  </div>
                </SelectItem>
                <SelectItem value="IFC">
                  <div className="flex items-center gap-2">
                    <FileCog className="h-4 w-4" />
                    IFC
                  </div>
                </SelectItem>
                <SelectItem value="STEP">
                  <div className="flex items-center gap-2">
                    <FileCog className="h-4 w-4" />
                    STEP
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {format === 'JSON' && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="metadata"
                  checked={includeMetadata}
                  onCheckedChange={(checked) => setIncludeMetadata(checked as boolean)}
                />
                <Label htmlFor="metadata">Include Metadata</Label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="pretty"
                  checked={prettyPrint}
                  onCheckedChange={(checked) => setPrettyPrint(checked as boolean)}
                />
                <Label htmlFor="pretty">Pretty Print</Label>
              </div>
            </div>
          )}

          <div>
            <Label>Preview</Label>
            <Textarea
              value={preview}
              readOnly
              className="font-mono text-xs h-64"
            />
          </div>

          <div className="text-sm text-gray-600">
            <div>Part: {part.name}</div>
            <div>Profile: {part.profileType}</div>
            <div>Features: {part.features.holes.length} holes, {part.features.notches.length} notches</div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleExport}>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};