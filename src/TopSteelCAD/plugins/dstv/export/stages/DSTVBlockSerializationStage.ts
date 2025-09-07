/**
 * Stage de sérialisation des blocs DSTV
 * Convertit les données en blocs DSTV conformes à la norme
 */

import { BaseStage } from './BaseExportStage';
import { DSTVPluginConfig } from '../../DSTVPlugin';

interface DSTVBlock {
  type: string;
  lines: string[];
  comment?: string;
}

interface SerializedData {
  blocks: DSTVBlock[];
  metadata: {
    blockCount: number;
    lineCount: number;
    features: {
      holes: number;
      contours: number;
      markings: number;
    };
  };
}

export class DSTVBlockSerializationStage extends BaseStage {
  private config: DSTVPluginConfig;
  private currentLine: number = 0;

  constructor(config: DSTVPluginConfig) {
    super({
      name: 'DSTV Block Serialization',
      description: 'Serializes data into DSTV blocks'
    });
    this.config = config;
  }

  async process(context: any): Promise<any> {
    const data = context.output as any;
    this.currentLine = 0;
    
    // Créer les blocs DSTV
    const blocks: DSTVBlock[] = [];
    
    // 1. Bloc ST (Start) - Obligatoire
    blocks.push(this.createSTBlock(data));
    
    // 2. Blocs de features organisés par face et type
    blocks.push(...this.createFeatureBlocks(data));
    
    // 3. Bloc EN (End) - Obligatoire
    blocks.push(this.createENBlock());
    
    // Calculer les métadonnées
    const metadata = this.calculateMetadata(blocks, data);
    
    const serialized: SerializedData = {
      blocks,
      metadata
    };

    context.output = serialized;
    context.metadata.serialized = true;

    return context;
  }

  private createSTBlock(data: any): DSTVBlock {
    const lines: string[] = [];
    
    // Ligne ST obligatoire
    lines.push('ST');
    
    // Signe et numéro de pièce (ex: -_001_F1000)
    const partId = data.geometry.partId || 'PART-001';
    lines.push(partId.startsWith('-') ? partId : `-${partId}`);
    
    // Repère pièce
    lines.push(partId.replace(/^-_\d+_/, ''));
    
    // Nuance acier
    lines.push(data.geometry.material);
    
    // Quantité
    lines.push('1');
    
    // Description profil (ex: "Tube rect. 100 50 5")
    const profileType = data.geometry.profile.type;
    lines.push(profileType);
    
    // Type profil DSTV (M pour tube, I pour IPE, etc.)
    let dstvType = 'M'; // Par défaut tube
    if (profileType.toUpperCase().includes('IPE')) dstvType = 'I';
    else if (profileType.toUpperCase().includes('HE')) dstvType = 'I';
    else if (profileType.toUpperCase().includes('UPN')) dstvType = 'U';
    else if (profileType.toUpperCase().includes('TUBE')) dstvType = 'M';
    lines.push(dstvType);
    
    // Longueur (format: ####.##)
    lines.push(this.formatNumber(data.geometry.profile.dimensions.length, 7, 2));
    
    // Dimensions du profil selon le type
    const dims = data.geometry.profile.dimensions;
    const profileTypeUpper = profileType.toUpperCase();
    
    if (this.isIProfile(profileTypeUpper)) {
      // Profils en I : hauteur, largeur, épaisseur âme, épaisseur aile
      lines.push(this.formatNumber(dims.height, 7, 2));
      lines.push(this.formatNumber(dims.width, 7, 2));
      lines.push(this.formatNumber(dims.webThickness, 7, 2));
      lines.push(this.formatNumber(dims.flangeThickness, 7, 2));
    } else if (this.isUProfile(profileTypeUpper)) {
      // Profils en U : hauteur, largeur, épaisseur
      lines.push(this.formatNumber(dims.height, 7, 2));
      lines.push(this.formatNumber(dims.width, 7, 2));
      lines.push(this.formatNumber(dims.webThickness, 7, 2));
    } else if (profileTypeUpper.includes('TUBE') || dstvType === 'M') {
      // Tubes rectangulaires/carrés : hauteur, largeur, épaisseur (x2)
      lines.push(this.formatNumber(dims.height, 7, 2));
      lines.push(this.formatNumber(dims.width, 7, 2));
      lines.push(this.formatNumber(dims.webThickness, 7, 2));
      lines.push(this.formatNumber(dims.webThickness, 7, 2)); // épaisseur (même valeur)
    } else {
      // Profil générique : dimensions de base
      lines.push(this.formatNumber(dims.height, 7, 2));
      lines.push(this.formatNumber(dims.width, 7, 2));
    }
    
    return {
      type: 'ST',
      lines,
      comment: 'Start block - Profile definition'
    };
  }

