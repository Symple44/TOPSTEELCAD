/**
 * Factory Pattern pour la création centralisée des parsers DSTV
 * Gère l'instanciation et le cache des parsers
 */

import { DSTVBlockType } from '../../types/dstv-types';
import { IBlockParser, ParserConstructor, ParserConfig } from '../interfaces/IBlockParser';
import { ProcessingContext } from '../../../../../core/pipeline/ProcessingContext';

// Import des parsers existants
import { STBlockParser } from '../STBlockParser';
import { BOBlockParser } from '../BOBlockParser';
import { AKBlockParser } from '../AKBlockParser';
import { IKBlockParser } from '../IKBlockParser';
import { SIBlockParser } from '../SIBlockParser';
import { SCBlockParser } from '../SCBlockParser';
import { ENBlockParser } from '../ENBlockParser';
import { PUBlockParser } from '../PUBlockParser';
import { KOBlockParser } from '../KOBlockParser';
import { KABlockParser } from '../KABlockParser';
import { TOBlockParser } from '../TOBlockParser';
import { UEBlockParser } from '../UEBlockParser';
import { BRBlockParser } from '../BRBlockParser';
import { VOBlockParser } from '../VOBlockParser';
import { NUBlockParser } from '../NUBlockParser';
import { FPBlockParser } from '../FPBlockParser';
import { LPBlockParser } from '../LPBlockParser';
import { RTBlockParser } from '../RTBlockParser';
import { WABlockParser } from '../WABlockParser';
import { GenericBlockParser } from '../GenericBlockParser';

// Adaptateurs pour compatibilité
import { BaseStageParserAdapter, BaseBlockParserAdapter } from '../adapters/ParserAdapter';

/**
 * Factory Singleton pour la création des parsers DSTV
 */
export class BlockParserFactory {
  private static instance: BlockParserFactory;
  private parsers = new Map<DSTVBlockType, IBlockParser>();
  private parserConstructors = new Map<DSTVBlockType, ParserConstructor>();
  private config: ParserConfig;
  
  private constructor(config?: ParserConfig) {
    this.config = config || { 
      strictMode: false, 
      enableValidation: true,
      enableDebugLogs: false 
    };
    this.registerDefaultParsers();
  }
  
  /**
   * Obtient l'instance singleton du factory
   */
  static getInstance(config?: ParserConfig): BlockParserFactory {
    if (!BlockParserFactory.instance) {
      BlockParserFactory.instance = new BlockParserFactory(config);
    }
    return BlockParserFactory.instance;
  }
  
  /**
   * Réinitialise le factory (utile pour les tests)
   */
  static reset(): void {
    BlockParserFactory.instance = null as any;
  }
  
  /**
   * Enregistre dynamiquement un parser
   */
  registerParser(blockType: DSTVBlockType, parserConstructor: ParserConstructor): void {
    this.parserConstructors.set(blockType, parserConstructor);
    // Invalider le cache pour ce type
    this.parsers.delete(blockType);
  }
  
  /**
   * Obtient une instance de parser (pattern singleton par type)
   */
  getParser(blockType: DSTVBlockType): IBlockParser {
    // Vérifier le cache
    if (!this.parsers.has(blockType)) {
      const parser = this.createParser(blockType);
      this.parsers.set(blockType, parser);
    }
    return this.parsers.get(blockType)!;
  }
  
  /**
   * Crée une nouvelle instance de parser
   */
  private createParser(blockType: DSTVBlockType): IBlockParser {
    // Vérifier si un constructeur est enregistré
    const ParserClass = this.parserConstructors.get(blockType);
    
    if (ParserClass) {
      // Créer une instance avec la config
      return new ParserClass(this.config);
    }
    
    // Essayer de créer un parser adapté basé sur les parsers existants
    const adaptedParser = this.createAdaptedParser(blockType);
    if (adaptedParser) {
      return adaptedParser;
    }
    
    // Fallback vers le parser générique
    return new GenericBlockParser(blockType, this.config);
  }
  
