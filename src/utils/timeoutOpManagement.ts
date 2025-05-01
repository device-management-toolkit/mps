import { Environment } from "./Environment.js";

// Load default timeout from environment configuration

export function getTimeoutMsDefault(): number {
    if (Environment.Config?.timeout_ms_default) {
        const timeoutMs = parseInt(Environment.Config.timeout_ms_default, 10);
        if (!isNaN(timeoutMs) && timeoutMs > 0) {
            return timeoutMs;
        }            
    }

    return 10000; // Default value if the config is invalid
}

export const TIMEOUT_MS_DEFAULT = getTimeoutMsDefault(); // Default timeout in milliseconds    
export const TIMEOUT_MESSAGE = 'Timeout' // Default message for timeout error

// It extends the Error class to create a custom error type for timeout errors. This allows for more specific error handling and differentiation from other types of errors in the application.

export class TimeoutError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'TimeoutError'
    Object.setPrototypeOf(this, TimeoutError.prototype); // Recommended for proper instanceof checking
  }
}

// It implements a timeout mechanism for promises (Any async method). It runs a race between the Promise<T> and the Timeout. The Promise<T> provides the result when the total processing time is lower than the defined Timeout. Otherwise, a timeout occurs, and it throws a TimeoutError instance.

export async function operationWithTimeout<T>(promise: Promise<T>, timeoutMs: number = TIMEOUT_MS_DEFAULT, errorMessage:string = TIMEOUT_MESSAGE): Promise<T> {
    if (typeof timeoutMs !== 'number' || timeoutMs <= 0) {
        timeoutMs = TIMEOUT_MS_DEFAULT;
    }

    const timeoutPromise = new Promise<T>((_, reject) => {
      setTimeout(() => {
          reject(new TimeoutError(errorMessage));
      }, timeoutMs);
    });


  return Promise.race([promise, timeoutPromise])
      .then(result => result)
      .catch(error => {
          throw error; 
      });
}

