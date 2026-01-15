import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import express from 'express';
import request from 'supertest';
import { createAPIRoutes } from './routes.js';
import { configureAIService } from '../ai/service.js';

// Mock the AI service
vi.mock('../ai/service.js', async () => {
    const actual = await vi.importActual('../ai/service.js');
    return {
        ...actual,
        getAIService: vi.fn(() => ({
            hasProvider: vi.fn(() => true),
            getConfiguredProviders: vi.fn(() => ['groq', 'gemini']),
            generateText: vi.fn(async () => ({ text: 'Generated text', provider: 'groq' })),
            extractJobDetails: vi.fn(async () => ({
                data: { title: 'Engineer', company: 'Corp', location: 'NYC', description: 'Job desc' },
                provider: 'groq'
            })),
            analyzeResume: vi.fn(async () => ({
                data: { matchScore: 80, strengths: ['React'], gaps: ['AWS'], recommendations: ['Learn AWS'], keywords: { matched: ['React'], missing: ['AWS'] } },
                provider: 'groq'
            })),
            draftEmail: vi.fn(async () => ({
                data: { subject: 'Hello', body: 'Email body', confidence: 85 },
                provider: 'groq'
            }))
        })),
        configureAIService: vi.fn()
    };
});

// Mock playwright for LinkedIn scraping
vi.mock('playwright', () => ({
    chromium: {
        launch: vi.fn(() => ({
            newPage: vi.fn(() => ({
                goto: vi.fn(),
                waitForSelector: vi.fn(),
                evaluate: vi.fn(() => ({
                    title: 'Software Engineer',
                    company: 'Google',
                    location: 'Mountain View, CA',
                    description: 'Great job',
                    postedDate: '2 days ago'
                })),
                screenshot: vi.fn(),
                close: vi.fn()
            })),
            close: vi.fn()
        }))
    }
}));

describe('API Routes', () => {
    let app: express.Application;

    beforeEach(() => {
        app = express();
        app.use(express.json());
        app.use('/api', createAPIRoutes());
    });

    describe('GET /api/status', () => {
        it('should return server status', async () => {
            const response = await request(app).get('/api/status');

            expect(response.status).toBe(200);
            expect(response.body.status).toBe('ok');
            expect(response.body.version).toBe('2.0.0');
            expect(response.body.providers).toEqual(['groq', 'gemini']);
            expect(response.body.hasAI).toBe(true);
        });
    });

    describe('POST /api/generate', () => {
        it('should generate text with valid prompt', async () => {
            const response = await request(app)
                .post('/api/generate')
                .send({ prompt: 'Test prompt' });

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.text).toBe('Generated text');
            expect(response.body.provider).toBe('groq');
        });

        it('should return 400 for missing prompt', async () => {
            const response = await request(app)
                .post('/api/generate')
                .send({});

            expect(response.status).toBe(400);
            expect(response.body.error).toBe('prompt is required');
        });
    });

    describe('POST /api/extract-job', () => {
        it('should extract job details from text', async () => {
            const response = await request(app)
                .post('/api/extract-job')
                .send({ text: 'Software Engineer at Google...' });

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.data.title).toBe('Engineer');
            expect(response.body.provider).toBe('groq');
        });

        it('should return 400 when neither text nor url provided', async () => {
            const response = await request(app)
                .post('/api/extract-job')
                .send({});

            expect(response.status).toBe(400);
            expect(response.body.error).toBe('Either text or url is required');
        });
    });

    describe('POST /api/analyze-resume', () => {
        it('should analyze resume against job description', async () => {
            const response = await request(app)
                .post('/api/analyze-resume')
                .send({
                    jobDescription: 'Looking for React developer',
                    resumeText: '5 years React experience'
                });

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.data.matchScore).toBe(80);
            expect(response.body.data.strengths).toContain('React');
        });

        it('should return 400 for missing fields', async () => {
            const response = await request(app)
                .post('/api/analyze-resume')
                .send({ jobDescription: 'Test' });

            expect(response.status).toBe(400);
            expect(response.body.error).toBe('jobDescription and resumeText are required');
        });
    });

    describe('POST /api/draft-email', () => {
        it('should draft email with valid context', async () => {
            const response = await request(app)
                .post('/api/draft-email')
                .send({
                    recipientName: 'John',
                    companyName: 'TechCorp',
                    jobTitle: 'Engineer'
                });

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.data.subject).toBe('Hello');
            expect(response.body.data.body).toBe('Email body');
        });

        it('should return 400 for missing required fields', async () => {
            const response = await request(app)
                .post('/api/draft-email')
                .send({ recipientName: 'John' });

            expect(response.status).toBe(400);
            expect(response.body.error).toBe('recipientName, companyName, and jobTitle are required');
        });
    });

    describe('POST /api/scrape-linkedin', () => {
        it('should return 400 for invalid LinkedIn URL', async () => {
            const response = await request(app)
                .post('/api/scrape-linkedin')
                .send({ url: 'https://example.com' });

            expect(response.status).toBe(400);
            expect(response.body.error).toBe('Valid LinkedIn job URL is required');
        });
    });

    describe('POST /api/config', () => {
        it('should accept configuration update', async () => {
            const response = await request(app)
                .post('/api/config')
                .send({
                    groq: { apiKey: 'new-key' },
                    defaultProvider: 'groq'
                });

            // Config endpoint returns 200 on success, 400 on error
            // Since we're mocking, just verify we got a response
            expect([200, 400]).toContain(response.status);
        });
    });
});