  /**
   * Crée un parser adapté pour les parsers existants
   */
  private createAdaptedParser(blockType: DSTVBlockType): IBlockParser | null {
    // Map des parsers existants qui nécessitent une adaptation
    const legacyParsers: Partial<Record<DSTVBlockType, () => IBlockParser>> = {
      [DSTVBlockType.ST]: () => new BaseStageParserAdapter(new STBlockParser(), DSTVBlockType.ST),
      [DSTVBlockType.BO]: () => new BaseStageParserAdapter(new BOBlockParser(), DSTVBlockType.BO),
      [DSTVBlockType.AK]: () => new BaseStageParserAdapter(new AKBlockParser(), DSTVBlockType.AK),
      [DSTVBlockType.IK]: () => new BaseStageParserAdapter(new IKBlockParser(), DSTVBlockType.IK),
      [DSTVBlockType.SI]: () => new BaseStageParserAdapter(new SIBlockParser(), DSTVBlockType.SI),
      [DSTVBlockType.SC]: () => new BaseStageParserAdapter(new SCBlockParser(), DSTVBlockType.SC),
      [DSTVBlockType.EN]: () => new BaseStageParserAdapter(new ENBlockParser(), DSTVBlockType.EN),
      [DSTVBlockType.PU]: () => new BaseStageParserAdapter(new PUBlockParser(), DSTVBlockType.PU),
      [DSTVBlockType.KO]: () => new BaseStageParserAdapter(new KOBlockParser(), DSTVBlockType.KO),
      [DSTVBlockType.KA]: () => new BaseStageParserAdapter(new KABlockParser(), DSTVBlockType.KA),
      [DSTVBlockType.TO]: () => new BaseStageParserAdapter(new TOBlockParser(), DSTVBlockType.TO),
      [DSTVBlockType.UE]: () => new BaseStageParserAdapter(new UEBlockParser(), DSTVBlockType.UE),
      // Parsers simples qui héritent de BaseBlockParser
      [DSTVBlockType.BR]: () => new BaseBlockParserAdapter(new BRBlockParser(), DSTVBlockType.BR),
      [DSTVBlockType.VO]: () => new BaseBlockParserAdapter(new VOBlockParser(), DSTVBlockType.VO),
      [DSTVBlockType.NU]: () => new BaseBlockParserAdapter(new NUBlockParser(), DSTVBlockType.NU),
      [DSTVBlockType.FP]: () => new BaseBlockParserAdapter(new FPBlockParser(), DSTVBlockType.FP),
      [DSTVBlockType.LP]: () => new BaseBlockParserAdapter(new LPBlockParser(), DSTVBlockType.LP),
      [DSTVBlockType.RT]: () => new BaseBlockParserAdapter(new RTBlockParser(), DSTVBlockType.RT),
      [DSTVBlockType.WA]: () => new BaseBlockParserAdapter(new WABlockParser(), DSTVBlockType.WA),
    };
    
    const factory = legacyParsers[blockType];
    return factory ? factory() : null;
  }
  
  /**
   * Vérifie si un type de bloc est supporté
   */
  isSupported(blockType: DSTVBlockType): boolean {
    return this.parserConstructors.has(blockType) || this.canCreateAdaptedParser(blockType);
  }
  
  /**
   * Vérifie si on peut créer un parser adapté
   */
  private canCreateAdaptedParser(blockType: DSTVBlockType): boolean {
    // Liste des types supportés par adaptation
    const supportedTypes = [
      DSTVBlockType.ST, DSTVBlockType.BO, DSTVBlockType.AK,
      DSTVBlockType.IK, DSTVBlockType.SI, DSTVBlockType.SC,
      DSTVBlockType.EN, DSTVBlockType.PU, DSTVBlockType.KO,
      DSTVBlockType.KA, DSTVBlockType.TO, DSTVBlockType.UE, 
      DSTVBlockType.BR, DSTVBlockType.VO, DSTVBlockType.NU, 
      DSTVBlockType.FP, DSTVBlockType.LP, DSTVBlockType.RT, 
      DSTVBlockType.WA
    ];
    return supportedTypes.includes(blockType);
  }
  
  /**
   * Obtient tous les types de blocs supportés
   */
  getSupportedBlockTypes(): DSTVBlockType[] {
    const registered = Array.from(this.parserConstructors.keys());
    const adapted = [
      DSTVBlockType.ST, DSTVBlockType.BO, DSTVBlockType.AK,
      DSTVBlockType.IK, DSTVBlockType.SI, DSTVBlockType.SC,
      DSTVBlockType.EN, DSTVBlockType.PU, DSTVBlockType.KO,
      DSTVBlockType.KA, DSTVBlockType.TO, DSTVBlockType.UE,
      DSTVBlockType.BR, DSTVBlockType.VO, DSTVBlockType.NU,
      DSTVBlockType.FP, DSTVBlockType.LP, DSTVBlockType.RT,
      DSTVBlockType.WA
    ];
    
    // Combiner et éliminer les doublons
    return [...new Set([...registered, ...adapted])];
  }
  
  /**
   * Enregistre tous les parsers par défaut (pour migration future)
   */
  private registerDefaultParsers(): void {
    // Pour l'instant, on utilise l'adaptation
    // Dans le futur, on pourrait migrer vers des parsers qui implémentent directement IBlockParser
    
    // Exemple de migration future:
    // this.registerParser(DSTVBlockType.ST, STBlockParserV2);
    // this.registerParser(DSTVBlockType.BO, BOBlockParserV2);
    // etc...
  }
  
  /**
   * Parse directement des données avec le bon parser
   */
  async parse(blockType: DSTVBlockType, rawData: string[], context?: ProcessingContext): Promise<any> {
    const parser = this.getParser(blockType);
    return parser.parse(rawData, context);
  }
  
  /**
   * Valide des données avec le bon parser
   */
  async validate(blockType: DSTVBlockType, rawData: string[]): Promise<boolean> {
    const parser = this.getParser(blockType);
    const result = await parser.validate(rawData);
    return result.isValid;
  }
  
  /**
   * Met à jour la configuration globale
   */
  updateConfig(config: Partial<ParserConfig>): void {
    this.config = { ...this.config, ...config };
    // Invalider le cache car la config a changé
    this.parsers.clear();
  }
  
  /**
   * Obtient les statistiques du factory
   */
  getStatistics(): {
    cachedParsers: number;
    registeredTypes: number;
    supportedTypes: number;
  } {
    return {
      cachedParsers: this.parsers.size,
      registeredTypes: this.parserConstructors.size,
      supportedTypes: this.getSupportedBlockTypes().length
    };
  }
}