const axios = require('axios');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const API_KEY = process.env.FINANCIAL_MODELING_PREP_API_KEY;
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
const API_URL = 'https://financialmodelingprep.com/api/v3/stock/list';

async function fetchStocks() {
    try {
        const response = await axios.get(API_URL, {
            params: { apikey: API_KEY }
        });

        return response.data;
    } catch (error) {
        console.error('Error fetching stocks: ', error);
        throw error;
    }
}

async function upsertStocks(stocks) {
    const updates = await Promise.all(stocks.map(async (stock) => {
        const { data, error } = await supabase
            .from('global_stocks')
            .upsert(
               { 
                 id: stock.symbol, 
                 symbol: stock.symbol, 
                 name: stock.name, 
                 exchange: stock.exchangeShortName,
                 country: stock.country
               },
               { onConflict: 'id' } // 'id' should be your primary key
            );
        if (error) {
            console.error(`Failed to upsert stock ${stock.symbol}: `, error);
        }
        return data;
    }));
}

async function fetchAndSaveStocks(criteria) {
    try {
        const allStocks = await fetchStocks();
        const filteredStocks = allStocks.filter(stock => 
            criteria.exchanges.includes(stock.exchangeShortName) 
            && criteria.countries.includes(stock.country)
        );

        await upsertStocks(filteredStocks);
        console.log('Stocks data updated successfully!');
    } catch (error) {
        console.error('Error updating stocks data: ', error);
    }
}

const criteria = {
    exchanges: ['TSX', 'TMX', 'NEO'], // Can be updated to include more exchanges
    countries: ['CAN'] // Can be updated for other countries
};

fetchAndSaveStocks(criteria);