const axios = require('axios');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const API_KEY = process.env.FINANCIAL_MODELING_PREP_API_KEY;
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const endpoints = [
    `https://financialmodelingprep.com/api/v3/symbol/tsx?apikey=${API_KEY}`,
    `https://financialmodelingprep.com/api/v3/symbol/tmx?apikey=${API_KEY}`,
    `https://financialmodelingprep.com/api/v3/symbol/neo?apikey=${API_KEY}`,
    `https://financialmodelingprep.com/api/v3/symbol/tsxv?apikey=${API_KEY}`,
];

async function fetchStocksFromEndpoint(url) {
    try {
        const response = await axios.get(url);
        return response.data;
    } catch (error) {
        console.error(`Error fetching stocks from ${url}: `, error.response ? error.response.data : error.message);
        throw error;
    }
}

async function fetchAllStocks() {
    const allStocks = [];
    for (const endpoint of endpoints) {
        const stocks = await fetchStocksFromEndpoint(endpoint);
        allStocks.push(...stocks);
    }
    return allStocks;
}

async function upsertStocks(stocks) {
    const updates = await Promise.all(stocks.map(async (stock) => {
        // Log current stock data for debugging
        console.log(`Upserting stock: ${JSON.stringify(stock)}`);
        
        const { data, error } = await supabase
            .from('global_stocks')
            .upsert(
               { 
                 id: stock.symbol,
                 symbol: stock.symbol,
                 name: stock.name,
                 price: stock.price,
                 changes_percentage: stock.changesPercentage,
                 change: stock.change,
                 day_low: stock.dayLow,
                 day_high: stock.dayHigh,
                 year_high: stock.yearHigh,
                 year_low: stock.yearLow,
                 market_cap: stock.marketCap,
                 price_avg_50: stock.priceAvg50,
                 price_avg_200: stock.priceAvg200,
                 exchange: stock.exchange,
                 volume: stock.volume,
                 avg_volume: stock.avgVolume,
                 open: stock.open,
                 previous_close: stock.previousClose,
                 eps: stock.eps,
                 pe: stock.pe,
                 earnings_announcement: stock.earningsAnnouncement,
                 shares_outstanding: stock.sharesOutstanding,               },
               { onConflict: 'id' }
            );

        if (error) {
            console.error(`Failed to upsert stock ${stock.symbol}: `, error);
        } else {
            console.log(`Upsert successful for stock ${stock.symbol}: `, data);
        }
        return data;
    }));
}

async function fetchAndSaveStocks() {
    try {
        const allStocks = await fetchAllStocks();
        console.log("Total Stocks Fetched: ", allStocks.length);  // Debug log
        await upsertStocks(allStocks);
        console.log('Stocks data updated successfully!');
    } catch (error) {
        console.error('Error updating stocks data: ', error);
    }
}

fetchAndSaveStocks();