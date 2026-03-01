import cluster from 'node:cluster';
import express, { Request, Response, NextFunction } from 'express';
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import { pinoHttp } from "pino-http";
import crypto from "crypto";
import { LRUCache } from "lru-cache";
import { z } from 'zod';
import swaggerUi from 'swagger-ui-express';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

// Load Swagger JSON
const swaggerDocument = JSON.parse(
    readFileSync(join(process.cwd(), 'src', 'swagger.json'), 'utf8')
);

const app = express();
const PORT = process.env.PORT || 8080;

// Validation Schemas
const weatherParamsSchema = z.object({
    zip: z.string().regex(/^\d{5}$/, "Invalid format. Zip code must be exactly 5 digits.")
});

// Ensures the  scale must be Celsius or Fahrenheit. If empty, assume Fahrenheit."
const weatherQuerySchema = z.object({
    scale: z.preprocess(
        (val) => (val === "" ? "Fahrenheit" : val),
        // Ensures the scale is a string and defaults to Fahrenheit if empty
        z.string().optional().default("Fahrenheit")
    ).refine(
        (val) => ["celsius", "fahrenheit"].includes((val as string).toLowerCase()),
        { message: "Invalid scale. Must be Celsius or Fahrenheit" }
    ) as z.ZodType<string>
});

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

// Only show detailed logs if we aren't running tests
if (process.env.NODE_ENV !== "test") {
    app.use(pinoHttp({
        genReqId: (req) => req.headers['x-request-id'] || crypto.randomUUID(),
        customAttributeKeys: {
            reqId: 'requestId'
        }
    }));
}

// Give every request a "tracking ID" so we can find it in the logs later
app.use((req: Request, res: Response, next: NextFunction) => {
    const requestId = (req.id as string) || (req.headers['x-request-id'] as string) || crypto.randomUUID();
    req.headers['x-request-id'] = requestId;
    res.setHeader('X-Request-ID', requestId);
    next();
});

// A small cache to store the last 100 weather searches for 10 minutes
const cache = new LRUCache<string, { temperature: number; scale: string }>({
    max: 100,
    ttl: 10 * 60 * 1000,
});

//  Checking if the server is alive
app.get('/health', (req, res) => {
    res.status(200).json({
        status: 'UP',
        uptime: process.uptime(),
        timestamp: new Date().toISOString()
    });
});

// Serve the interactive documentation at /api-docs
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));


app.get('/locations/:zip', async (req: Request, res: Response, next: NextFunction) => {
    try {
        //Check if the user sent a valid ZIP and Scale
        const paramsResult = weatherParamsSchema.safeParse(req.params);
        const queryResult = weatherQuerySchema.safeParse(req.query);

        if (!paramsResult.success) {
            return res.status(400).json({ error: paramsResult.error.issues[0]?.message || "Invalid Parameters" });
        }
        if (!queryResult.success) {
            return res.status(400).json({ error: queryResult.error.issues[0]?.message || "Invalid Query" });
        }

        const { zip: zipCode } = paramsResult.data;
        const normalizedScale = queryResult.data.scale.toLowerCase();

         //Check if we already have the answer in our cache
        const cacheKey = `${zipCode}-${normalizedScale}`;
        const cached = cache.get(cacheKey);
        if (cached) {
            res.status(200).json(cached); // Send the saved answer immediately
            return;
        }

        // Ask the Geo API where this ZIP code is located (lat/lon)
        const geoUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${zipCode}&count=1&language=en&format=json`;

        //Fetch the data and wait for the network to respond 
        const geoResponse = await fetch(geoUrl);

        //Pass the raw text response into a structured JSON onject
        const geoData = await geoResponse.json();

        // Error if the ZIP code doesn't exist
        if (!geoData.results || geoData.results.length == 0) {
            res.status(404).json({ error: "Location not found for the provided zip code." });
            return;
        }

        // Extract coordinates (Latitude and Longitude)
        const lat = geoData.results[0].latitude;
        const lon = geoData.results[0].longitude;

        // Use those coordinates to ask the Weather API for the temperature
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
        };

        // Save this answer in cache for next time
        cache.set(cacheKey, result);

        // Send the final answer back to the user
        res.status(200).json(result);


    }

    //If the network drops, return a clean error

    catch (error) {
        next(error);
    }

});

// --- Final Error Handlers ---

// If someone visits a URL that doesn't exist (like /banana)
app.use((req: Request, res: Response, next: NextFunction) => {
    const error: any = new Error('Resource Not Found');
    error.status = 404;
    next(error);
});

// This is the "Master Safety Net" that catches every error in the app
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
    // If it's a data validation error (bad ZIP code format)
    if (err instanceof z.ZodError) {
        return res.status(400).json({
            error: err.issues[0]?.message || "Validation Error",
            status: 400,
            timestamp: new Date().toISOString()
        });
    }

    const status = err.status || 500;
    const message = err.message || 'Internal Server Error';

    // Log the error so we can fix it later
    if (req.log) {
        req.log.error(err);
    } else {
        console.error("Critical Error:", err);
    }

    // Tell the user what happened in a nice way
    res.status(status).json({
        error: message,
        status,
        timestamp: new Date().toISOString()
    });
});
// Only start the server if we run this file directly
if (process.env.NODE_ENV !== 'test') {
    app.listen(PORT, () => {
        // Only print the "Server Running" message once (not 16 times!)
        if (!cluster.isWorker) {
            console.log(`TypeScript Server is successfully running on http://localhost:${PORT}`);
        }
    });
}
export default app;


