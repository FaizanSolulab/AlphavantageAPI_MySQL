import express, { Application, Request, Response, NextFunction } from "express";
import {  getStocks, fetchStockDataForAllSymbols } from "./controllers/stocks";
import { registerUser, verifyOtp } from "./controllers/auth";
import { validateToken } from "./middleware/validateTokenHandler";
import cron from 'node-cron';
import logger from "./config/logger";

const app: Application = express();
const port: number | string = process.env.PORT || 5000;


app.use(express.json());

app.use("/api/v1/auth/register", registerUser);
app.use("/api/v1/auth", verifyOtp);
app.use("/api/v1/stocks", validateToken, getStocks);

app.listen(port, () => {
  console.log(`Server runnning on port ${port}`);
  console.log(`Listening at http://localhost:${port}`);
});


//Schedules to run every day at 9:00 am
cron.schedule('* 9 * * *', async () => {
    logger.info('Inside cron.schedule')
    try {
        logger.info('Fetching new stock data for all symbols');
        await fetchStockDataForAllSymbols();
        logger.info('Successfully fetched new stock data for all symbols')
    } catch(error){
        logger.error(`Error fetching stock data: ${error}`);
    }
});