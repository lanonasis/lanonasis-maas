/**
 * Text Input Handler Implementation
 *
 * Provides seamless multi-line text input without external editors
 * Implementation of the TextInputHandler interface.
 */

import {
  TextInputHandler,
  KeyEvent,
  CursorPosition,
  InputOptions,
  InputSession,
} from '../interfaces/TextInputHandler.js';

/**
 * Default input options for the text input handler
 */
const DEFAULT_INPUT_OPTIONS: InputOptions = {
  placeholder: 'Enter your text (Ctrl+D to finish, Ctrl+C to cancel):',
  maxLines: 100,
  submitKeys: ['ctrl+d'],
  cancelKeys: ['ctrl+c'],
  showLineNumbers: true,
};

/**
 * TextInputHandlerImpl provides seamless multi-line text input without external editors
 *
 * This implementation uses process.stdin.setRawMode(true) to capture individual keystrokes
 * and handles special characters manually to provide a smooth editing experience.
 */
export class TextInputHandlerImpl implements TextInputHandler {
  private currentSession: InputSession | null = null;
  private isRawModeEnabled = false;
  private originalStdinMode: boolean | undefined;

  /**
   * Collect multi-line text input from the user
   */
  async collectMultilineInput(prompt: string, options?: InputOptions): Promise<string> {
    const mergedOptions = { ...DEFAULT_INPUT_OPTIONS, ...options };

    // Initialize content with defaultContent if provided
    const initialContent = mergedOptions.defaultContent
      ? mergedOptions.defaultContent.split('\n')
      : [''];

    // Create new input session
    this.currentSession = {
      id: `session_${Date.now()}`,
      prompt,
      content: initialContent,
      cursorPosition: {
        line: initialContent.length - 1,
        column: initialContent[initialContent.length - 1].length
      },
      startTime: new Date(),
      options: mergedOptions,
      status: 'active',
    };

    return new Promise(async (resolve, reject) => {
      let handleKeypress: ((chunk: Buffer) => void) | null = null;
      let sigintHandler: (() => void) | null = null;

      const cleanup = () => {
        if (handleKeypress) {
          process.stdin.removeListener('data', handleKeypress);
          handleKeypress = null;
        }
        if (sigintHandler) {
          process.removeListener('SIGINT', sigintHandler);
          sigintHandler = null;
        }
        this.disableRawMode();
        // Restore terminal state
        process.stdout.write('\x1b[?25h'); // Show cursor
      };

      // Set up completion handlers first
      const complete = (result: string) => {
        cleanup();
        if (this.currentSession) {
          this.currentSession.status = 'completed';
        }
        resolve(result);
      };

      const cancel = () => {
        cleanup();
        if (this.currentSession) {
          this.currentSession.status = 'cancelled';
        }
        reject(new Error('Input cancelled by user'));
      };

      // Store handlers for special key processing
      (this as any)._completeHandler = complete;
      (this as any)._cancelHandler = cancel;

      try {
        // Check if we can use raw mode
        if (!process.stdin.isTTY) {
          // Fall back to simple readline for non-TTY environments
          console.log('\nNote: Interactive text input not available. Using simple input mode.');
          console.log('Enter your text (empty line to finish):');
          const readline = require('readline');
          const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
          });
          const lines: string[] = [];
          rl.on('line', (line: string) => {
            if (line === '') {
              rl.close();
              complete(lines.join('\n'));
            } else {
              lines.push(line);
            }
          });
          rl.on('close', () => {
            complete(lines.join('\n'));
          });
          return;
        }

        // Add SIGINT handler as fallback for Ctrl+C
        sigintHandler = () => {
          cancel();
        };
        process.on('SIGINT', sigintHandler);

        // Safety: Add a way to escape via triple-ESC (sends 3 escape chars quickly)
        let escapeCount = 0;
        let escapeTimer: NodeJS.Timeout | null = null;

        // Try to claim stdin from any previous handlers
        process.stdin.removeAllListeners('data');
        process.stdin.removeAllListeners('readable');
        process.stdin.removeAllListeners('end');

        this.enableRawMode();

        // Verify raw mode is working
        if (!this.isRawModeEnabled) {
          console.log('\nWarning: Could not enable raw mode. Falling back to editor mode.');
          cleanup();
          const { content } = await (await import('inquirer')).default.prompt<{ content: string }>([
            { type: 'editor', name: 'content', message: prompt, default: mergedOptions.defaultContent }
          ]);
          resolve(content);
          return;
        }

        this.displayInputPrompt(this.getCurrentContent());

        handleKeypress = (chunk: Buffer) => {
          try {
            const key = this.parseKeyEvent(chunk);

            if (this.handleSpecialKeys(key)) {
              return;
            }

            // Handle regular character input
            if (key.sequence && this.currentSession) {
              // Filter out control characters that shouldn't be added as text
              if (key.sequence.charCodeAt(0) >= 32 || key.sequence === '\t') {
                this.addCharacterToInput(key.sequence);
                this.displayInputPrompt(this.getCurrentContent());
              }
            }
          } catch (err) {
            // Don't let errors in key handling crash the input
            console.error('Key handling error:', err);
          }
        };

        // Ensure stdin is flowing before adding listener
        // This is critical after inquirer prompts which may pause stdin
        this.resumeStdinIfSupported();
        process.stdin.on('data', handleKeypress);
      } catch (error) {
        cleanup();
        reject(error);
      }
    });
  }

  /**
   * Enable raw mode for direct keystroke capture
   */
  enableRawMode(): void {
    if (!this.isRawModeEnabled && process.stdin.isTTY) {
      this.originalStdinMode = process.stdin.isRaw;
      process.stdin.setRawMode(true);
      this.resumeStdinIfSupported(); // Ensure stdin is flowing to receive data events
      this.isRawModeEnabled = true;
    } else if (!process.stdin.isTTY) {
      // Non-TTY mode - can't use raw mode, fall back to line mode
      console.error('Warning: Not a TTY, inline text input may not work correctly');
      this.resumeStdinIfSupported();
    }
  }

  /**
   * Disable raw mode and return to normal terminal behavior
   */
  disableRawMode(): void {
    if (this.isRawModeEnabled && process.stdin.isTTY) {
      process.stdin.setRawMode(this.originalStdinMode || false);
      this.isRawModeEnabled = false;
    }
    // Don't pause stdin here as other handlers may need it
  }

  /**
   * Handle special keyboard events
   */
  handleSpecialKeys(key: KeyEvent): boolean {
    if (!this.currentSession) return false;

    const { options } = this.currentSession;

    // Handle submit keys (default: Ctrl+D)
    if (options.submitKeys?.some((submitKey) => this.matchesKey(key, submitKey))) {
      const content = this.getCurrentContent();
      (this as any)._completeHandler?.(content);
      return true;
    }

    // Handle cancel keys (default: Ctrl+C)
    if (options.cancelKeys?.some((cancelKey) => this.matchesKey(key, cancelKey))) {
      (this as any)._cancelHandler?.();
      return true;
    }

    // Handle Enter key (new line)
    if (key.name === 'return' || key.name === 'enter') {
      this.addNewLine();
      this.displayInputPrompt(this.getCurrentContent());
      return true;
    }

    // Handle Backspace
    if (key.name === 'backspace') {
      this.handleBackspace();
      this.displayInputPrompt(this.getCurrentContent());
      return true;
    }

    // Handle arrow keys
    if (key.name === 'up' || key.name === 'down' || key.name === 'left' || key.name === 'right') {
      this.handleArrowKey(key.name);
      this.displayInputPrompt(this.getCurrentContent());
      return true;
    }

    return false;
  }

  /**
   * Display the input prompt with current content
   */
  displayInputPrompt(content: string): void {
    if (!this.currentSession) return;

    // Clear the screen and move cursor to top
    process.stdout.write('\x1b[2J\x1b[H');

    // Display prompt
    console.log(this.currentSession.prompt);
    console.log('─'.repeat(50));

    // Display content with line numbers if enabled
    const lines = content.split('\n');
    if (this.currentSession.options.showLineNumbers) {
      lines.forEach((line, index) => {
        const lineNum = (index + 1).toString().padStart(3, ' ');
        const cursor = this.currentSession!.cursorPosition.line === index ? '→' : ' ';
        console.log(`${lineNum}${cursor} ${line}`);
      });
    } else {
      console.log(content);
    }

    // Display help text
    console.log('─'.repeat(50));
    console.log('Ctrl+D to finish, Ctrl+C to cancel, Enter for new line');
  }

  /**
   * Get the current input session
   */
  getCurrentSession(): InputSession | null {
    return this.currentSession;
  }

  /**
   * Cancel the current input session
   */
  cancelInput(): void {
    if (this.currentSession) {
      this.currentSession.status = 'cancelled';
      (this as any)._cancelHandler?.();
    }
  }

  /**
   * Parse raw key event from buffer
   */
  private parseKeyEvent(chunk: Buffer): KeyEvent {
    const sequence = chunk.toString();
    const key: KeyEvent = { sequence };

    // Parse common key combinations
    if (sequence === '\u0003') {
      key.name = 'c';
      key.ctrl = true;
    } else if (sequence === '\u0004') {
      key.name = 'd';
      key.ctrl = true;
    } else if (sequence === '\r' || sequence === '\n') {
      key.name = 'return';
    } else if (sequence === '\u007f' || sequence === '\b') {
      key.name = 'backspace';
    } else if (sequence === '\u001b[A') {
      key.name = 'up';
    } else if (sequence === '\u001b[B') {
      key.name = 'down';
    } else if (sequence === '\u001b[C') {
      key.name = 'right';
    } else if (sequence === '\u001b[D') {
      key.name = 'left';
    }

    return key;
  }

  private resumeStdinIfSupported(): void {
    if (typeof process.stdin.resume === 'function') {
      process.stdin.resume();
    }
  }

  /**
   * Check if a key event matches a key pattern
   */
  private matchesKey(key: KeyEvent, pattern: string): boolean {
    if (pattern.startsWith('ctrl+')) {
      const keyName = pattern.substring(5);
      return key.ctrl === true && key.name === keyName;
    }
    return key.name === pattern;
  }

  /**
   * Add a character to the current input
   */
  private addCharacterToInput(char: string): void {
    if (!this.currentSession) return;

    const { cursorPosition, content } = this.currentSession;
    const currentLine = content[cursorPosition.line] || '';

    const newLine =
      currentLine.slice(0, cursorPosition.column) + char + currentLine.slice(cursorPosition.column);

    content[cursorPosition.line] = newLine;
    cursorPosition.column += char.length;
  }

  /**
   * Add a new line to the input
   */
  private addNewLine(): void {
    if (!this.currentSession) return;

    const { cursorPosition, content, options } = this.currentSession;

    // Check max lines limit
    if (options.maxLines && content.length >= options.maxLines) {
      return;
    }

    const currentLine = content[cursorPosition.line] || '';
    const beforeCursor = currentLine.slice(0, cursorPosition.column);
    const afterCursor = currentLine.slice(cursorPosition.column);

    content[cursorPosition.line] = beforeCursor;
    content.splice(cursorPosition.line + 1, 0, afterCursor);

    cursorPosition.line++;
    cursorPosition.column = 0;
  }

  /**
   * Handle backspace key
   */
  private handleBackspace(): void {
    if (!this.currentSession) return;

    const { cursorPosition, content } = this.currentSession;

    if (cursorPosition.column > 0) {
      // Remove character from current line
      const currentLine = content[cursorPosition.line];
      const newLine =
        currentLine.slice(0, cursorPosition.column - 1) + currentLine.slice(cursorPosition.column);
      content[cursorPosition.line] = newLine;
      cursorPosition.column--;
    } else if (cursorPosition.line > 0) {
      // Merge with previous line
      const currentLine = content[cursorPosition.line];
      const previousLine = content[cursorPosition.line - 1];

      content[cursorPosition.line - 1] = previousLine + currentLine;
      content.splice(cursorPosition.line, 1);

      cursorPosition.line--;
      cursorPosition.column = previousLine.length;
    }
  }

  /**
   * Handle arrow key navigation
   */
  private handleArrowKey(direction: string): void {
    if (!this.currentSession) return;

    const { cursorPosition, content } = this.currentSession;

    switch (direction) {
      case 'up':
        if (cursorPosition.line > 0) {
          cursorPosition.line--;
          const newLineLength = content[cursorPosition.line]?.length || 0;
          cursorPosition.column = Math.min(cursorPosition.column, newLineLength);
        }
        break;
      case 'down':
        if (cursorPosition.line < content.length - 1) {
          cursorPosition.line++;
          const newLineLength = content[cursorPosition.line]?.length || 0;
          cursorPosition.column = Math.min(cursorPosition.column, newLineLength);
        }
        break;
      case 'left':
        if (cursorPosition.column > 0) {
          cursorPosition.column--;
        } else if (cursorPosition.line > 0) {
          cursorPosition.line--;
          cursorPosition.column = content[cursorPosition.line]?.length || 0;
        }
        break;
      case 'right':
      {
        const currentLineLength = content[cursorPosition.line]?.length || 0;
        if (cursorPosition.column < currentLineLength) {
          cursorPosition.column++;
        } else if (cursorPosition.line < content.length - 1) {
          cursorPosition.line++;
          cursorPosition.column = 0;
        }
        break;
      }
    }
  }

  /**
   * Get the current content as a string
   */
  private getCurrentContent(): string {
    return this.currentSession?.content.join('\n') || '';
  }
}
