# Testing Guide

This project uses [Vitest](https://vitest.dev/) for unit testing.

## Running Tests

```bash
# Run all tests once
npm test

# Run tests in watch mode (re-runs on file changes)
npm run test:watch

# Run tests with coverage report
npm run test:coverage
```

## Test Coverage

The test suite covers both MCP tools with comprehensive test cases:

### ✅ echoText Tool (9 tests)

**Valid Inputs (4 tests):**
- Simple text
- Text with special characters
- Multiline text
- Very long text (10,000 characters)

**Error Cases (5 tests):**
- Empty string
- Whitespace-only string
- Tabs and newlines only
- Missing text parameter
- Non-string text parameter

### ✅ summarizeDirectory Tool (15 tests)

**Valid Inputs (6 tests):**
- Directory with files and subdirectories
- Example file names display
- Example directory names display
- Emoji usage for files and directories
- Relative paths
- Current directory (`.`)

**Item Limit (1 test):**
- Correctly limits output to 20 items when directory has more

**Error Cases (5 tests):**
- Non-existent directory
- Empty path
- Missing path parameter
- Non-string path parameter
- Permission errors (graceful handling)

**Edge Cases (3 tests):**
- Empty directory
- Directory with only files
- Directory with only subdirectories

## Test Results

```
✓ src/tools.test.ts (24 tests)
  ✓ MCP Tools (24)
    ✓ echoText (9)
      ✓ valid inputs (4)
      ✓ error cases (5)
    ✓ summarizeDirectory (15)
      ✓ valid inputs (6)
      ✓ item limit (1)
      ✓ error cases (5)
      ✓ edge cases (3)

Test Files  1 passed (1)
Tests       24 passed (24)
```

## Test Structure

Tests are located in `src/tools.test.ts` and use the following structure:

```typescript
describe('MCP Tools', () => {
  describe('echoText', () => {
    describe('valid inputs', () => { ... });
    describe('error cases', () => { ... });
  });
  
  describe('summarizeDirectory', () => {
    describe('valid inputs', () => { ... });
    describe('item limit', () => { ... });
    describe('error cases', () => { ... });
    describe('edge cases', () => { ... });
  });
});
```

## Adding New Tests

To add new tests:

1. Open `src/tools.test.ts`
2. Add your test case in the appropriate `describe` block
3. Use the `callTool` helper function to invoke tools
4. Run `npm run test:watch` to see results immediately

Example:
```typescript
it('should handle your new case', async () => {
  const result = await callTool('echoText', { text: 'test' });
  expect(result.isError).toBeUndefined();
  // Add your assertions
});
```

## Continuous Integration

These tests can be integrated into CI/CD pipelines:

```yaml
# Example GitHub Actions workflow
- name: Run tests
  run: npm test

- name: Generate coverage
  run: npm run test:coverage
```

## Coverage Goals

Current coverage targets:
- **Statements**: 100%
- **Branches**: 100%
- **Functions**: 100%
- **Lines**: 100%

Both tools have complete test coverage for all code paths.
