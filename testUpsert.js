const axios = require('axios');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const testStock = {
  symbol: 'TEST123',
  price: 10.5,
  changesPercentage: 1.5,
  change: 0.15,
  dayLow: 10,
  dayHigh: 11,
  yearHigh: 15,
  yearLow: 8,
  marketCap: 5000000,
  priceAvg50: 10.2,
  priceAvg200: 10.1,
  volume: 1000,
  avgVolume: 1100,
  exchange: 'TEST'
};

async function testUpsertStock() {
  const { data, error } = await supabase
    .from('global_stocks')
    .upsert(
      { 
        id: testStock.symbol,
        symbol: testStock.symbol,
        price: testStock.price,
        changes_percentage: testStock.changesPercentage,
        change: testStock.change,
        day_low: testStock.dayLow,
        day_high: testStock.dayHigh,
        year_high: testStock.yearHigh,
        year_low: testStock.yearLow,
        market_cap: testStock.marketCap,
        price_avg_50: testStock.priceAvg50,
        price_avg_200: testStock.priceAvg200,
        volume: testStock.volume,
        avg_volume: testStock.avgVolume,
        exchange: testStock.exchange
      },
      { onConflict: 'id' }
    );

  if (error) {
    console.error('Failed to upsert test stock: ', error);
  } else {
    console.log('Upsert successful for test stock:', data);
  }
}

testUpsertStock();