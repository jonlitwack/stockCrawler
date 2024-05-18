const puppeteer = require('puppeteer');
const { createClient } = require('@supabase/supabase-js');

// Get Environment Variables
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

console.log("Supabase URL:", supabaseUrl);  // Debugging log
console.log("Supabase Key Exists:", !!supabaseKey);  // Debugging log

// Initialize Supabase client
let supabase;

try {
    if (!supabaseUrl || !supabaseKey) {
        throw new Error("Supabase URL or Key is missing");
    }
    supabase = createClient(supabaseUrl, supabaseKey);
    console.log("Supabase client initialized successfully.");
} catch (error) {
    console.error("Error initializing Supabase:", error.message);
    process.exit(1);
}

async function fetchTickersFromPage(url, searchSelector, buttonSelector, tableSelector) {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });

    try {
        // Perform search (enter '*' and click search button)
        await page.type(searchSelector, '*', { delay: 100 });
        await page.click(buttonSelector);

        // Wait for the table to load
        await page.waitForSelector(tableSelector, { timeout: 60000 });

        const tickers = await page.evaluate((tableSelector) => {
            const rows = Array.from(document.querySelectorAll(tableSelector));
            return rows.map(row => row.innerText.trim());
        }, tableSelector);

        await browser.close();
        return tickers;
    } catch (error) {
        console.error(`Error extracting tickers from ${url}: ${error.message}`);
        await browser.close();
        return [];
    }
}

async function fetchTMXTickers() {
    const exchanges = [
        { exchange: 'TSX', url: 'https://www.tsx.com/listings/listing-with-us/listed-company-directory', searchSelector: '#symbol', buttonSelector: '#submit-symbol-search', tableSelector: 'tbody tr td:first-child' },
        { exchange: 'TSXV', url: 'https://www.tsx.com/listings/listing-with-us/listed-company-directory?exchange=tsxv', searchSelector: '#symbol', buttonSelector: '#submit-symbol-search', tableSelector: 'tbody tr td:first-child' }
    ];
    const tickers = [];

    for (const { exchange, url, searchSelector, buttonSelector, tableSelector } of exchanges) {
        console.log(`Fetching tickers for exchange: ${exchange}`);

        try {
            const exchangeTickers = await fetchTickersFromPage(url, searchSelector, buttonSelector, tableSelector);
            exchangeTickers.forEach(symbol => tickers.push({ symbol, exchange }));
        } catch (error) {
            console.error(`Error fetching tickers for ${exchange}: ${error.message}`);
        }
    }

    console.log(`Total tickers collected from TMX: ${tickers.length}`);
    return tickers;
}

async function fetchNEOTickers() {
    const url = 'https://www.aequitasneo.com/en/listings';
    const searchSelector = '#symbol';
    const buttonSelector = 'button[type=submit]';
    const tableSelector = '#listing-table tbody tr td:first-child';

    console.log(`Fetching tickers for NEO`);

    try {
        const tickers = await fetchTickersFromPage(url, searchSelector, buttonSelector, tableSelector);
        return tickers.map(symbol => ({ symbol, exchange: 'NEO' }));
    } catch (error) {
        console.error(`Error fetching tickers for NEO: ${error.message}`);
        return [];
    }
}

async function fetchCSETickers() {
    const url = 'https://www.thecse.com/en/listings/listed-securities';
    const searchSelector = '#edit-title';
    const buttonSelector = '#edit-submit-listed-securities';
    const tableSelector = 'table.table tbody tr td:first-child';

    console.log(`Fetching tickers for CSE`);

    try {
        const tickers = await fetchTickersFromPage(url, searchSelector, buttonSelector, tableSelector);
        return tickers.map(symbol => ({ symbol, exchange: 'CSE' }));
    } catch (error) {
        console.error(`Error fetching tickers for CSE: ${error.message}`);
        return [];
    }
}

async function processAndSaveTickers(allTickers) {
    try {
        const existingStocksData = await supabase.from('stocks').select('symbol, id');
        const existingStocks = existingStocksData.data || [];
        const existingSymbols = existingStocks.reduce((acc, stock) => {
            acc[stock.symbol] = stock.id;
            return acc;
        }, {});

        console.log("Existing symbols in database fetched.");

        for (const stock of allTickers) {
            if (existingSymbols[stock.symbol]) {
                await supabase.from('stocks').update(stock).eq('id', existingSymbols[stock.symbol]);
                console.log(`Updated stock: ${stock.symbol}`);
            } else {
                await supabase.from('stocks').insert(stock);
                console.log(`Inserted new stock: ${stock.symbol}`);
            }
        }
    } catch (error) {
        console.error(`Error processing and saving tickers: ${error.message}`);
    }
}

(async () => {
    console.log("Starting to fetch all tickers...");

    const tmxTickers = await fetchTMXTickers();
    const neoTickers = await fetchNEOTickers();
    const cseTickers = await fetchCSETickers();

    const allTickers = [...tmxTickers, ...neoTickers, ...cseTickers];

    console.log("Updating Supabase with fetched tickers...");
    await processAndSaveTickers(allTickers);

    console.log("Completed fetching and saving all tickers.");
})();