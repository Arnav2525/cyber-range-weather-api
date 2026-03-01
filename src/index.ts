import cluster from 'node:cluster';
import express, { Request, Response, NextFunction } from 'express';
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import { pinoHttp } from "pino-http";
import crypto from "crypto";
import { LRUCache } from "lru-cache";

const app = express();
const PORT = process.env.PORT || 8080;

//Helmet middleware for security headers
app.use(helmet());

//Limits each IP address to 100 requests per 15-minute window 
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    message: { error: 'Too many requests, please try again later.' },
});
app.use(limiter)

// Avoid noisy request logging during automated tests.
if (process.env.NODE_ENV !== "test") {
    app.use(pinoHttp());
}


//LRU Cache to store the last 100 requests for 10 minutes
const cache = new LRUCache<string, { temperature: number; scale: string }>({
    max: 100,
    ttl: 10 * 60 * 1000, //10 minutes
})

// Health check endpoint
app.get('/health', (req, res) => {
    res.status(200).json({
        status: 'UP',
        uptime: process.uptime(),
        timestamp: new Date().toISOString()
    });
});


app.get('/locations/:zip', async (req: Request, res: Response, next: any) => {
    try {
        const zipCode = req.params.zip;
        //This regex ensures the zip code is exactly 5 digits (0-9) 
        const zipRegex = /^\d{5}$/;
        if (!zipRegex.test(String(zipCode))) {
            res.status(400).json({ error: "Invalid format. Zip code must be exactly 5 digits." });
            return;
        }
        //Validate scale input 
        const scaleInput = (req.query.scale as string) || 'Fahrenheit';
        const normalizedScale = scaleInput.toLowerCase();
        const validScales = ['celsius', 'fahrenheit']
        if (!validScales.includes(normalizedScale)) {
            return res.status(400).json({ error: "Invalid scale. Must be Celsius or Fahrenheit" });
        }
        //Check cache for existing result
        const cacheKey = `${zipCode}-${normalizedScale}`;
        const cached = cache.get(cacheKey);
        if (cached) {
            //If cache hit, return the stored result without calling any API
            res.status(200).json(cached);
            return;
        }


        //Build the GeoCoding API URL using string interpolation
        const geoUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${zipCode}&count=1&language=en&format=json`;

        //Fetch the data and wait for the network to respond 
        const geoResponse = await fetch(geoUrl);

        //Pass the raw text response into a structured JSON onject
        const geoData = await geoResponse.json();

        //Protection against user typing an invalid zip code and the API finding nothing
        if (!geoData.results || geoData.results.length == 0) {
            res.status(404).json({ error: "Location not found for the provided zip code." });
            return
        }
        //Extract the exact coordinates from the JSON array
        const lat = geoData.results[0].latitude;
        const lon = geoData.results[0].longitude;
        const apiUnit = normalizedScale === 'celsius' ? 'celsius' : 'fahrenheit';
        const finalScale = normalizedScale === 'celsius' ? 'Celsius' : 'Fahrenheit';
        const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true&temperature_unit=${apiUnit}`;
        const weatherResponse = await fetch(weatherUrl);
        const weatherData = await weatherResponse.json() as any;
        if (!weatherData || !weatherData.current_weather) {
            return res.status(502).json({ error: "Weather API returned no data" });
        }
        const result = {
            temperature: Math.round(weatherData.current_weather.temperature),
            scale: finalScale

        }
        //Store in cache for future request
        cache.set(cacheKey, result);

        //Send the final successful response back to the user
        res.status(200).json(result);


    }

    //If the network drops, return a clean error

    catch (error) {
        next(error);
    }

});

// 404 Handler for undefined routes
app.use((req: Request, res: Response, next: NextFunction) => {
    const error: any = new Error('Resource Not Found');
    error.status = 404;
    next(error);
});

// Centralized Error Handling Middleware
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
    const status = err.status || 500;
    const message = err.message || 'Internal Server Error';

    // Log the error using pino-http logger if available
    if (req.log) {
        req.log.error(err);
    } else {
        console.error("Critical Error:", err);
    }

    res.status(status).json({
        error: message,
        status,
        timestamp: new Date().toISOString()
    });
});
// Only start the server if this  file is run directly( not by Jest)
if (process.env.NODE_ENV != 'test') {
    app.listen(PORT, () => {
        if (!cluster.isWorker) {
            console.log(`TypeScript Server is successfully running on http://localhost:${PORT}`);
        }
    });
}
export default app;


