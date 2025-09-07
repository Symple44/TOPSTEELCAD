/**
 * Système d'enregistrement dynamique des parsers DSTV
 * Permet l'extension du système avec des parsers personnalisés
 */

import { DSTVBlockType } from '../../types/dstv-types';
import { IBlockParser, ParserConstructor } from '../interfaces/IBlockParser';
import { BlockParserFactory } from '../factory/BlockParserFactory';

/**
 * Registre pour l'enregistrement dynamique de parsers
 */
export class ParserRegistry {
  /**
   * Enregistre un parser personnalisé pour un type de bloc
   */
  static registerCustomParser(blockType: DSTVBlockType, parserClass: ParserConstructor): void {
    const factory = BlockParserFactory.getInstance();
    factory.registerParser(blockType, parserClass);
    
    console.log(`Registered custom parser for block type: ${blockType}`);
  }
  
  /**
   * Enregistre plusieurs parsers en une seule opération
   */
  static registerBulkParsers(parsers: Array<{blockType: DSTVBlockType, parser: ParserConstructor}>): void {
    const factory = BlockParserFactory.getInstance();
    
    parsers.forEach(({blockType, parser}) => {
      factory.registerParser(blockType, parser);
    });
    
    console.log(`Registered ${parsers.length} custom parsers`);
  }
  
  /**
   * Vérifie si un type de bloc est supporté
   */
  static isSupported(blockType: DSTVBlockType): boolean {
    const factory = BlockParserFactory.getInstance();
    return factory.isSupported(blockType);
  }
  
  /**
   * Obtient la liste des types de blocs supportés
   */
  static getSupportedTypes(): DSTVBlockType[] {
    const factory = BlockParserFactory.getInstance();
    return factory.getSupportedBlockTypes();
  }
  
  /**
   * Enregistre un plugin de parsers
   */
  static registerPlugin(plugin: IParserPlugin): void {
    plugin.register(ParserRegistry);
    console.log(`Registered parser plugin: ${plugin.name}`);
  }
  
  /**
   * Réinitialise le registre (utile pour les tests)
   */
  static reset(): void {
    BlockParserFactory.reset();
  }
}

/**
 * Interface pour les plugins de parsers
 */
export interface IParserPlugin {
  readonly name: string;
  readonly version: string;
  register(registry: typeof ParserRegistry): void;
}

/**
 * Exemple de plugin
 */
export class ExampleParserPlugin implements IParserPlugin {
  readonly name = 'ExamplePlugin';
  readonly version = '1.0.0';
  
  register(registry: typeof ParserRegistry): void {
    // Exemple d'enregistrement de parsers personnalisés
    // registry.registerCustomParser(DSTVBlockType.CUSTOM_XY, CustomXYParser);
    // registry.registerCustomParser(DSTVBlockType.CUSTOM_ZZ, CustomZZParser);
  }
}

/**
 * Décorateur pour l'auto-enregistrement de parsers
 */
export function DSTVParser(blockType: DSTVBlockType) {
  return function<T extends ParserConstructor>(constructor: T) {
    // Auto-enregistrer le parser lors de sa déclaration
    ParserRegistry.registerCustomParser(blockType, constructor);
    return constructor;
  };
}

// Exemples d'utilisation:
// 
// 1. Enregistrement manuel:
// ParserRegistry.registerCustomParser(DSTVBlockType.XX, MyCustomXXParser);
//
// 2. Enregistrement en masse:
// ParserRegistry.registerBulkParsers([
//   { blockType: DSTVBlockType.XX, parser: MyCustomXXParser },
//   { blockType: DSTVBlockType.YY, parser: MyCustomYYParser }
// ]);
//
// 3. Avec décorateur:
// @DSTVParser(DSTVBlockType.XX)
// export class MyCustomXXParser implements IBlockParser<MyData> {
//   // ...
// }
//
// 4. Via plugin:
// const myPlugin = new MyParserPlugin();
// ParserRegistry.registerPlugin(myPlugin);