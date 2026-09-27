# React + Vite

## Practical 8: Lazy loading and code splitting

The authenticated task board includes lazy-loaded `/projects` and `/contact`
routes. Their modules are loaded only when the route is visited, and each route
shows a Suspense fallback while its chunk is downloading.

To measure the optimization:

1. Run `npm run build` in this directory and record the generated JavaScript
   files and their sizes.
2. Run `npm run dev`, open the app, and use the browser Network tab with
   JavaScript filtering enabled.
3. Load `/` and record the initial JavaScript transferred and load time.
4. Navigate to `/projects` and `/contact`; record the additional chunk request
   for each route.
5. Repeat with the Network throttling setting set to Slow 3G to observe the
   route fallback.

The build output is the source of truth for the before/after bundle comparison:
the optimized build should contain separate chunks for `Projects` and `Contact`.

This template provides a minimal setup to get React working in Vite with HMR and some Oxlint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the Oxlint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and Oxlint's TypeScript related rules in your project.
