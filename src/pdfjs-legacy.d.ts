// pdfjs-dist ships no `exports` map and no .d.ts beside its legacy build, so the
// deep import resolves to JS only. Re-export the package's types for the legacy
// entry point used in src/lib/pdfReader.ts.
declare module 'pdfjs-dist/legacy/build/pdf.mjs' {
  export * from 'pdfjs-dist';
}
