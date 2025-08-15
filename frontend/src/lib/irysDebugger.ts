// Simple debug stub with flexible parameters
export const irysDebugger = {
  info: (msg: string, data?: any, extra?: any) => console.log(`[Irys] ${msg}`, data),
  warn: (msg: string, data?: any, extra?: any) => console.warn(`[Irys] ${msg}`, data),
  error: (msg: string, data?: any, extra?: any) => console.error(`[Irys] ${msg}`, data),
  debug: (msg: string, data?: any, extra?: any) => console.debug(`[Irys] ${msg}`, data),
  startTimer: (label: string) => () => 0, // Returns 0 duration
};