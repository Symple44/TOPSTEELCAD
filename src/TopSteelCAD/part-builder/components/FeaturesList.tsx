import React from 'react';
import {
  Card, CardContent, CardHeader, CardTitle,
  Button,
  ScrollArea,
  Badge
} from './ui';
import { Trash2, Copy, Eye, Circle, Square } from 'lucide-react';

import { Feature, Hole, Notch } from '../types';

interface FeaturesListProps {
  features: Feature;
  selectedFeatureId: string | null;
  onSelectFeature: (featureId: string) => void;
  onDeleteFeature: (featureId: string) => void;
  onDuplicateFeature: (featureId: string) => void;
}

export const FeaturesList: React.FC<FeaturesListProps> = ({
  features,
  selectedFeatureId,
  onSelectFeature,
  onDeleteFeature,
  onDuplicateFeature,
}) => {
  const allFeatures = [
    ...features.holes.map(h => ({ ...h, featureType: 'hole' as const })),
    ...features.notches.map(n => ({ ...n, featureType: 'notch' as const })),
  ];

  const getFeatureInfo = (feature: any) => {
    if (feature.featureType === 'hole') {
      const hole = feature as Hole & { featureType: 'hole' };
      const patternInfo = hole.pattern?.type !== 'SINGLE'
        ? ` (${hole.pattern?.type})`
        : '';
      return {
        icon: <Circle className="h-4 w-4" />,
        name: `Hole Ø${hole.diameter}${patternInfo}`,
        details: `Face: ${hole.face}`,
        type: 'hole',
      };
    } else {
      const notch = feature as Notch & { featureType: 'notch' };
      return {
        icon: <Square className="h-4 w-4" />,
        name: `Notch ${notch.type}`,
        details: `${notch.width}x${notch.height}x${notch.depth}mm`,
        type: 'notch',
      };
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          Features List
          <Badge variant="outline">
            {allFeatures.length} items
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-96">
          {allFeatures.length === 0 ? (
            <div className="text-center text-gray-500 py-8">
              No features added yet
            </div>
          ) : (
            <div className="space-y-2">
              {allFeatures.map((feature) => {
                const info = getFeatureInfo(feature);
                const isSelected = feature.id === selectedFeatureId;

                return (
                  <div
                    key={feature.id}
                    className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                      isSelected
                        ? 'bg-blue-50 border-blue-300'
                        : 'hover:bg-gray-50'
                    }`}
                    onClick={() => onSelectFeature(feature.id)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {info.icon}
                        <div>
                          <div className="font-medium">{info.name}</div>
                          <div className="text-xs text-gray-500">{info.details}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={(e) => {
                            e.stopPropagation();
                            onDuplicateFeature(feature.id);
                          }}
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={(e) => {
                            e.stopPropagation();
                            onDeleteFeature(feature.id);
                          }}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
};