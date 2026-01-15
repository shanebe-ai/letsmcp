/**
 * HTTP API Routes for LetsMCP
 * Provides REST endpoints for external applications (like JobOS)
 */

import type { Request, Response, Router } from 'express';
import { Router as createRouter } from 'express';
import { getAIService, configureAIService } from '../ai/service.js';
import type { AIServiceConfig, EmailDraftContext } from '../ai/types.js';
import { chromium } from 'playwright';

export function createAPIRoutes(): Router {
    const router = createRouter();

    // Middleware to parse JSON
    router.use((req, res, next) => {
        if (req.headers['content-type']?.includes('application/json')) {
            next();
        } else {
            next();
        }
    });

    /**
     * GET /api/status
     * Returns API status and configured providers
     */
    router.get('/status', (_req: Request, res: Response) => {
        const service = getAIService();
        res.json({
            status: 'ok',
            version: '2.0.0',
            providers: service.getConfiguredProviders(),
            hasAI: service.hasProvider(),
        });
    });

    /**
     * POST /api/config
     * Update AI provider configuration at runtime
     */
    router.post('/config', (req: Request, res: Response) => {
        try {
            const config = req.body as AIServiceConfig;
            const service = configureAIService(config);
            res.json({
                success: true,
                providers: service.getConfiguredProviders(),
            });
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown error';
            res.status(400).json({ error: message });
        }
    });

    /**
     * POST /api/generate
     * Generate text using AI
     */
    router.post('/generate', async (req: Request, res: Response) => {
        try {
            const { prompt, provider } = req.body as { prompt: string; provider?: string };

            if (!prompt) {
                res.status(400).json({ error: 'prompt is required' });
                return;
            }

            const service = getAIService();
            if (!service.hasProvider()) {
                res.status(503).json({ error: 'No AI providers configured' });
                return;
            }

            const result = await service.generateText(prompt, provider);
            res.json({
                success: true,
                text: result.text,
                provider: result.provider,
            });
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown error';
            res.status(500).json({ error: message });
        }
    });

    /**
     * POST /api/extract-job
     * Extract job details from text or URL
     */
    router.post('/extract-job', async (req: Request, res: Response) => {
        try {
            const { text, url, provider } = req.body as { text?: string; url?: string; provider?: string };

            if (!text && !url) {
                res.status(400).json({ error: 'Either text or url is required' });
                return;
            }

            let contentToAnalyze = text || '';

            // If URL provided, try to scrape it first
            if (url) {
                if (url.includes('linkedin.com/jobs')) {
                    // Use LinkedIn scraper
                    const scraped = await scrapeLinkedInJob(url);
                    if (scraped.title) {
                        // Return scraped data directly if successful
                        res.json({
                            success: true,
                            data: {
                                title: scraped.title,
                                company: scraped.company,
                                location: scraped.location,
                                description: scraped.description,
                                source: 'LinkedIn',
                            },
                            provider: 'linkedin-scraper',
                        });
                        return;
                    }
                    // Fall back to AI extraction with scraped description
                    contentToAnalyze = scraped.description || url;
                } else {
                    // For other URLs, fetch content
                    try {
                        const response = await fetch(url);
                        contentToAnalyze = await response.text();
                    } catch {
                        contentToAnalyze = url;
                    }
                }
            }

            const service = getAIService();
            if (!service.hasProvider()) {
                res.status(503).json({ error: 'No AI providers configured' });
                return;
            }

            const result = await service.extractJobDetails(contentToAnalyze, provider);
            res.json({
                success: true,
                data: result.data,
                provider: result.provider,
            });
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown error';
            res.status(500).json({ error: message });
        }
    });

    /**
     * POST /api/scrape-linkedin
     * Scrape a LinkedIn job posting directly
     */
    router.post('/scrape-linkedin', async (req: Request, res: Response) => {
        try {
            const { url, includeDescription = true, screenshot = false } = req.body as {
                url: string;
                includeDescription?: boolean;
                screenshot?: boolean;
            };

            if (!url || !url.includes('linkedin.com/jobs')) {
                res.status(400).json({ error: 'Valid LinkedIn job URL is required' });
                return;
            }

            const result = await scrapeLinkedInJob(url, includeDescription, screenshot);
            res.json({
                success: true,
                data: result,
            });
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown error';
            res.status(500).json({ error: message });
        }
    });

    /**
     * POST /api/analyze-resume
     * Analyze resume against job description
     */
    router.post('/analyze-resume', async (req: Request, res: Response) => {
        try {
            const { jobDescription, resumeText, provider } = req.body as {
                jobDescription: string;
                resumeText: string;
                provider?: string;
            };

            if (!jobDescription || !resumeText) {
                res.status(400).json({ error: 'jobDescription and resumeText are required' });
                return;
            }

            const service = getAIService();
            if (!service.hasProvider()) {
                res.status(503).json({ error: 'No AI providers configured' });
                return;
            }

            const result = await service.analyzeResume(jobDescription, resumeText, provider);
            res.json({
                success: true,
                data: result.data,
                provider: result.provider,
            });
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown error';
            res.status(500).json({ error: message });
        }
    });

    /**
     * POST /api/draft-email
     * Draft an outreach email
     */
    router.post('/draft-email', async (req: Request, res: Response) => {
        try {
            const context = req.body as EmailDraftContext & { provider?: string };

            if (!context.recipientName || !context.companyName || !context.jobTitle) {
                res.status(400).json({ error: 'recipientName, companyName, and jobTitle are required' });
                return;
            }

            // Set defaults
            context.tone = context.tone || 'Professional';
            context.intent = context.intent || 'Connect';
            context.recipientRole = context.recipientRole || 'Team Member';

            const service = getAIService();
            if (!service.hasProvider()) {
                res.status(503).json({ error: 'No AI providers configured' });
                return;
            }

            const result = await service.draftEmail(context, context.provider);
            res.json({
                success: true,
                data: result.data,
                provider: result.provider,
            });
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown error';
            res.status(500).json({ error: message });
        }
    });

    return router;
}

