const express = require('express');
const axios = require('axios');
const cors = require('cors');
const path = require('path');

const app = express();
const port = 3000;

// API Configuration
const API_CONFIG = {
    
    kayesami: {
        shopify: {
            storeDomain: 'z01h1u-b7.myshopify.com',
            accessToken: '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',
            apiVersion: '2024-04'
        },
        meta: {
            accessToken: 'EAAbHyJIq4NsBOy9d07NEk5jxOZBWh80dhmZBXuaXlyBVtUrihLZAFgFuK7xOeH4His5ckZAvZBP9ZANlipi3CNqWHGZCk7HkYaH4194b9hYaZAslR6nkKQOOCh6hhr4DO9TqaZBhgDveiB74Fx07W5ndupRA8A2zAwScvlo0pZBZCeITD9Vn9iWDMtjnTjYwPgoOxQZCyEpVkgnxZAZBol3MWSxh7NV1rZA', // Placeholder, ensure this is valid and secure
            accountId: 'act_1965147297586827',
            apiVersion: 'v19.0'
        }
    }, 
    ostriB: {
        shopify: {
            storeDomain: 'p5askk-jg.myshopify.com',
            accessToken: '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', // Placeholder, ensure this is valid and secure
            apiVersion: '2024-04'
        },
        meta: {
            accessToken: 'EAAbHyJIq4NsBOy9d07NEk5jxOZBWh80dhmZBXuaXlyBVtUrihLZAFgFuK7xOeH4His5ckZAvZBP9ZANlipi3CNqWHGZCk7HkYaH4194b9hYaZAslR6nkKQOOCh6hhr4DO9TqaZBhgDveiB74Fx07W5ndupRA8A2zAwScvlo0pZBZCeITD9Vn9iWDMtjnTjYwPgoOxQZCyEpVkgnxZAZBol3MWSxh7NV1rZA', // Placeholder, ensure this is valid and secure
            accountId: 'act_958697719780727',
            apiVersion: 'v19.0'
        }
    }
};

app.use(cors());
app.use(express.static(__dirname));
app.use('/images', express.static(path.join(__dirname, 'images')));

// Shopify API Proxy with pagination handling
app.get('/api/shopify/orders', async (req, res) => {
    const { startDate, endDate, store = 'kayesami' } = req.query;
    const config = API_CONFIG[store];
    if (!config) {
        return res.status(400).json({ error: 'Invalid store specified' });
    }

    // Adjust dates to include full day for Shopify query
    const startDateTime = `${startDate}T00:00:00Z`;
    const endDateTime = `${endDate}T23:59:59Z`;

    let allOrders = [];
    // Shopify's max limit per page is 250. We will paginate.
    let nextUrl = `https://${config.shopify.storeDomain}/admin/api/${config.shopify.apiVersion}/orders.json?created_at_min=${startDateTime}&created_at_max=${endDateTime}&status=any&limit=250`; 

    try {
        while (nextUrl) {
            const response = await axios.get(nextUrl, {
                headers: {
                    'X-Shopify-Access-Token': config.shopify.accessToken,
                    'Content-Type': 'application/json'
                }
            });
            
            allOrders.push(...response.data.orders);

            // Check for Link header for pagination
            const linkHeader = response.headers.link;
            nextUrl = null; // Reset nextUrl for each iteration

            if (linkHeader) {
                const links = linkHeader.split(', ');
                const nextLink = links.find(link => link.includes('rel="next"'));
                if (nextLink) {
                    // Extract URL from <url>; rel="next"
                    nextUrl = nextLink.substring(nextLink.indexOf('<') + 1, nextLink.indexOf('>'));
                }
            }
        }
        res.json({ orders: allOrders }); // Return all fetched orders
    } catch (error) {
        console.error('Shopify API Error:', error.response?.data || error.message);
        res.status(500).json({ 
            error: 'Failed to fetch Shopify data', 
            details: error.response?.data?.errors || error.message 
        });
    }
});

// Meta API Proxy (now returns raw spend, conversion and tax applied on frontend)
app.get('/api/meta/insights', async (req, res) => {
    const { startDate, endDate, store = 'kayesami' } = req.query;
    const config = API_CONFIG[store];
    if (!config) {
        return res.status(400).json({ error: 'Invalid store specified' });
    }

    // Meta API's time_increment=1 ensures daily data
    const url = `https://graph.facebook.com/${config.meta.apiVersion}/${config.meta.accountId}/insights?access_token=${config.meta.accessToken}&fields=spend&time_range[since]=${startDate}&time_range[until]=${endDate}&time_increment=1`;

    try {
        const response = await axios.get(url);
        // Do NOT convert currency or apply tax here. Send raw Meta data.
        res.json(response.data);
    } catch (error) {
        console.error('Meta API Error:', error.response?.data || error.message);
        res.status(500).json({ 
            error: 'Failed to fetch Meta data', 
            details: error.response?.data?.error?.message || error.message 
        });
    }
});

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});