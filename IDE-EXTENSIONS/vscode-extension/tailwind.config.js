/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/react/**/*.{js,ts,jsx,tsx}",
    "./src/components/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // VS Code Dark Theme colors
        'vscode': {
          'bg': '#1E1E1E',
          'sidebar': '#252526',
          'border': '#2D2D2D',
          'text': '#CCCCCC',
          'text-muted': '#888888',
          'text-disabled': '#666666',
          'accent': '#007ACC',
          'accent-hover': '#005A9E',
          'accent-light': '#007ACC20',
        }
      },
      fontFamily: {
        'vscode': ['Consolas', 'Monaco', 'monospace'],
      }
    },
  },
  plugins: [],
}
