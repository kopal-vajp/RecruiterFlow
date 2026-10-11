# Frontend - Trip Splitter

A React, Redux Toolkit, and strict TypeScript application built with Vite for splitting group trip expenses without losing a single paisa. The UI uses a pure vanilla CSS approach (no external UI libraries or CSS frameworks) and is engineered for mobile responsiveness down to 360px viewport widths.

## 1. Running the App
```bash
npm install
npm run dev
```

To run the Vitest suite (testing form validation and splitting math):

```bash
npm test
```

Status: All core requirements and edge cases are fully implemented.

## 2. Three Key Architecture Decisions
- **Total Domain Isolation**: I extracted all money parsing, validation, and splitting math into plain TypeScript functions inside `src/lib/`. This keeps React components strictly focused on rendering and makes the core ₹100/3 splitting rules incredibly easy to unit test without mocking the DOM.
- **State Separation**: The global expenses and members lists live in Redux, but the Add Expense form state lives in local React useState. There is no reason to pollute the global store with incomplete draft data.
- **Runtime Type Guards for Storage**: Instead of blindly casting localStorage data via `as AppState`, the `storage.ts` logic validates the shape of the parsed JSON. If the data is missing or corrupted, it gracefully falls back to the sample data.

## 3. Improvements With More Time
With another day, I would add comprehensive E2E tests using Playwright to verify the user journey from adding an expense to seeing the updated balance. I would also replace the native `window.confirm` dialog for deletions with an accessible, custom-styled modal, and integrate a robust date library like `date-fns` for better date parsing and formatting.

## 4. AI Tool Usage
I used AI tooling to quickly scaffold the Vite React-TS boilerplate, generate the repetitive CSS styling, and transcribe the provided sample data into JSON. However, I manually engineered the Redux architecture, the strict TypeScript types, and the paise-based remainder distribution math to ensure I completely understood the underlying domain logic.
