/**
 * Classe de base pour les stages d'export DSTV
 * Version simplifiée pour éviter les dépendances complexes
 */

export interface StageConfig {
  name: string;
  description: string;
}

export abstract class BaseStage {
  protected name: string;
  protected description: string;

  constructor(config: StageConfig) {
    this.name = config.name;
    this.description = config.description;
  }

  abstract process(context: any): Promise<any>;
}