/**
 * LinkedIn job scraper helper
 */
async function scrapeLinkedInJob(
    url: string,
    includeDescription: boolean = true,
    screenshot: boolean = false
): Promise<{
    title: string;
    company: string;
    location: string;
    description: string;
    postedDate: string;
    url: string;
    scrapedAt: string;
    screenshot?: string;
}> {
    let browser;
    try {
        browser = await chromium.launch({ headless: true });
        const page = await browser.newPage();

        await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
        await page.waitForSelector('.top-card-layout__title, .job-details-jobs-unified-top-card__job-title', { timeout: 10000 });

        const jobData = await page.evaluate((includeDesc) => {
            const getText = (selector: string): string => {
                // eslint-disable-next-line no-undef
                const el = document.querySelector(selector);
                return el?.textContent?.trim() || '';
            };

            return {
                title: getText('.top-card-layout__title, .job-details-jobs-unified-top-card__job-title'),
                company: getText('.top-card-layout__first-subline, .job-details-jobs-unified-top-card__company-name'),
                location: getText('.top-card-layout__second-subline, .job-details-jobs-unified-top-card__bullet'),
                description: includeDesc ? getText('.show-more-less-html__markup, .jobs-description__content') : '',
                postedDate: getText('.posted-time-ago__text, .job-details-jobs-unified-top-card__posted-date'),
            };
        }, includeDescription);

        let screenshotPath: string | undefined;
        if (screenshot) {
            const fs = await import('fs/promises');
            const path = await import('path');
            screenshotPath = path.join(process.cwd(), 'mcp-files', 'screenshots', `linkedin-job-${Date.now()}.png`);
            await fs.mkdir(path.dirname(screenshotPath), { recursive: true });
            await page.screenshot({ path: screenshotPath, fullPage: true });
        }

        await browser.close();

        return {
            ...jobData,
            url,
            scrapedAt: new Date().toISOString(),
            ...(screenshotPath && { screenshot: screenshotPath }),
        };
    } catch (error) {
        if (browser) await browser.close();
        throw error;
    }
}
