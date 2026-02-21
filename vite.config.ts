import { defineConfig } from 'vite';
import { viteSingleFile } from 'vite-plugin-singlefile';

const INPUT = process.env.INPUT;
if (!INPUT) throw new Error('INPUT env var required');

const OUT_DIR = process.env.OUT_DIR || 'dist';

export default defineConfig({
  plugins: [viteSingleFile()],
  build: {
    rollupOptions: { input: INPUT },
    outDir: OUT_DIR,
    emptyOutDir: false,
  },
});
