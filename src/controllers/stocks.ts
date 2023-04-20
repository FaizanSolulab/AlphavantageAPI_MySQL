import axios from 'axios';
import logger from '../config/logger';
import dbConnection from '../config/dbConnection';

const ALPHA_VANTAGE_API = process.env.ALPHA_VANTAGE_API;

interface AlphaVantageResponse {
	'Time Series (Daily)': {
	  [key: string]: {
		'1. open': string;
		'2. high': string;
		'3. low': string;
		'4. close': string;
	  };
	};
  }

const getStocks = async (req: any, res: any) => {
    logger.info('Inside function getStocks controllers/stocks.ts /stocksInfo');
    try {
    const { symbol } = req.query;
    const  userId  = req.user.id;
    const email = req.user.email
    
    logger.info("Saving user searched symbol")
    //adding the searched symbol to the user search history
    const updateQuery = 'UPDATE users SET searchedSymbols = JSON_MERGE_PRESERVE(IFNULL(searchedSymbols, JSON_ARRAY()), JSON_ARRAY(?)) WHERE email = ?'
    await dbConnection.promise().query(updateQuery,[symbol, email]);
      
        const [stockRow]:any =  await dbConnection.promise().query('SELECT * FROM stocks WHERE symbol = ?', [symbol]);
        const existingStock = stockRow[0];
        
        //checks for the stock in database
        if(existingStock){
            logger.info(`Data for ${symbol} found in database`);
            logger.info(`Fetching data for ${symbol} for user ${userId}`);
            
            const [userRow]:any = await dbConnection.promise().query('SELECT * FROM users WHERE id = ?', [userId])
            
            const user = userRow[0];
            
            if(!user){
              logger.error('user not found with this symbol')
            }
            
            return res.status(200).json(existingStock.stockData);
        }       
  
        logger.info(`Fetching data for ${symbol} from Alpha Vantage`);

        //getting data from alphavantage api
        const stock = await fetchStockData(symbol);
        
        if(!stock){
          logger.error(`Invalid symbol: ${symbol}`)
          res.status(400).json({error: `Invalid symbol: ${symbol}`})
        }
      
        //saving the stock data in database
        const [creatingStockRow]:any = await dbConnection.promise().query("INSERT INTO stocks SET ?",
        {symbol:symbol, stockData:[JSON.stringify(stock)]});
      
    logger.info("Stocks fetched from Alpha Vantage and Stored in DB")
      return res.status(200).json(stock);
    } 
    catch (error) {
      logger.error(`Error in getStocks: ${error}`);
      res.status(500).json({ error: 'Error fetching stock data' });
    }
  };
  
  //-------------------Last Six Months---------------------
  const fetchStockData = async (symbol: any) => {
    logger.info('Inside AlphaVantage function to fetchStockData')
    const response = await axios.get<AlphaVantageResponse>(
      `https://www.alphavantage.co/query?function=TIME_SERIES_DAILY_ADJUSTED&symbol=${symbol}&apikey=${ALPHA_VANTAGE_API}`
    );
    // const today = new Date();
  // const lastSixMonths = new Date(today.getTime() - 180 * 24 * 60 * 60 * 1000); 
  //There are 180 days in six months
  //24 hours in one day
  //60 minutes in one hour
  //60 seconds in one minute
  //1000 miliseconds in one second
  //Therefore subtracting this from the current date and time gives us the historical data

  //To be used to fetch data for last seven days
  //const lastSevenDays = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
  
    const stockData = response.data['Time Series (Daily)'];  
    logger.info(`Fetched data for ${symbol}`);
    return stockData;
  };
  
//Function to be used in node-cron
const fetchStockDataForAllSymbols = async () => {
  logger.info('Inside fetchStockDataForAllSymbols')
  try{
    const [usersRow]:any = await dbConnection.promise().query('SELECT * users');
    const users = usersRow[0];
    for(const user of users){
      const searchedSymbols = user.searchedSymbols;
      for(const symbol of searchedSymbols){
        const stocks = await fetchStockData(symbol);
  
        if(!stocks){
          logger.error('No symbols in db or failed to fetch data')
        }


        const [updatedStocks] = await dbConnection.promise().query('UPDATE stocks SET data = ? RETURNING *', [JSON.stringify(stocks)]);
          
        };
        
      }
    
  } catch(error){
    logger.error(`Error in fetchStockDataForAllSymbols: ${error}`);
  }
};

export{ getStocks, fetchStockDataForAllSymbols };


  //-------------------Last six months ( do not work )--------------------
  // const fetchStockData = async (symbol: string) => {
  //   const response = await axios.get<AlphaVantageResponse>(
  //     `https://www.alphavantage.co/query?function=TIME_SERIES_INTRADAY_EXTENDED&symbol=${symbol}&interval=60min&slice=year1month6&apikey=${ALPHA_VANTAGE_API}`
  //   );
  
  //   const stockData = response.data['TIME_SERIES_INTRADAY'];
  
  //   const stocks: StockDocument[] = stockData.map((stock: any) => {
  //     const stockDataObject: any = {
  //       symbol: symbol,
  //       timestamp: new Date(stock.time),
  //       open: Number(stock.open),
  //       high: Number(stock.high),
  //       low: Number(stock.low),
  //       close: Number(stock.close),
  //     };
  
  //     return stockDataObject;
  //   });
  
  //   logger.info(`Fetched data for ${symbol}`);
  
  //   return stocks;
  // };


    // const stocks: StockDocument[] = [];
    // for(const timeStamp in stockData){
    // const timestamp = new Date(timeStamp);
    // if(timestamp >= lastSixMonths){
    //     const data = stockData[timeStamp];
    //     const stockDataObject:any = {
    //         symbol:symbol,
    //         timestamp: timestamp,
    //         open: Number(data['1. open']),
    //         high: Number(data['2. high']),
    //         low: Number(data['3. low']),
    //         close: Number(data['4. close']),
    //     };
        
    //     stocks.push(stockDataObject);
    // }

// }   