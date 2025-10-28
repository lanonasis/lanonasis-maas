declare module 'boxen' {
    interface BoxenOptions {
        padding?: number | { top?: number; bottom?: number; left?: number; right?: number };
        margin?: number | { top?: number; bottom?: number; left?: number; right?: number };
        borderStyle?: string | { topLeft: string; topRight: string; bottomLeft: string; bottomRight: string; horizontal: string; vertical: string };
        borderColor?: string;
        backgroundColor?: string;
        align?: 'left' | 'center' | 'right';
        float?: 'left' | 'right' | 'center';
        dimBorder?: boolean;
        title?: string;
        titleAlignment?: 'left' | 'center' | 'right';
        width?: number;
        height?: number;
    }
    function boxen(input: string, options?: BoxenOptions): string;
    export default boxen;
}
