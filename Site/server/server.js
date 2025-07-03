import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

import citiesRouter from './services/cities/cities.router.js';
import attractionRoutes from './services/attraction/att.router.js';
import flightsRoutes from './services/flights/flights.router.js';
import hotelRoutes from "./services/hotel/hotel.router.js";
import authRouter from './services/auth/auth.router.js';  //

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());



// רישום ראוטים
app.use('/api/cities', citiesRouter);
app.use('/api/attractions', attractionRoutes);
app.use('/api/flights', flightsRoutes);
app.use("/api/hotels", hotelRoutes);
app.use('/api/auth', authRouter); 

// טיפול בשגיאות
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send('Something broke!');
});

app.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});

