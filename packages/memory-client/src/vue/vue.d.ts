/**
 * Vue type declarations
 * 
 * This file provides type declarations for Vue to support optional Vue integration
 * Vue is listed as a peerDependency, so these declarations help TypeScript resolve Vue types
 */

declare module 'vue' {
    export function ref<T>(value: T | (() => T)): any;
    export function computed<T>(getter: () => T): any;
    export function onMounted(callback: () => void): void;
    export function onUnmounted(callback: () => void): void;
    export function watch<T>(
        source: any,
        callback: (newVal: T, oldVal: T) => void,
        options?: any
    ): void;

    export interface App<RootComponent = any> {
        use(plugin: any, ...options: any[]): this;
        provide<T>(key: any, value: T): this;
        config: any;
        _component: RootComponent;
        _context: any;
        mount(rootContainer: any): any;
        unmount(): void;
    }

    export interface InjectionKey<T> {
        readonly __brand: unique symbol;
    }

    export function createApp(rootComponent: any, rootProps?: any): App;

    export function provide<T>(key: InjectionKey<T> | string | number, value: T): void;
    export function inject<T>(key: InjectionKey<T> | string | number): T | undefined;
    export function inject<T>(key: InjectionKey<T> | string | number, defaultValue: T): T;

    export type Ref<T = any> = {
        value: T;
    };
}
