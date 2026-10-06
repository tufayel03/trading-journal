/// <reference types="vite/client" />

declare module '*.pine?raw' {
  const content: string;
  export default content;
}

declare module '*.pine' {
  const content: string;
  export default content;
}
