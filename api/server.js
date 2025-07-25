const express = require('express');
const axios = require('axios');
const cors = require('cors');
const path = require('path');

const app = express();
// The port variable is no longer needed for Vercel, but we can keep it for local testing
const port = 3000; 

// Temporarily hardcoding keys for debugging Vercel deployment
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
// This tells Express where to find your static files like index.html, dashboard.js, etc.
// Vercel handles this automatically, but it's good practice for local testing.
app.use(express.static(__dirname)); 
app.use('/images', express.static(path.join(__dirname, 'images')));

// Shopify API Proxy
app.get('/api/shopify/orders', async (req, res) => {
    const { startDate, endDate, store = 'kayesami' } = req.query;
    const config = API_CONFIG[store];
    if (!config) {
        return res.status(400).json({ error: 'Invalid store specified' });
    }
    const startDateTime = `${startDate}T00:00:00Z`;
    const endDateTime = `${endDate}T23:59:59Z`;
    const url = `https://${config.shopify.storeDomain}/admin/api/${config.shopify.apiVersion}/orders.json?created_at_min=${startDateTime}&created_at_max=${endDateTime}&status=any`;

    // V --- ADD THIS DIAGNOSTIC BLOCK --- V
    console.log("--- SHOPIFY API REQUEST ---");
    console.log("Store:", store);
    console.log("Store Domain:", config.shopify.storeDomain);
    // Safely log the token to see if it's loaded.
    console.log("Access Token Loaded:", config.shopify.accessToken ? `Yes, starts with ${config.shopify.accessToken.substring(0, 5)}` : "NO, TOKEN IS MISSING OR UNDEFINED");
    console.log("Request URL:", url);
    // ^ --- END OF DIAGNOSTIC BLOCK --- ^
    try {
        const response = await axios.get(url, {
            headers: {
                'X-Shopify-Access-Token': config.shopify.accessToken,
                'Content-Type': 'application/json'
            }
        });
        res.json(response.data);
    } catch (error) {
        console.error('Shopify API Error:', error.response?.data || error.message);
        res.status(500).json({ error: 'Failed to fetch Shopify data', details: error.response?.data || error.message });
    }
});

// Meta API Proxy
app.get('/api/meta/insights', async (req, res) => {
    const { startDate, endDate, store = 'kayesami' } = req.query;
    const config = API_CONFIG[store];
    if (!config) {
        return res.status(400).json({ error: 'Invalid store specified' });
    }
    const url = `https://graph.facebook.com/${config.meta.apiVersion}/${config.meta.accountId}/insights?access_token=${config.meta.accessToken}&fields=spend&time_range[since]=${startDate}&time_range[until]=${endDate}&time_increment=1`;

    try {
        const response = await axios.get(url);
        res.json(response.data);
    } catch (error) {
        console.error('Meta API Error:', error.response?.data || error.message);
        res.status(500).json({ error: 'Failed to fetch Meta data', details: error.response?.data || error.message });
    }
});

// **FINAL FIX:** This makes your Express app compatible with Vercel's serverless environment.
module.exports = app;