  private createFeatureBlocks(data: any): DSTVBlock[] {
    const blocks: DSTVBlock[] = [];
    
    // Ordre standard DSTV :
    // 1. Contours externes (AK)
    // 2. Contours internes (IK)  
    // 3. Trous (BO, SI, LO)
    // 4. Marquages (SI, PU, KO)
    // 5. Autres features
    
    if (data.organized) {
      // Contours AK
      blocks.push(...this.createContourBlocks(data, 'AK'));
      
      // Contours IK
      blocks.push(...this.createContourBlocks(data, 'IK'));
      
      // Trous
      blocks.push(...this.createHoleBlocks(data));
      
      // Marquages
      blocks.push(...this.createMarkingBlocks(data));
      
      // Coupes spéciales
      if (data.organized.byType.cuts?.length > 0) {
        blocks.push(...this.createCutBlocks(data));
      }
    }
    
    return blocks;
  }

  private createContourBlocks(data: any, type: 'AK' | 'IK'): DSTVBlock[] {
    const blocks: DSTVBlock[] = [];
    
    if (!data.organized?.byType?.contours) {
      return blocks;
    }
    
    for (const [key, contours] of data.organized.byType.contours) {
      if (!key.startsWith(type + '_')) {
        continue;
      }
      
      const face = key.split('_')[1];
      
      for (const contour of contours) {
        const lines: string[] = [];
        
        // Type de contour
        lines.push(type);
        
        // Face
        lines.push(face);
        
        // Nombre de points
        lines.push(contour.points.length.toString());
        
        // Points du contour
        for (const point of contour.points) {
          lines.push(this.formatNumber(point.x, 7, 2));
          lines.push(this.formatNumber(point.y, 7, 2));
        }
        
        blocks.push({
          type,
          lines,
          comment: `${type === 'AK' ? 'External' : 'Internal'} contour on face ${face}`
        });
      }
    }
    
    return blocks;
  }

  private createHoleBlocks(data: any): DSTVBlock[] {
    const blocks: DSTVBlock[] = [];
    
    // Utiliser les trous optimisés si disponibles
    const holes = data.organized?.optimized?.mergedHoles || 
                  this.getAllHoles(data);
    
    if (!holes || holes.length === 0) {
      return blocks;
    }
    
    // Grouper les trous par face pour optimiser l'export
    const holesByFace = new Map<string, any[]>();
    for (const hole of holes) {
      const faceHoles = holesByFace.get(hole.face) || [];
      faceHoles.push(hole);
      holesByFace.set(hole.face, faceHoles);
    }
    
    // Créer les blocs BO pour chaque groupe
    for (const [face, faceHoles] of holesByFace) {
      for (const hole of faceHoles) {
        const lines: string[] = [];
        
        // Type de trou (BO = trou simple)
        lines.push('BO');
        
        // Position X
        lines.push(this.formatNumber(hole.x, 7, 2));
        
        // Position Y
        lines.push(this.formatNumber(hole.y, 7, 2));
        
        // Diamètre
        lines.push(this.formatNumber(hole.diameter, 7, 2));
        
        // Face
        lines.push(face);
        
        // Type de trou optionnel (SI = trou de montage, LO = trou oblong)
        if (hole.type) {
          lines.push(hole.type);
        }
        
        blocks.push({
          type: 'BO',
          lines,
          comment: `Hole on face ${face}`
        });
      }
    }
    
    return blocks;
  }

