/**
 * Automated Test Suite
 * This file contains tests to make sure the Weather API works correctly and handles errors properly.
 */
import request from 'supertest';
import app from './index.js';
describe('Weather API routes', () => {
    /**
     * Positive Scenario: Valid ZIP codes
     */
    it('should return 200 and default to Fahrenheit for a valid zip code', async () => {
        const response = await request(app).get('/locations/24060');
        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('temperature');
        expect(response.body.scale).toBe('Fahrenheit');
    }, 10000);

    it('should return Celsius when specifically requested via query parameter', async () => {
        const response = await request(app).get('/locations/90210?scale=Celsius');
        expect(response.status).toBe(200);
        expect(response.body.scale).toBe('Celsius');
    }, 10000);

    /**
     * Negative Scenario: Validation and Error Handling
     */
    it('should return 400 bad request for an invalid 4-digit zip code', async () => {
        const response = await request(app).get('/locations/1234');
        expect(response.status).toBe(400);
        expect(response.body.error).toBe("Invalid format. Zip code must be exactly 5 digits.");
    });

    it('should return 400 bad request for an invalid zip code format with scale provided', async () => {
        const response = await request(app).get('/locations/1234?scale=Celcius');
        expect(response.status).toBe(400);
        expect(response.body.error).toBe("Invalid format. Zip code must be exactly 5 digits.");
    });

    it('should return 404 for a non-existent zip code ', async () => {
        const response = await request(app).get('/locations/00000');
        expect(response.status).toBe(404);
        expect(response.body.error).toBe("Location not found for the provided zip code.");
    });

    it('should return 400 for alpha-numeric zip code strings', async () => {
        const response = await request(app).get('/locations/2a406');
        expect(response.status).toBe(400);
        expect(response.body.error).toBe("Invalid format. Zip code must be exactly 5 digits.");
    });

    /**
     * Edge Case: Scale input normalization
     */
    it('should be case-insensitive for scale input', async () => {
        const response = await request(app).get('/locations/24061?scale=cElsius');
        expect(response.status).toBe(200);
        expect(response.body.scale).toBe('Celsius');
    }, 10000);

    it('should return 400 for unsupported temperature scales', async () => {
        const response = await request(app).get('/locations/24060?scale=Kelvin');
        expect(response.status).toBe(400);
        expect(response.body.error).toBe("Invalid scale. Must be Celsius or Fahrenheit");
    });

    it('should default to Fahrenheit if the scale parameter is empty', async () => {
        const response = await request(app).get('/locations/24060?scale=');
        expect(response.status).toBe(200);
        expect(response.body.scale).toBe('Fahrenheit');
    }, 10000);

    it('should return 400 for zip codes exceeding 5 digits', async () => {
        const response = await request(app).get('/locations/123456');
        expect(response.status).toBe(400);
        expect(response.body.error).toBe("Invalid format. Zip code must be exactly 5 digits.");
    });
});

/**
 * Infrastructure and System Health
 */
describe('Production Readiness', () => {
    it('should successfully return system health status', async () => {
        const response = await request(app).get('/health');
        expect(response.status).toBe(200);
        expect(response.body.status).toBe('UP');
        expect(response.body).toHaveProperty('uptime');
    });

    it('should return a standardized 404 JSON response for undefined routes', async () => {
        const response = await request(app).get('/invalid-route-that-does-not-exist');
        expect(response.status).toBe(404);
        expect(response.body).toHaveProperty('error');
        expect(response.body.status).toBe(404);
    });
});







