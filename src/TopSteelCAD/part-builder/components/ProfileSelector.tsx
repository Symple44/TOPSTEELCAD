import React from 'react';
import {
  Label,
  Input,
  Button,
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
  Tabs, TabsContent, TabsList, TabsTrigger
} from './ui';

import { ProfileType, ProfileDimensions } from '../types';

interface ProfileSelectorProps {
  profileType: ProfileType;
  dimensions: ProfileDimensions;
  onProfileChange: (profileType: ProfileType) => void;
  onDimensionsChange: (dimensions: ProfileDimensions) => void;
}

export const ProfileSelector: React.FC<ProfileSelectorProps> = ({
  profileType,
  dimensions,
  onProfileChange,
  onDimensionsChange,
}) => {
  const handleDimensionChange = (key: keyof ProfileDimensions, value: number) => {
    onDimensionsChange({
      ...dimensions,
      [key]: value,
    });
  };

  const profilePresets = {
    IPE: [
      { name: 'IPE100', height: 100, width: 55, webThickness: 4.1, flangeThickness: 5.7 },
      { name: 'IPE200', height: 200, width: 100, webThickness: 5.6, flangeThickness: 8.5 },
      { name: 'IPE300', height: 300, width: 150, webThickness: 7.1, flangeThickness: 10.7 },
      { name: 'IPE400', height: 400, width: 180, webThickness: 8.6, flangeThickness: 13.5 },
    ],
    HEA: [
      { name: 'HEA100', height: 96, width: 100, webThickness: 5, flangeThickness: 8 },
      { name: 'HEA200', height: 190, width: 200, webThickness: 6.5, flangeThickness: 10 },
      { name: 'HEA300', height: 290, width: 300, webThickness: 8.5, flangeThickness: 14 },
    ],
    HEB: [
      { name: 'HEB100', height: 100, width: 100, webThickness: 6, flangeThickness: 10 },
      { name: 'HEB200', height: 200, width: 200, webThickness: 9, flangeThickness: 15 },
      { name: 'HEB300', height: 300, width: 300, webThickness: 11, flangeThickness: 19 },
    ],
  };

  const renderDimensionInputs = () => {
    switch (profileType) {
      case 'IPE':
      case 'HEA':
      case 'HEB':
        return (
          <>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs">Height (mm)</Label>
                <Input
                  type="number"
                  value={dimensions.height || 0}
                  onChange={(e) => handleDimensionChange('height', Number(e.target.value))}
                />
              </div>
              <div>
                <Label className="text-xs">Width (mm)</Label>
                <Input
                  type="number"
                  value={dimensions.width || 0}
                  onChange={(e) => handleDimensionChange('width', Number(e.target.value))}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs">Web Thickness</Label>
                <Input
                  type="number"
                  value={dimensions.webThickness || 0}
                  onChange={(e) => handleDimensionChange('webThickness', Number(e.target.value))}
                  step={0.1}
                />
              </div>
              <div>
                <Label className="text-xs">Flange Thickness</Label>
                <Input
                  type="number"
                  value={dimensions.flangeThickness || 0}
                  onChange={(e) => handleDimensionChange('flangeThickness', Number(e.target.value))}
                  step={0.1}
                />
              </div>
            </div>
          </>
        );

      case 'UPE':
      case 'UAP':
        return (
          <>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs">Height (mm)</Label>
                <Input
                  type="number"
                  value={dimensions.height || 0}
                  onChange={(e) => handleDimensionChange('height', Number(e.target.value))}
                />
              </div>
              <div>
                <Label className="text-xs">Width (mm)</Label>
                <Input
                  type="number"
                  value={dimensions.width || 0}
                  onChange={(e) => handleDimensionChange('width', Number(e.target.value))}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs">Web Thickness</Label>
                <Input
                  type="number"
                  value={dimensions.webThickness || 0}
                  onChange={(e) => handleDimensionChange('webThickness', Number(e.target.value))}
                  step={0.1}
                />
              </div>
              <div>
                <Label className="text-xs">Flange Thickness</Label>
                <Input
                  type="number"
                  value={dimensions.flangeThickness || 0}
                  onChange={(e) => handleDimensionChange('flangeThickness', Number(e.target.value))}
                  step={0.1}
                />
              </div>
            </div>
          </>
        );

      case 'L':
        return (
          <>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs">Height (mm)</Label>
                <Input
                  type="number"
                  value={dimensions.height || 0}
                  onChange={(e) => handleDimensionChange('height', Number(e.target.value))}
                />
              </div>
              <div>
                <Label className="text-xs">Width (mm)</Label>
                <Input
                  type="number"
                  value={dimensions.width || 0}
                  onChange={(e) => handleDimensionChange('width', Number(e.target.value))}
                />
              </div>
            </div>
            <div>
              <Label className="text-xs">Thickness</Label>
              <Input
                type="number"
                value={dimensions.thickness || 0}
                onChange={(e) => handleDimensionChange('thickness', Number(e.target.value))}
                step={0.1}
              />
            </div>
          </>
        );

      case 'RHS':
        return (
          <>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs">Height (mm)</Label>
                <Input
                  type="number"
                  value={dimensions.height || 0}
                  onChange={(e) => handleDimensionChange('height', Number(e.target.value))}
                />
              </div>
              <div>
                <Label className="text-xs">Width (mm)</Label>
                <Input
                  type="number"
                  value={dimensions.width || 0}
                  onChange={(e) => handleDimensionChange('width', Number(e.target.value))}
                />
              </div>
            </div>
            <div>
              <Label className="text-xs">Thickness</Label>
              <Input
                type="number"
                value={dimensions.thickness || 0}
                onChange={(e) => handleDimensionChange('thickness', Number(e.target.value))}
                step={0.1}
              />
            </div>
          </>
        );

      case 'CHS':
        return (
          <>
            <div>
              <Label className="text-xs">Radius (mm)</Label>
              <Input
                type="number"
                value={dimensions.radius || 0}
                onChange={(e) => handleDimensionChange('radius', Number(e.target.value))}
              />
            </div>
            <div>
              <Label className="text-xs">Thickness</Label>
              <Input
                type="number"
                value={dimensions.thickness || 0}
                onChange={(e) => handleDimensionChange('thickness', Number(e.target.value))}
                step={0.1}
              />
            </div>
          </>
        );

      case 'T':
        return (
          <>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs">Height (mm)</Label>
                <Input
                  type="number"
                  value={dimensions.height || 0}
                  onChange={(e) => handleDimensionChange('height', Number(e.target.value))}
                />
              </div>
              <div>
                <Label className="text-xs">Width (mm)</Label>
                <Input
                  type="number"
                  value={dimensions.width || 0}
                  onChange={(e) => handleDimensionChange('width', Number(e.target.value))}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs">Web Thickness</Label>
                <Input
                  type="number"
                  value={dimensions.webThickness || 0}
                  onChange={(e) => handleDimensionChange('webThickness', Number(e.target.value))}
                  step={0.1}
                />
              </div>
              <div>
                <Label className="text-xs">Flange Thickness</Label>
                <Input
                  type="number"
                  value={dimensions.flangeThickness || 0}
                  onChange={(e) => handleDimensionChange('flangeThickness', Number(e.target.value))}
                  step={0.1}
                />
              </div>
            </div>
          </>
        );

      case 'PLATE':
        return (
          <>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs">Height (mm)</Label>
                <Input
                  type="number"
                  value={dimensions.height || 0}
                  onChange={(e) => handleDimensionChange('height', Number(e.target.value))}
                />
              </div>
              <div>
                <Label className="text-xs">Width (mm)</Label>
                <Input
                  type="number"
                  value={dimensions.width || 0}
                  onChange={(e) => handleDimensionChange('width', Number(e.target.value))}
                />
              </div>
            </div>
            <div>
              <Label className="text-xs">Thickness</Label>
              <Input
                type="number"
                value={dimensions.thickness || 0}
                onChange={(e) => handleDimensionChange('thickness', Number(e.target.value))}
                step={0.1}
              />
            </div>
          </>
        );

      default:
        return null;
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <Label>Profile Type</Label>
        <Select value={profileType} onValueChange={(value) => onProfileChange(value as ProfileType)}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="IPE">IPE</SelectItem>
            <SelectItem value="HEA">HEA</SelectItem>
            <SelectItem value="HEB">HEB</SelectItem>
            <SelectItem value="UPE">UPE</SelectItem>
            <SelectItem value="UAP">UAP</SelectItem>
            <SelectItem value="L">L (Angle)</SelectItem>
            <SelectItem value="RHS">RHS</SelectItem>
            <SelectItem value="CHS">CHS</SelectItem>
            <SelectItem value="T">T</SelectItem>
            <SelectItem value="PLATE">Plate</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {(profileType === 'IPE' || profileType === 'HEA' || profileType === 'HEB') &&
        profilePresets[profileType] && (
        <div>
          <Label>Quick Presets</Label>
          <div className="grid grid-cols-2 gap-2 mt-2">
            {profilePresets[profileType].map((preset) => (
              <Button
                key={preset.name}
                size="sm"
                variant="outline"
                onClick={() => onDimensionsChange(preset)}
              >
                {preset.name}
              </Button>
            ))}
          </div>
        </div>
      )}

      <div>
        <Label>Custom Dimensions</Label>
        <div className="space-y-2 mt-2">
          {renderDimensionInputs()}
        </div>
      </div>
    </div>
  );
};