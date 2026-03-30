import ora, { Ora } from 'ora';
import type { ReadLine } from 'readline';

export async function withSpinner<T>(
  rl: ReadLine | null,
  message: string,
  operation: () => Promise<T>
): Promise<T> {
  rl?.pause();
  const spinner: Ora = ora(message).start();
  try {
    const result = await operation();
    spinner.stop();
    return result;
  } catch (error) {
    spinner.fail();
    throw error;
  } finally {
    rl?.resume();
  }
}

export function pauseReadline(rl: ReadLine | null): void {
  rl?.pause();
}

export function resumeReadline(rl: ReadLine | null, shouldPrompt: boolean = true): void {
  if (rl) {
    rl.resume();
    if (shouldPrompt) {
      rl.prompt();
    }
  }
}
