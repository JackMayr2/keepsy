/**
 * Metro resolves `NativePagerView.web` / `NativePagerView.native` at bundle time.
 * This re-export exists so TypeScript can resolve the module path; bundlers prefer platform files first.
 */
export { default } from './NativePagerView.native';
