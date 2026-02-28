import express, { Request, Response } from 'express';
const app = express()
const PORT = process.env.PORT || 8080;
app.get('/locations/:zip', (req: Request, res: Response) => {
    const zipCode = req.params.zip;
    const scale = req.query.scale || 'Fahrenheit';
    res.status(200).json({
        temperature: 43, 
        scale: scale
    });
});
app.listen(PORT, () => {
    console.log(`TypeScript Server is successfully running on http://localhost:${PORT}`);
});


