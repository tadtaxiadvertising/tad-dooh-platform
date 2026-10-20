declare module 'tailwind-merge' {
  function tailwindMerge(...classes: (string | object)[]): string;
  export default tailwindMerge;
}
