import express from 'express';
import { getStocks } from '../controllers/stocks';

const router = express.Router();

router.get('/stocksInfo', getStocks);


  export  {getStocks};