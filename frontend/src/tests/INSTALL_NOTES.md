# Test toolchain requirements

The tests in this repo use **Vitest** (the Vite-native test runner) plus
**React Testing Library** and the **happy-dom** environment.

Install the dev-dependencies first:

```bash
pnpm add -D vitest happy-dom @testing-library/react @testing-library/jest-dom
```

Then run:

```bash
pnpm test        # or: npx vitest run
pnpm test watch  # or: npx vitest
```
