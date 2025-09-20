import React, { useState } from 'react';
import { PartBuilder } from '../components/PartBuilder';
import { PartDefinition } from '../types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Package, FileText, Play, Code, Eye } from 'lucide-react';

export const PartBuilderDemo: React.FC = () => {
  const [mode, setMode] = useState<'create' | 'template'>('create');
  const [completedPart, setCompletedPart] = useState<PartDefinition | null>(null);
  const [showBuilder, setShowBuilder] = useState(true);

  const handleComplete = (part: PartDefinition) => {
    console.log('Part completed:', part);
    setCompletedPart(part);
    setShowBuilder(false);
  };

  const handleCancel = () => {
    console.log('Part creation cancelled');
    setShowBuilder(false);
  };

  const resetDemo = () => {
    setCompletedPart(null);
    setShowBuilder(true);
  };

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-6 w-6" />
              Part Builder Demo - TopSteelCAD
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">
              Testez le nouveau module Part Builder pour créer des pièces métalliques de A à Z.
            </p>

            {!showBuilder && (
              <div className="flex gap-4">
                <Button onClick={resetDemo}>
                  <Play className="mr-2 h-4 w-4" />
                  Nouveau Test
                </Button>
                <Button variant="outline" onClick={() => setMode(mode === 'create' ? 'template' : 'create')}>
                  Mode: {mode === 'create' ? 'Création' : 'Template'}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Part Builder Component */}
        {showBuilder && (
          <Card className="overflow-hidden">
            <PartBuilder
              mode={mode}
              onComplete={handleComplete}
              onCancel={handleCancel}
            />
          </Card>
        )}

        {/* Results Display */}
        {completedPart && !showBuilder && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Résultat de la Création
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="summary">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="summary">Résumé</TabsTrigger>
                  <TabsTrigger value="json">JSON</TabsTrigger>
                  <TabsTrigger value="features">Features</TabsTrigger>
                </TabsList>

                <TabsContent value="summary" className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium">Nom</label>
                      <p className="text-lg">{completedPart.name}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium">Type</label>
                      <Badge variant="outline">{completedPart.type}</Badge>
                    </div>
                    <div>
                      <label className="text-sm font-medium">Matériau</label>
                      <p>{completedPart.material.grade}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium">Densité</label>
                      <p>{completedPart.material.density} kg/m³</p>
                    </div>
                  </div>

                  {completedPart.type === 'PROFILE' && completedPart.profileDefinition && (
                    <div className="space-y-2">
                      <h4 className="font-semibold">Profil</h4>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div>Type: {completedPart.profileDefinition.type}</div>
                        <div>Désignation: {completedPart.profileDefinition.designation}</div>
                        <div>Longueur: {completedPart.profileDefinition.length} mm</div>
                        <div>Hauteur: {completedPart.profileDefinition.dimensions.height} mm</div>
                      </div>
                    </div>
                  )}

                  {completedPart.type === 'PLATE' && completedPart.plateDefinition && (
                    <div className="space-y-2">
                      <h4 className="font-semibold">Plaque</h4>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div>Épaisseur: {completedPart.plateDefinition.thickness} mm</div>
                        <div>Points de contour: {completedPart.plateDefinition.contour.length}</div>
                        <div>Trous: {completedPart.plateDefinition.holes.length}</div>
                      </div>
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="json">
                  <pre className="bg-muted p-4 rounded-lg overflow-auto max-h-96">
                    <code>{JSON.stringify(completedPart, null, 2)}</code>
                  </pre>
                </TabsContent>

                <TabsContent value="features" className="space-y-2">
                  {completedPart.features.length === 0 ? (
                    <p className="text-muted-foreground">Aucune feature ajoutée</p>
                  ) : (
                    completedPart.features.map((feature, index) => (
                      <div key={feature.id} className="border rounded-lg p-3">
                        <div className="flex items-center justify-between">
                          <Badge>{feature.type}</Badge>
                          <span className="text-sm text-muted-foreground">#{index + 1}</span>
                        </div>
                        <div className="grid grid-cols-3 gap-2 mt-2 text-sm">
                          <div>X: {feature.position.x.toFixed(1)}</div>
                          <div>Y: {feature.position.y.toFixed(1)}</div>
                          <div>Z: {feature.position.z.toFixed(1)}</div>
                        </div>
                        {feature.face && (
                          <div className="text-sm text-muted-foreground mt-1">
                            Face: {feature.face}
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        )}

        {/* Instructions */}
        <Card>
          <CardHeader>
            <CardTitle>Instructions de Test</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <h4 className="font-semibold flex items-center gap-2">
                <Eye className="h-4 w-4" />
                Test de Création de Profil
              </h4>
              <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground">
                <li>Sélectionnez "Profile" comme type de pièce</li>
                <li>Choisissez un profil dans la bibliothèque (IPE, HEA, etc.)</li>
                <li>Ajustez la longueur avec le slider</li>
                <li>Configurez les coupes d'extrémité (optionnel)</li>
                <li>Ajoutez des trous avec l'assistant de positionnement</li>
                <li>Validez et finalisez la pièce</li>
              </ol>
            </div>

            <div className="space-y-2">
              <h4 className="font-semibold flex items-center gap-2">
                <Eye className="h-4 w-4" />
                Test de Création de Plaque
              </h4>
              <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground">
                <li>Sélectionnez "Plate" comme type de pièce</li>
                <li>Définissez l'épaisseur de la plaque</li>
                <li>Créez le contour avec les points ou utilisez une forme prédéfinie</li>
                <li>Ajoutez des trous avec patterns (linéaire, circulaire, grille)</li>
                <li>Utilisez le DataTable pour éditer les coordonnées</li>
                <li>Exportez dans le format souhaité</li>
              </ol>
            </div>

            <div className="space-y-2">
              <h4 className="font-semibold flex items-center gap-2">
                <Code className="h-4 w-4" />
                Fonctionnalités à Tester
              </h4>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>✓ Navigation par étapes</div>
                <div>✓ Validation en temps réel</div>
                <div>✓ Preview 3D (si activé)</div>
                <div>✓ Undo/Redo</div>
                <div>✓ Assistant de positionnement</div>
                <div>✓ Patterns de features</div>
                <div>✓ Export multi-format</div>
                <div>✓ Templates prédéfinies</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default PartBuilderDemo;