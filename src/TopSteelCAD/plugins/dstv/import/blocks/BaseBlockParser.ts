/**
 * BaseBlockParser - Classe de base pour tous les parsers de blocs DSTV
 * Fournit des méthodes communes pour le parsing
 */

import { DSTVToken, DSTVTokenType } from '../stages/DSTVLexicalStage';

export abstract class BaseBlockParser<T> {
  protected currentIndex: number = 0;
  protected tokens: DSTVToken[] = [];
  
  /**
   * Parse les tokens d'un bloc DSTV
   */
  abstract parse(tokens: DSTVToken[]): T;
  
  /**
   * Récupère la valeur numérique suivante
   */
  protected getNextNumber(): number | null {
    while (this.currentIndex < this.tokens.length) {
      const token = this.tokens[this.currentIndex++];
      if (token.type === DSTVTokenType.INTEGER || token.type === DSTVTokenType.FLOAT) {
        return parseFloat(token.value);
      }
    }
    return null;
  }
  
  /**
   * Récupère les N prochaines valeurs numériques
   */
  protected getNextNumbers(count: number): number[] {
    const numbers: number[] = [];
    for (let i = 0; i < count; i++) {
      const num = this.getNextNumber();
      if (num !== null) {
        numbers.push(num);
      }
    }
    return numbers;
  }
  
  /**
   * Récupère la prochaine chaîne
   */
  protected getNextString(): string | null {
    while (this.currentIndex < this.tokens.length) {
      const token = this.tokens[this.currentIndex++];
      if (token.type === DSTVTokenType.IDENTIFIER || token.type === DSTVTokenType.STRING) {
        return token.value;
      }
    }
    return null;
  }
  
  /**
   * Récupère l'indicateur de face
   */
  protected getFaceIndicator(): string | null {
    for (const token of this.tokens) {
      if (token.type === DSTVTokenType.IDENTIFIER) { // Face indicators are typically identifiers
        return token.value;
      }
    }
    return null;
  }
  
  /**
   * Reset l'index de parsing
   */
  protected reset(): void {
    this.currentIndex = 0;
  }
  
  /**
   * Vérifie si on est à la fin des tokens
   */
  protected isAtEnd(): boolean {
    return this.currentIndex >= this.tokens.length;
  }
  
  /**
   * Filtre les tokens pour garder seulement les données
   */
  protected filterDataTokens(tokens: DSTVToken[]): DSTVToken[] {
    return tokens.filter(t => 
      t.type !== DSTVTokenType.COMMENT &&
      t.type !== DSTVTokenType.WHITESPACE &&
      t.type !== DSTVTokenType.NEWLINE
    );
  }
}