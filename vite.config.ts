import { defineConfig, loadEnv, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { viteSingleFile } from 'vite-plugin-singlefile';

/** Serves the Vercel API function from the Vite dev server, so `npm run dev` runs the full stack locally. */
function localApi(): Plugin {
  return {
    name: 'local-api',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (!req.url?.startsWith('/api/')) return next();
        try {
          const mod = await server.ssrLoadModule('/server/app.ts');
          await mod.handle(req, res);
        } catch (e) {
          server.ssrFixStacktrace(e as Error);
          res.statusCode = 500;
          res.end(JSON.stringify({ error: String((e as Error).message) }));
        }
      });
    },
  };
}

// `npm run build` → static client in dist/ (API runs as a Vercel Function from api/handler.ts)
// `npm run build:single` → one self-contained HTML file in dist-single/ (offline demo, no server)
export default defineConfig(({ mode }) => {
  Object.assign(process.env, loadEnv(mode, process.cwd(), ''));
  return {
    plugins: mode === 'single' ? [react(), viteSingleFile()] : [react(), localApi()],
    base: '/',
    build: { outDir: mode === 'single' ? 'dist-single' : 'dist', chunkSizeWarningLimit: 2000 },
  };
});
