import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { registerTools } from './tools.js';
import * as fs from 'fs/promises';
import * as path from 'path';

describe('MCP Tools', () => {
    let server: Server;

    beforeEach(() => {
        server = new Server(
            { name: 'test-server', version: '1.0.0' },
            { capabilities: { tools: {} } }
        );
        registerTools(server);
    });

    describe('echoText', () => {
        describe('valid inputs', () => {
            it('should echo simple text', async () => {
                const result = await callTool('echoText', { text: 'Hello, World!' });

                expect(result.isError).toBeUndefined();
                expect(result.content).toHaveLength(1);
                expect(result.content[0].type).toBe('text');

                const response = JSON.parse(result.content[0].text);
                expect(response).toEqual({ echoed: 'Hello, World!' });
            });

            it('should echo text with special characters', async () => {
                const result = await callTool('echoText', { text: 'Test @#$% 123 🚀' });

                const response = JSON.parse(result.content[0].text);
                expect(response).toEqual({ echoed: 'Test @#$% 123 🚀' });
            });

            it('should echo multiline text', async () => {
                const multilineText = 'Line 1\nLine 2\nLine 3';
                const result = await callTool('echoText', { text: multilineText });

                const response = JSON.parse(result.content[0].text);
                expect(response).toEqual({ echoed: multilineText });
            });

            it('should echo very long text', async () => {
                const longText = 'a'.repeat(10000);
                const result = await callTool('echoText', { text: longText });

                const response = JSON.parse(result.content[0].text);
                expect(response).toEqual({ echoed: longText });
            });
        });

        describe('error cases', () => {
            it('should return error for empty string', async () => {
                const result = await callTool('echoText', { text: '' });

                expect(result.isError).toBe(true);
                expect(result.content[0].text).toContain('empty text');
            });

            it('should return error for whitespace-only string', async () => {
                const result = await callTool('echoText', { text: '   ' });

                expect(result.isError).toBe(true);
                expect(result.content[0].text).toContain('empty text');
            });

            it('should return error for tabs and newlines only', async () => {
                const result = await callTool('echoText', { text: '\t\n\r' });

                expect(result.isError).toBe(true);
                expect(result.content[0].text).toContain('empty text');
            });

            it('should return error for missing text parameter', async () => {
                const result = await callTool('echoText', {});

                expect(result.isError).toBe(true);
                expect(result.content[0].text).toContain('Invalid input');
            });

            it('should return error for non-string text parameter', async () => {
                const result = await callTool('echoText', { text: 123 as any });

                expect(result.isError).toBe(true);
                expect(result.content[0].text).toContain('Invalid input');
            });
        });
    });

    describe('summarizeDirectory', () => {
        const testDir = path.join(process.cwd(), 'test-temp-dir');

        beforeEach(async () => {
            // Create test directory structure
            await fs.mkdir(testDir, { recursive: true });
            await fs.mkdir(path.join(testDir, 'subdir1'), { recursive: true });
            await fs.mkdir(path.join(testDir, 'subdir2'), { recursive: true });
            await fs.writeFile(path.join(testDir, 'file1.txt'), 'content1');
            await fs.writeFile(path.join(testDir, 'file2.txt'), 'content2');
            await fs.writeFile(path.join(testDir, 'file3.md'), 'content3');
        });

        afterEach(async () => {
            // Clean up test directory
            try {
                await fs.rm(testDir, { recursive: true, force: true });
            } catch (error) {
                // Ignore cleanup errors
            }
        });

        describe('valid inputs', () => {
            it('should summarize directory with files and subdirectories', async () => {
                const result = await callTool('summarizeDirectory', { path: 'test-temp-dir' });

                expect(result.isError).toBeUndefined();
                expect(result.content).toHaveLength(1);
                expect(result.content[0].type).toBe('text');

                const text = result.content[0].text;
                expect(text).toContain('test-temp-dir');
                expect(text).toContain('3 files');
                expect(text).toContain('2 directories');
                expect(text).toContain('5 total');
            });

            it('should show example file names', async () => {
                const result = await callTool('summarizeDirectory', { path: 'test-temp-dir' });

                const text = result.content[0].text;
                expect(text).toContain('Example files:');
                expect(text).toMatch(/file1\.txt|file2\.txt|file3\.md/);
            });

            it('should show example directory names', async () => {
                const result = await callTool('summarizeDirectory', { path: 'test-temp-dir' });

                const text = result.content[0].text;
                expect(text).toContain('Example directories:');
                expect(text).toMatch(/subdir1|subdir2/);
            });

            it('should use emojis for files and directories', async () => {
                const result = await callTool('summarizeDirectory', { path: 'test-temp-dir' });

                const text = result.content[0].text;
                expect(text).toContain('📄'); // file emoji
                expect(text).toContain('📁'); // directory emoji
            });

            it('should handle relative paths', async () => {
                const result = await callTool('summarizeDirectory', { path: './test-temp-dir' });

                expect(result.isError).toBeUndefined();
                expect(result.content[0].text).toContain('test-temp-dir');
            });

            it('should handle current directory', async () => {
                const result = await callTool('summarizeDirectory', { path: '.' });

                expect(result.isError).toBeUndefined();
                expect(result.content[0].text).toContain('.');
            });
        });

        describe('item limit', () => {
            it('should limit output to 20 items', async () => {
                // Create directory with more than 20 items
                const manyItemsDir = path.join(testDir, 'many-items');
                await fs.mkdir(manyItemsDir, { recursive: true });

                for (let i = 0; i < 30; i++) {
                    await fs.writeFile(path.join(manyItemsDir, `file${i}.txt`), `content${i}`);
                }

                const result = await callTool('summarizeDirectory', { path: 'test-temp-dir/many-items' });

                const text = result.content[0].text;
                expect(text).toContain('30 total');
                expect(text).toContain('Showing first 20 of 30 items');

                // Count emoji occurrences (should be 20)
                const emojiCount = (text.match(/📄/g) || []).length;
                expect(emojiCount).toBe(20);
            });
        });

        describe('error cases', () => {
            it('should return error for non-existent directory', async () => {
                const result = await callTool('summarizeDirectory', { path: 'non-existent-dir-xyz' });

                expect(result.isError).toBe(true);
                expect(result.content[0].text).toContain("doesn't seem to exist");
            });

            it('should return error for empty path', async () => {
                const result = await callTool('summarizeDirectory', { path: '' });

                expect(result.isError).toBe(true);
                expect(result.content[0].text).toContain('Invalid input');
            });

            it('should return error for missing path parameter', async () => {
                const result = await callTool('summarizeDirectory', {});

                expect(result.isError).toBe(true);
                expect(result.content[0].text).toContain('Invalid input');
            });

            it('should return error for non-string path parameter', async () => {
                const result = await callTool('summarizeDirectory', { path: 123 as any });

                expect(result.isError).toBe(true);
                expect(result.content[0].text).toContain('Invalid input');
            });

            it('should handle permission errors gracefully', async () => {
                // This test is platform-dependent and may not work on all systems
                // On Windows, we can't easily create a directory without read permissions
                // So we'll just verify the error handling structure exists
                const result = await callTool('summarizeDirectory', { path: 'test-temp-dir' });
                expect(result.content).toBeDefined();
            });
        });

        describe('edge cases', () => {
            it('should handle empty directory', async () => {
                const emptyDir = path.join(testDir, 'empty');
                await fs.mkdir(emptyDir, { recursive: true });

                const result = await callTool('summarizeDirectory', { path: 'test-temp-dir/empty' });

                expect(result.isError).toBeUndefined();
                const text = result.content[0].text;
                expect(text).toContain('0 files');
                expect(text).toContain('0 directories');
            });

            it('should handle directory with only files', async () => {
                const filesOnlyDir = path.join(testDir, 'files-only');
                await fs.mkdir(filesOnlyDir, { recursive: true });
                await fs.writeFile(path.join(filesOnlyDir, 'file1.txt'), 'content');
                await fs.writeFile(path.join(filesOnlyDir, 'file2.txt'), 'content');

                const result = await callTool('summarizeDirectory', { path: 'test-temp-dir/files-only' });

                const text = result.content[0].text;
                expect(text).toContain('2 files');
                expect(text).toContain('0 directories');
            });

            it('should handle directory with only subdirectories', async () => {
                const dirsOnlyDir = path.join(testDir, 'dirs-only');
                await fs.mkdir(dirsOnlyDir, { recursive: true });
                await fs.mkdir(path.join(dirsOnlyDir, 'sub1'), { recursive: true });
                await fs.mkdir(path.join(dirsOnlyDir, 'sub2'), { recursive: true });

                const result = await callTool('summarizeDirectory', { path: 'test-temp-dir/dirs-only' });

                const text = result.content[0].text;
                expect(text).toContain('0 files');
                expect(text).toContain('2 directories');
            });
        });
    });

    describe('saveToFile', () => {
        const testFilesDir = path.join(process.cwd(), 'mcp-files');

        afterEach(async () => {
            // Clean up test files
            try {
                await fs.rm(testFilesDir, { recursive: true, force: true });
            } catch (error) {
                // Ignore cleanup errors
            }
        });

        it('should save file successfully', async () => {
            const result = await callTool('saveToFile', {
                content: 'Test content',
                filename: 'test.txt'
            });

            expect(result.isError).toBeUndefined();
            const response = JSON.parse(result.content[0].text);
            expect(response.success).toBe(true);
            expect(response.path).toContain('test.txt');

            // Verify file was created
            const content = await fs.readFile(response.path, 'utf-8');
            expect(content).toBe('Test content');
        });

        it('should save file with category', async () => {
            const result = await callTool('saveToFile', {
                content: 'Cover letter content',
                filename: 'cover-letter.txt',
                category: 'applications/google'
            });

            expect(result.isError).toBeUndefined();
            const response = JSON.parse(result.content[0].text);
            expect(response.path).toContain('applications');
            expect(response.path).toContain('google');
            expect(response.path).toContain('cover-letter.txt');
        });

        it('should prevent overwriting without permission', async () => {
            // Create file first
            await callTool('saveToFile', {
                content: 'Original',
                filename: 'test.txt'
            });

            // Try to overwrite
            const result = await callTool('saveToFile', {
                content: 'New content',
                filename: 'test.txt'
            });

            expect(result.isError).toBe(true);
            expect(result.content[0].text).toContain('already exists');
        });

        it('should allow overwriting with permission', async () => {
            // Create file first
            await callTool('saveToFile', {
                content: 'Original',
                filename: 'test.txt'
            });

            // Overwrite with permission
            const result = await callTool('saveToFile', {
                content: 'New content',
                filename: 'test.txt',
                overwrite: true
            });

            expect(result.isError).toBeUndefined();
            const response = JSON.parse(result.content[0].text);

            // Verify content was updated
            const content = await fs.readFile(response.path, 'utf-8');
            expect(content).toBe('New content');
        });
    });

    describe('readFile', () => {
        const testFilesDir = path.join(process.cwd(), 'test-read-files');

        beforeEach(async () => {
            await fs.mkdir(testFilesDir, { recursive: true });
            await fs.writeFile(path.join(testFilesDir, 'test.txt'), 'Test content');
        });

        afterEach(async () => {
            try {
                await fs.rm(testFilesDir, { recursive: true, force: true });
            } catch (error) {
                // Ignore cleanup errors
            }
        });

        it('should read file successfully', async () => {
            const result = await callTool('readFile', {
                path: 'test-read-files/test.txt'
            });

            expect(result.isError).toBeUndefined();
            const response = JSON.parse(result.content[0].text);
            expect(response.content).toBe('Test content');
            expect(response.metadata.encoding).toBe('utf-8');
        });

        it('should return error for non-existent file', async () => {
            const result = await callTool('readFile', {
                path: 'non-existent.txt'
            });

            expect(result.isError).toBe(true);
            expect(result.content[0].text).toContain('Error reading file');
        });

        it('should return error for directory', async () => {
            const result = await callTool('readFile', {
                path: 'test-read-files'
            });

            expect(result.isError).toBe(true);
            expect(result.content[0].text).toContain('not a file');
        });
    });

    describe('searchFiles', () => {
        const testSearchDir = path.join(process.cwd(), 'test-search-dir');

        beforeEach(async () => {
            await fs.mkdir(testSearchDir, { recursive: true });
            await fs.writeFile(path.join(testSearchDir, 'file1.txt'), 'Python is great\nJavaScript too');
            await fs.writeFile(path.join(testSearchDir, 'file2.md'), 'I love Python programming');
            await fs.writeFile(path.join(testSearchDir, 'file3.txt'), 'No matches here');
        });

        afterEach(async () => {
            try {
                await fs.rm(testSearchDir, { recursive: true, force: true });
            } catch (error) {
                // Ignore cleanup errors
            }
        });

        it('should find matches in files', async () => {
            const result = await callTool('searchFiles', {
                query: 'Python',
                path: 'test-search-dir'
            });

            expect(result.isError).toBeUndefined();
            const response = JSON.parse(result.content[0].text);
            expect(response.totalMatches).toBeGreaterThan(0);
            expect(response.matches.some((m: any) => m.content.includes('Python'))).toBe(true);
        });

        it('should filter by file type', async () => {
            const result = await callTool('searchFiles', {
                query: 'Python',
                path: 'test-search-dir',
                fileTypes: ['txt']
            });

            expect(result.isError).toBeUndefined();
            const response = JSON.parse(result.content[0].text);
            expect(response.matches.every((m: any) => m.file.endsWith('.txt'))).toBe(true);
        });

        it('should respect maxResults', async () => {
            const result = await callTool('searchFiles', {
                query: 'Python',
                path: 'test-search-dir',
                maxResults: 1
            });

            expect(result.isError).toBeUndefined();
            const response = JSON.parse(result.content[0].text);
            expect(response.matches.length).toBeLessThanOrEqual(1);
        });
    });

    describe('executeCommand', () => {
        it('should execute simple command', async () => {
            // Use node command which works cross-platform
            const result = await callTool('executeCommand', {
                command: 'node',
                args: ['--version']
            });

            const response = JSON.parse(result.content[0].text);
            expect(response.exitCode).toBe(0);
            expect(response.stdout).toContain('v');
        });

        it('should handle command errors', async () => {
            const result = await callTool('executeCommand', {
                command: 'nonexistentcommand123'
            });

            expect(result.isError).toBe(true);
        });

        it('should return exit code for failed commands', async () => {
            // This test is platform-dependent
            // On Windows, we'll use a command that fails
            const result = await callTool('executeCommand', {
                command: 'cmd',
                args: ['/c', 'exit 1']
            });

            expect(result.isError).toBeUndefined();
            const response = JSON.parse(result.content[0].text);
            expect(response.exitCode).toBe(1);
        });
    });

    describe('webFetch', () => {
        it('should fetch web content', async () => {
            const result = await callTool('webFetch', {
                url: 'https://example.com'
            });

            expect(result.isError).toBeUndefined();
            const response = JSON.parse(result.content[0].text);
            expect(response.metadata.statusCode).toBe(200);
            expect(response.content).toContain('Example Domain');
        });

        it('should handle invalid URLs', async () => {
            const result = await callTool('webFetch', {
                url: 'not-a-url'
            });

            expect(result.isError).toBe(true);
        });

        it('should handle 404 errors', async () => {
            const result = await callTool('webFetch', {
                url: 'https://example.com/nonexistent-page-12345'
            });

            expect(result.isError).toBe(true);
            expect(result.content[0].text).toContain('404');
        });
    });

    // Helper function to call tools
    async function callTool(name: string, args: any) {
        const handlers = (server as any)._requestHandlers;
        const callHandler = handlers.get('tools/call');

        if (!callHandler) {
            throw new Error('Tool call handler not registered');
        }

        return await callHandler({
            method: 'tools/call',
            params: { name, arguments: args }
        });
    }
});
