const axios = require('axios');
const cheerio = require('cheerio');
const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function getCanadianStocks() {
    // Dummy URL - replace with actual stock scraping URL or API endpoint
    const url = "https://example.com/canadian-stocks";
    const response = await axios.get(url);
    const $ = cheerio.load(response.data);
    const stocks = [];

    // Example logic to extract stock data - update selectors as needed
    $('table.stock-table tr').each((index, element) => {
        const columns = $(element).find('td');
        if (columns.length > 0) {
            const stock = {
                symbol: $(columns[0]).text().trim(),
                name: $(columns[1]).text().trim(),
                exchange: $(columns[2]).text().trim(),
                market_cap: $(columns[3]).text().trim()
            };
            stocks.push(stock);
        }
    });
    return stocks;
}

async function updateSupabase(stocks) {
    // Fetch current database records' symbols
    const { data: existingStocks } = await supabase.from('stocks').select('symbol, id');
    const existingSymbols = existingStocks.reduce((acc, stock) => {
        acc[stock.symbol] = stock.id;
        return acc;
    }, {});

    // Insert or update stocks
    for (let stock of stocks) {
        if (existingSymbols[stock.symbol]) {
            await supabase.from('stocks').update(stock).eq('id', existingSymbols[stock.symbol]);
        } else {
            await supabase.from('stocks').insert(stock);
        }
    }

    // Find and delete delisted stocks
    const newSymbols = new Set(stocks.map(stock => stock.symbol));
    for (let symbol in existingSymbols) {
        if (!newSymbols.has(symbol)) {
            await supabase.from('stocks').delete().eq('id', existingSymbols[symbol]);
        }
    }
}

(async () => {
    const stocks = await getCanadianStocks();
    await updateSupabase(stocks);
})();