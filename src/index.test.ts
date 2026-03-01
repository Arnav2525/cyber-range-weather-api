import request from 'supertest';
import app from './index';
describe('Weather API routes', () => {
    //Test 1: GET request with a valid correct 5 digit zip code (Blacksburg)
    it('should return 200 and default to Fahrenheit for a valid zip code', async () => {
        const response = await request(app).get('/locations/24060');
        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('temperature');
        expect(response.body.scale).toBe('Fahrenheit');
    }, 10000);

    //Test 2 : GET request with a valid  5 digit zip code (90210) and the Celsius scale
    it('should return Celsius when specifically  requested', async () => {
        const response = await request(app).get('/locations/90210?scale=Celsius');
        expect(response.status).toBe(200);
        expect(response.body.scale).toBe('Celsius');
    }, 10000)

    //Test 3 : GET request with an incorrect 4 digit zip code (1234)
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

    //Test 5 : GET request with an non-existent 5 digit zip code 
    it('should return 404 if the zip code does not exist in the geocoding database', async () => {
        const response = await request(app).get('/locations/00000');
        expect(response.status).toBe(404);
        expect(response.body.error).toBe("Location not found for the provided zip code.");
    });

    //Test 6 : GET request with alpha-numeric characters
    it('should return 400 if the zip code contains non-numeric characters', async () => {
        const response = await request(app).get('/locations/2a406');
        expect(response.status).toBe(400);
        expect(response.body.error).toBe("Invalid format. Zip code must be exactly 5 digits.");
    });

    //Test 7 : GET request with mixed-case scale (Case Insensitivity)
    it('should return 200 and format mixed-case scale inputs', async () => {
        const response = await request(app).get('/locations/24061?scale=cElsius');
        expect(response.status).toBe(200);
        expect(response.body.scale).toBe('Celsius');
    }, 10000);

    // Test 8: GET request with an unsupported scale
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

});







