/**
 * Utilitaires pour les pipelines
 */

import { ProcessingPipeline } from './ProcessingPipeline';
import { ProcessingContext } from './ProcessingContext';
import type { PipelineStage } from '../types/PipelineTypes';

export const PipelineUtils = {
  /**
   * Crée un pipeline simple avec stages en séquence
   */
  createSequentialPipeline<TInput, TOutput>(
    name: string,
    stages: PipelineStage<any, any>[]
  ): ProcessingPipeline<TInput, TOutput> {
    const pipeline = new ProcessingPipeline<TInput, TOutput>(name);
    pipeline.addStages(stages);
    return pipeline;
  },

  /**
   * Crée un contexte de traitement simple
   */
  createSimpleContext(options: Record<string, any> = {}): ProcessingContext {
    return new ProcessingContext(undefined, options);
  },

  /**
   * Combine plusieurs pipelines en un seul
   */
  combinePipelines<TInput, TOutput>(
    name: string,
    pipelines: ProcessingPipeline<any, any>[]
  ): ProcessingPipeline<TInput, TOutput> {
    const combined = new ProcessingPipeline<TInput, TOutput>(name);
    
    for (const pipeline of pipelines) {
      combined.addStages(pipeline.stages);
    }
    
    return combined;
  }
};