/**
 * Text Input Handler Interface
 *
 * Provides seamless multi-line text input without external editors
 * for CLI UX improvements as specified in the design document.
 */

export interface KeyEvent {
  name?: string;
  ctrl?: boolean;
  meta?: boolean;
  shift?: boolean;
  sequence?: string;
}

export interface CursorPosition {
  line: number;
  column: number;
}

export interface InputOptions {
  placeholder?: string;
  defaultContent?: string;
  maxLines?: number;
  submitKeys?: string[];
  cancelKeys?: string[];
  showLineNumbers?: boolean;
}

export interface InputSession {
  id: string;
  prompt: string;
  content: string[];
  cursorPosition: CursorPosition;
  startTime: Date;
  options: InputOptions;
  status: 'active' | 'completed' | 'cancelled';
}

/**
 * TextInputHandler provides seamless multi-line text input without external editors
 *
 * Key Methods:
 * - collectMultilineInput(): Main method for collecting multi-line text input
 * - enableRawMode(): Enable raw terminal mode for keystroke capture
 * - disableRawMode(): Disable raw terminal mode
 * - handleSpecialKeys(): Process special keyboard events
 * - displayInputPrompt(): Show visual feedback for input
 *
 * Implementation Strategy:
 * - Use process.stdin.setRawMode(true) to capture individual keystrokes
 * - Handle special characters manually (Ctrl+C, Enter, Backspace, Arrow keys)
 * - Provide visual feedback for multi-line editing with line numbers
 * - Support common editing shortcuts (Ctrl+A, Ctrl+E, Ctrl+U)
 */
export interface TextInputHandler {
  /**
   * Collect multi-line text input from the user
   * @param prompt The prompt to display to the user
   * @param options Optional configuration for input behavior
   * @returns Promise that resolves to the collected text
   */
  collectMultilineInput(prompt: string, options?: InputOptions): Promise<string>;

  /**
   * Enable raw mode for direct keystroke capture
   */
  enableRawMode(): void;

  /**
   * Disable raw mode and return to normal terminal behavior
   */
  disableRawMode(): void;

  /**
   * Handle special keyboard events (Ctrl+C, arrows, etc.)
   * @param key The keyboard event to process
   * @returns true if the key was handled, false otherwise
   */
  handleSpecialKeys(key: KeyEvent): boolean;

  /**
   * Display the input prompt with current content
   * @param content The current input content to display
   */
  displayInputPrompt(content: string): void;

  /**
   * Get the current input session
   * @returns The active input session or null if none
   */
  getCurrentSession(): InputSession | null;

  /**
   * Cancel the current input session
   */
  cancelInput(): void;
}
