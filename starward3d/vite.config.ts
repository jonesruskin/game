// One codebase, separate builds. The target picks its platform adapter at build time (so a CrazyGames build
// carries no mobile code and vice versa) and its own output folder:  vite build --mode crazygames|web|mobile
import { defineConfig } from 'vite';
import { fileURLToPath } from 'node:url';
const TARGETS = ['crazygames', 'web', 'mobile'] as const;
const SDK: Record<string, string> = {
  crazygames: '<script src="https://sdk.crazygames.com/crazygames-sdk-v3.js"></script>',
  web: '',
  mobile: '<meta name="format-detection" content="telephone=no">',
};
export default defineConfig(({ mode }) => {
  const target = (TARGETS as readonly string[]).includes(mode) ? mode : 'web';
  return {
    base: './',
    resolve: { alias: { '@platform': fileURLToPath(new URL(`./src/platform/${target}.ts`, import.meta.url)) } },
    define: { __TARGET__: JSON.stringify(target) },
    build: { outDir: `dist/${target}`, emptyOutDir: true, target: 'es2020', chunkSizeWarningLimit: 2000, assetsInlineLimit: 0 },
    plugins: [{ name: 'starward-target', transformIndexHtml: (html: string) => html.replace('<!--SDK-->', SDK[target]) }],
    server: { port: 5173, host: true },
  };
});
