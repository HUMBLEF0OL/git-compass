import { PipelineStep, ComposedPipeline } from '../types/infrastructure.js';

/**
 * Pure factory function. Takes a variadic list of step functions and returns a ComposedPipeline.
 */
export function compose<TIn, TOut>(
  ...steps: PipelineStep<any, any>[]
): ComposedPipeline<TIn, TOut> {
  const pipeline = (async (input: TIn): Promise<TOut> => {
    let result: any = input;
    for (const step of steps) {
      result = await step(result);
    }
    return result as TOut;
  }) as ComposedPipeline<TIn, TOut>;

  Object.defineProperty(pipeline, 'stepCount', {
    value: steps.length,
    writable: false,
    enumerable: true,
    configurable: false
  });

  return pipeline;
}

/**
 * Pure factory function. Synchronous variant.
 */
export function composeSync<TIn, TOut>(
  ...steps: Array<(input: any) => any>
): (input: TIn) => TOut {
  return (input: TIn): TOut => {
    let result: any = input;
    for (const step of steps) {
      result = step(result);
    }
    return result as TOut;
  };
}

/**
 * Pure function. Wraps an existing ComposedPipeline with an error handler.
 */
export function withErrorHandler<TIn, TOut>(
  pipeline: ComposedPipeline<TIn, TOut>,
  handler: (error: unknown, input: TIn) => TOut | Promise<TOut>
): ComposedPipeline<TIn, TOut> {
  const wrapped = (async (input: TIn): Promise<TOut> => {
    try {
      return await pipeline(input);
    } catch (error) {
      return await handler(error, input);
    }
  }) as ComposedPipeline<TIn, TOut>;

  Object.defineProperty(wrapped, 'stepCount', {
    value: pipeline.stepCount,
    writable: false,
    enumerable: true,
    configurable: false
  });

  return wrapped;
}
