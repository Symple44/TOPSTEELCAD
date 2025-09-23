/**
 * Processeur pour créer et télécharger des Blobs
 */

import { IOutputProcessor } from '../interfaces';

export class BlobProcessor implements IOutputProcessor {
  /**
   * Convertit les données en Blob
   */
  async process(data: any, options?: any): Promise<Blob> {
    if (data instanceof Blob) {
      return data;
    }

    if (data instanceof ArrayBuffer) {
      return new Blob([data], { type: options?.mimeType || 'application/octet-stream' });
    }

    if (typeof data === 'string') {
      return new Blob([data], { type: options?.mimeType || 'text/plain' });
    }

    if (typeof data === 'object') {
      const jsonString = JSON.stringify(data, null, 2);
      return new Blob([jsonString], { type: 'application/json' });
    }

    // Fallback
    return new Blob([String(data)], { type: 'text/plain' });
  }

  /**
   * Déclenche le téléchargement du blob
   */
  download(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;

    // Style pour rendre invisible
    link.style.display = 'none';

    document.body.appendChild(link);
    link.click();

    // Cleanup
    setTimeout(() => {
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }, 100);
  }

  /**
   * Méthode utilitaire pour obtenir la taille formatée
   */
  static formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}