  private createMarkingBlocks(data: any): DSTVBlock[] {
    const blocks: DSTVBlock[] = [];
    
    if (!data.organized?.byType?.markings) {
      return blocks;
    }
    
    for (const [face, markings] of data.organized.byType.markings) {
      for (const marking of markings) {
        const lines: string[] = [];
        
        // Type SI (Signierung = Marquage)
        lines.push('SI');
        
        // Position X
        lines.push(this.formatNumber(marking.x, 7, 2));
        
        // Position Y
        lines.push(this.formatNumber(marking.y, 7, 2));
        
        // Texte du marquage
        lines.push(marking.text);
        
        // Hauteur du texte
        lines.push(this.formatNumber(marking.height, 7, 2));
        
        // Face
        lines.push(face);
        
        // Angle (optionnel)
        if (marking.angle && marking.angle !== 0) {
          lines.push(this.formatNumber(marking.angle, 7, 2));
        }
        
        blocks.push({
          type: 'SI',
          lines,
          comment: `Marking on face ${face}`
        });
      }
    }
    
    return blocks;
  }

  private createCutBlocks(data: any): DSTVBlock[] {
    const blocks: DSTVBlock[] = [];
    
    for (const cut of data.organized.byType.cuts) {
      const lines: string[] = [];
      
      // Type SC (Special Cut)
      lines.push('SC');
      
      // Géométrie de la coupe (dépend du type)
      // TODO: Implémenter selon les spécifications exactes
      
      blocks.push({
        type: 'SC',
        lines,
        comment: 'Special cut'
      });
    }
    
    return blocks;
  }

  private createENBlock(): DSTVBlock {
    return {
      type: 'EN',
      lines: ['EN'],
      comment: 'End block'
    };
  }

  private formatNumber(value: number, width: number = 7, decimals: number = 2): string {
    // Format DSTV standard : ####.##
    const formatted = value.toFixed(decimals);
    return formatted.padStart(width + 1); // +1 pour le point décimal
  }

  private formatProfileType(type: string): string {
    // Normaliser le type de profil selon la convention DSTV
    // Exemples : IPE200, HEA300, UPN100
    return type.toUpperCase().replace(/\s+/g, '');
  }

  private isIProfile(type: string): boolean {
    const upperType = type.toUpperCase();
    return upperType.startsWith('IPE') || 
           upperType.startsWith('IPN') ||
           upperType.startsWith('HE') ||
           upperType.startsWith('HD') ||
           upperType.startsWith('HP');
  }

  private isUProfile(type: string): boolean {
    const upperType = type.toUpperCase();
    return upperType.startsWith('UPN') || 
           upperType.startsWith('UPE') ||
           upperType.startsWith('UAP');
  }

  private getAllHoles(data: any): any[] {
    const holes: any[] = [];
    
    if (data.organized?.byType?.holes) {
      for (const [face, faceHoles] of data.organized.byType.holes) {
        holes.push(...faceHoles);
      }
    } else if (data.features?.holes) {
      holes.push(...data.features.holes);
    }
    
    return holes;
  }

  private calculateMetadata(blocks: DSTVBlock[], data: any): any {
    let lineCount = 0;
    let holeCount = 0;
    let contourCount = 0;
    let markingCount = 0;
    
    for (const block of blocks) {
      lineCount += block.lines.length;
      
      switch (block.type) {
        case 'BO':
        case 'LO':
          holeCount++;
          break;
        case 'AK':
        case 'IK':
          contourCount++;
          break;
        case 'SI':
          // SI est pour le marking, pas pour les trous
          if (block.lines[3] && typeof block.lines[3] === 'string') {
            markingCount++;
          }
          break;
      }
    }
    
    return {
      blockCount: blocks.length,
      lineCount,
      features: {
        holes: holeCount,
        contours: contourCount,
        markings: markingCount
      }
    };
  }
}