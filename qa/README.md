# QA Automation Tests

A Playwright + TypeScript test suite covering UI tests (SauceDemo) and API tests (ReqRes), configured strictly for Chromium to ensure fast, deterministic browser test runs.

## Setup & Execution
1. Install dependencies:
   ```bash
   npm install
   ```
2. Create a `.env` file in this directory and add your ReqRes API key:
   ```env
   REQRES_API_KEY=your_key_here
   ```
3. Run the tests:
   ```bash
   npx playwright test
   ```

All core scenarios and bonus scenarios (Logout, Remove from cart, API 404 validation) are implemented. The SauceDemo UI tests cleanly organize interactions using the Page Object Model (POM) pattern (`LoginPage`), decoupling page selectors and navigation logic from test assertions while leveraging resilient `data-test` attributes for robust element location.
