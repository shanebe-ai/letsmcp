import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AIService, configureAIService, getAIService } from './service.js';

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('AIService', () => {
    beforeEach(() => {
        mockFetch.mockReset();
    });

    describe('configuration', () => {
        it('should create service with no providers when no keys provided', () => {
            const service = new AIService({});
            expect(service.hasProvider()).toBe(false);
            expect(service.getConfiguredProviders()).toEqual([]);
        });

        it('should create service with groq provider when key provided', () => {
            const service = new AIService({
                groq: { apiKey: 'test-groq-key' }
            });
            expect(service.hasProvider()).toBe(true);
            expect(service.getConfiguredProviders()).toContain('groq');
        });

        it('should create service with multiple providers', () => {
            const service = new AIService({
                groq: { apiKey: 'test-groq-key' },
                claude: { apiKey: 'test-claude-key' },
                gemini: { apiKey: 'test-gemini-key' }
            });
            expect(service.getConfiguredProviders()).toHaveLength(3);
            expect(service.getConfiguredProviders()).toContain('groq');
            expect(service.getConfiguredProviders()).toContain('claude');
            expect(service.getConfiguredProviders()).toContain('gemini');
        });

        it('should update config at runtime', () => {
            const service = new AIService({});
            expect(service.hasProvider()).toBe(false);

            service.updateConfig({ groq: { apiKey: 'new-key' } });
            expect(service.hasProvider()).toBe(true);
            expect(service.getConfiguredProviders()).toContain('groq');
        });

        it('should return specific provider when requested', () => {
            const service = new AIService({
                groq: { apiKey: 'test-groq-key' },
                claude: { apiKey: 'test-claude-key' }
            });

            const groqProvider = service.getProvider('groq');
            expect(groqProvider?.name).toBe('groq');

            const claudeProvider = service.getProvider('claude');
            expect(claudeProvider?.name).toBe('claude');
        });
    });

    describe('generateText', () => {
        it('should generate text using groq provider', async () => {
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({
                    choices: [{ message: { content: 'Generated text from Groq' } }]
                })
            });

            const service = new AIService({
                groq: { apiKey: 'test-key' },
                defaultProvider: 'groq'
            });

            const result = await service.generateText('Test prompt');
            expect(result.text).toBe('Generated text from Groq');
            expect(result.provider).toBe('groq');
        });

        it('should fall back to next provider on failure', async () => {
            // First call fails (groq)
            mockFetch.mockRejectedValueOnce(new Error('Groq API error'));

            // Second call succeeds (gemini)
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({
                    candidates: [{ content: { parts: [{ text: 'Generated from Gemini' }] } }]
                })
            });

            const service = new AIService({
                groq: { apiKey: 'test-groq' },
                gemini: { apiKey: 'test-gemini' },
                defaultProvider: 'groq'
            });

            const result = await service.generateText('Test prompt');
            expect(result.text).toBe('Generated from Gemini');
            expect(result.provider).toBe('gemini');
        });

        it('should throw error when all providers fail', async () => {
            mockFetch.mockRejectedValue(new Error('API error'));

            const service = new AIService({
                groq: { apiKey: 'test-key' }
            });

            await expect(service.generateText('Test')).rejects.toThrow('All providers failed');
        });
    });

    describe('extractJobDetails', () => {
        it('should extract job details from text', async () => {
            const mockJobDetails = {
                title: 'Software Engineer',
                company: 'TechCorp',
                location: 'San Francisco, CA',
                description: 'Build amazing software'
            };

            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({
                    choices: [{ message: { content: JSON.stringify(mockJobDetails) } }]
                })
            });

            const service = new AIService({
                groq: { apiKey: 'test-key' }
            });

            const result = await service.extractJobDetails('Job posting text here');
            expect(result.data.title).toBe('Software Engineer');
            expect(result.data.company).toBe('TechCorp');
            expect(result.provider).toBe('groq');
        });

        it('should handle JSON wrapped in markdown', async () => {
            const mockJobDetails = {
                title: 'Engineer',
                company: 'Corp',
                location: 'NYC',
                description: 'Work'
            };

            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({
                    choices: [{ message: { content: '```json\n' + JSON.stringify(mockJobDetails) + '\n```' } }]
                })
            });

            const service = new AIService({
                groq: { apiKey: 'test-key' }
            });

            const result = await service.extractJobDetails('Job text');
            expect(result.data.title).toBe('Engineer');
        });
    });

    describe('analyzeResume', () => {
        it('should analyze resume against job description', async () => {
            const mockAnalysis = {
                matchScore: 75,
                strengths: ['React experience', 'TypeScript'],
                gaps: ['No AWS experience'],
                recommendations: ['Add cloud experience'],
                keywords: {
                    matched: ['React', 'TypeScript'],
                    missing: ['AWS']
                }
            };

            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({
                    choices: [{ message: { content: JSON.stringify(mockAnalysis) } }]
                })
            });

            const service = new AIService({
                groq: { apiKey: 'test-key' }
            });

            const result = await service.analyzeResume('Job description', 'Resume text');
            expect(result.data.matchScore).toBe(75);
            expect(result.data.strengths).toContain('React experience');
            expect(result.provider).toBe('groq');
        });
    });

    describe('draftEmail', () => {
        it('should draft outreach email', async () => {
            const mockEmail = {
                subject: 'Connecting about opportunities',
                body: 'Hi John, I am reaching out...',
                confidence: 85
            };

            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({
                    choices: [{ message: { content: JSON.stringify(mockEmail) } }]
                })
            });

            const service = new AIService({
                groq: { apiKey: 'test-key' }
            });

            const result = await service.draftEmail({
                recipientName: 'John',
                recipientRole: 'Manager',
                companyName: 'TechCorp',
                jobTitle: 'Engineer',
                tone: 'Professional',
                intent: 'Connect'
            });

            expect(result.data.subject).toBe('Connecting about opportunities');
            expect(result.data.body).toContain('John');
            expect(result.provider).toBe('groq');
        });
    });

    describe('singleton functions', () => {
        it('should configure and retrieve singleton instance', () => {
            const service = configureAIService({
                groq: { apiKey: 'singleton-test-key' }
            });

            const retrieved = getAIService();
            expect(retrieved).toBe(service);
            expect(retrieved.getConfiguredProviders()).toContain('groq');
        });
    });
});
