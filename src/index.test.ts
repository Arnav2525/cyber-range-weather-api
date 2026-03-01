import request from 'supertest'; // Tool to "fake" web requests to our app
import app from './index.js'; // Our actual weather app

describe('Weather API routes', () => {

    // Test 1: Check if a normal 5-digit ZIP code works (Blacksburg, VA)
    it('should return 200 and default to Fahrenheit for a valid zip code', async () => {
        const response = await request(app).get('/locations/24060');
        expect(response.status).toBe(200); // Should be successful
        expect(response.body).toHaveProperty('temperature'); // Should have a temperature number
        expect(response.body.scale).toBe('Fahrenheit'); // Should be in Fahrenheit by default
    }, 10000);

    // Test 2: Check if we can get the temperature in Celsius
    it('should return Celsius when specifically requested', async () => {
        const response = await request(app).get('/locations/90210?scale=Celsius');
        expect(response.status).toBe(200);
        expect(response.body.scale).toBe('Celsius');
    }, 10000);

    // Test 3: Error if the ZIP code is too short (4 digits)
    it('should return 400 bad request if the zip code is not exactly 5 digits', async () => {
        const response = await request(app).get('/locations/1234');
        expect(response.status).toBe(400);
        expect(response.body.error).toBe("Invalid format. Zip code must be exactly 5 digits.");
    });

    //Test 4 : GET request with an incorrect 4 digit zip code (1234) and the Celcius scale\
    it('should return 400 bad request if the zip code is not exactly 5 digits', async () => {
        const response = await request(app).get('/locations/1234?scale=Celcius');
        expect(response.status).toBe(400);
        expect(response.body.error).toBe("Invalid format. Zip code must be exactly 5 digits.");
    });

    // Test 4: Error if the ZIP code doesn't exist (like 00000)
    it('should return 404 if the zip code does not exist in the geocoding database', async () => {
        const response = await request(app).get('/locations/00000');
        expect(response.status).toBe(404);
        expect(response.body.error).toBe("Location not found for the provided zip code.");
    });

    // Test 5: Error if the ZIP code has letters in it
    it('should return 400 if the zip code contains non-numeric characters', async () => {
        const response = await request(app).get('/locations/2a406');
        expect(response.status).toBe(400);
        expect(response.body.error).toBe("Invalid format. Zip code must be exactly 5 digits.");
    });

    // Test 6: Check if we can use mixed case (cElsius)
    it('should return 200 and format mixed-case scale inputs', async () => {
        const response = await request(app).get('/locations/24061?scale=cElsius');
        expect(response.status).toBe(200);
        expect(response.body.scale).toBe('Celsius');
    }, 10000);

    // Test 7: Error if the scale is something weird (like Kelvin)
    it('should return 400 if the scale is invalid (like Kelvin)', async () => {
        const response = await request(app).get('/locations/24060?scale=Kelvin');
        expect(response.status).toBe(400);
        expect(response.body.error).toBe("Invalid scale. Must be Celsius or Fahrenheit");
    });

    //Test 9 : GET request with an empty scale parameter 
    it('should default to Fahrenheit if the scale parameter is empty', async () => {
        const response = await request(app).get('/locations/24060?scale=');
        expect(response.status).toBe(200);
        expect(response.body.scale).toBe('Fahrenheit');
    }, 10000);

    //Test 10 : GET request with an invalid 6 digit zip code
    it('should return 400 if the zip code is longer than 5 digits', async () => {
        const response = await request(app).get('/locations/123456');
        expect(response.status).toBe(400);
        expect(response.body.error).toBe("Invalid format. Zip code must be exactly 5 digits.");
    });

    // Test 8: Check if the /health page works for monitoring
    describe('Production Readiness', () => {
        it('should return 200 OK for health check', async () => {
            const response = await request(app).get('/health');
            expect(response.status).toBe(200);
            expect(response.body.status).toBe('UP');
            expect(response.body).toHaveProperty('uptime');
        });

        // Test 12: Centralized error handling for 404
        it('should return formatted JSON error for invalid routes', async () => {
            const response = await request(app).get('/invalid-route-that-does-not-exist');
            expect(response.status).toBe(404);
            expect(response.body).toHaveProperty('error');
            expect(response.body.status).toBe(404);
        });
    });

});







