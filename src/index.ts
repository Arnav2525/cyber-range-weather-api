import express, { Request, Response } from 'express';
const app = express()
const PORT = process.env.PORT || 8080;
app.get('/locations/:zip', async (req: Request, res: Response) => {
    try {
        const zipCode = req.params.zip;
        //This regex ensures the zip code is exactly 5 digits (0-9) 
        const zipRegex = /^\d{5}$/;
        if (!zipRegex.test(String(zipCode)))
        {
            res.status(400).json({error: "Invalid format. Zip code must be exactly 5 digits."});
            return;
        }
        //Validate scale input 
        const scaleInput = (req.query.scale as string) || 'Fahrenheit';
        const normalizedScale = scaleInput.toLowerCase();
        const validScales =  ['celsius', 'fahrenheit']
        if(!validScales.includes(normalizedScale))
        {
            return res.status(400).json({ error: "Invalid scale. Must be Celsius or Fahrenheit" });
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
        const apiUnit = normalizedScale === 'celsius'  ? 'celsius' : 'fahrenheit';
        const finalScale = normalizedScale === 'celsius' ? 'Celsius' : 'Fahrenheit';
        const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true&temperature_unit=${apiUnit}`;
        const weatherResponse = await fetch(weatherUrl);
        const weatherData = await weatherResponse.json() as any;
        if(!weatherData || !weatherData.current_weather )
        {
            return res.status(502).json({ error: "Weather API returned no data" });
        }
        //Send the final successful response back to the user
        res.status(200).json({
            temperature: Math.round(weatherData.current_weather.temperature),
            scale: finalScale
        });
    }

    //If the network drops, return a clean error

    catch (error) {
        console.error("Failed to fetch weather data:", error);
        res.status(500).json({error: "Internal Server Error"});
    }

});
// Only start the server if this  file is run directly( not by Jest)
if (process.env.NODE_ENV != 'test') {
app.listen(PORT, () => {
    console.log(`TypeScript Server is successfully running on http://localhost:${PORT}`);
});
}
export default app;


