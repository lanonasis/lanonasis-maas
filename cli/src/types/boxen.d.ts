declare module 'boxen' {
    interface BoxenOptions {
        padding?: number | { top?: number; right?: number; bottom?: number; left?: number };
        margin?: number | { top?: number; right?: number; bottom?: number; left?: number };
        borderStyle?: 'single' | 'double' | 'round' | 'bold' | 'singleDouble' | 'doubleSingle' | 'classic' | { topLeft: string; topRight: string; bottomLeft: string; bottomRight: string; horizontal: string; vertical: string };
        borderColor?: string;
        backgroundColor?: string;
        textAlignment?: 'left' | 'center' | 'right';
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
