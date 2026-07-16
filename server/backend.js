/**
 * AI Shopping Assistant - Backend API Server
 * Serves product data and search API
 */

const http = require('http');
// Using WHATWG URL API to avoid deprecation warnings
const path = require('path');

// Load mock data from frontend
const mockDataPath = path.join(__dirname, '..', 'js', 'mockData.js');
const { MOCK_PRODUCTS, PLATFORM_NAMES } = require(mockDataPath);

const PORT = process.env.PORT || 3001;

function sendJSON(res, statusCode, data) {
    res.writeHead(statusCode, {
        'Content-Type': 'application/json; charset=utf-8',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type'
    });
    res.end(JSON.stringify(data));
}

function parseBody(req) {
    return new Promise((resolve, reject) => {
        const chunks = [];
        req.on('data', chunk => chunks.push(chunk));
        req.on('end', () => {
            try {
                const body = Buffer.concat(chunks).toString('utf-8');
                resolve(body ? JSON.parse(body) : {});
            } catch (e) {
                reject(e);
            }
        });
    });
}

function calculateRelevance(product, criteria) {
    let score = 0;
    if (criteria.category && product.category === criteria.category) score += 30;
    if (criteria.color && product.color === criteria.color) score += 20;
    else if (criteria.color && product.color === '多色') score += 10;
    if (criteria.style && product.style) {
        if (Array.isArray(criteria.style) && criteria.style.includes(product.style)) score += 15;
        else if (criteria.style === product.style) score += 15;
    }
    if (criteria.season && (product.season === criteria.season || product.season === '四季')) score += 10;
    if (criteria.priceMin !== null && criteria.priceMax !== null) {
        const midPrice = (criteria.priceMin + criteria.priceMax) / 2;
        const priceDiff = Math.abs(product.price - midPrice);
        const range = criteria.priceMax - criteria.priceMin;
        if (range > 0) score += Math.max(0, 15 - (priceDiff / range) * 15);
        else score += 15;
    }
    if (criteria.material && product.material && product.material.includes(criteria.material)) score += 8;
    if (criteria.keywords && criteria.keywords.length > 0) {
        for (const keyword of criteria.keywords) {
            const searchText = `${product.title} ${product.tags.join(' ')}`.toLowerCase();
            if (searchText.includes(keyword.toLowerCase())) score += 5;
        }
    }
    score += Math.min(product.sales / 10000, 5);
    score += (product.rating - 4) * 3;
    return score;
}

function searchProducts(criteria) {
    let results = [...MOCK_PRODUCTS];

    if (criteria.category) {
        results = results.filter(p => p.category === criteria.category);
    }

    const softFilters = [
        { field: 'price', fn: (p) => {
            if (criteria.priceMin === null && criteria.priceMax === null) return true;
            if (criteria.priceMin !== null && p.price < criteria.priceMin) return false;
            if (criteria.priceMax !== null && p.price > criteria.priceMax) return false;
            return true;
        }},
        { field: 'color', fn: (p) => {
            if (!criteria.color) return true;
            if (!p.color) return true;
            return p.color === criteria.color || p.color === '多色';
        }},
        { field: 'platform', fn: (p) => {
            if (!criteria.platform) return true;
            return PLATFORM_NAMES[p.platform] === criteria.platform;
        }},
        { field: 'style', fn: (p) => {
            if (!criteria.style || criteria.style.length === 0) return true;
            if (!p.style) return true;
            const styles = Array.isArray(criteria.style) ? criteria.style : [criteria.style];
            return styles.some(s => p.style === s || p.tags.includes(s));
        }},
        { field: 'season', fn: (p) => {
            if (!criteria.season) return true;
            if (!p.season) return true;
            return p.season === criteria.season || p.season === '四季';
        }},
        { field: 'material', fn: (p) => {
            if (!criteria.material) return true;
            if (!p.material) return true;
            return p.material.includes(criteria.material);
        }}
    ];

    const relaxedFilters = [];
    const minCount = 10;

    for (const filter of softFilters) {
        if (results.length < minCount) break;
        const filtered = results.filter(filter.fn);
        if (filtered.length >= minCount) {
            results = filtered;
        } else {
            relaxedFilters.push(filter.field);
        }
    }

    results = results.map(product => ({
        ...product,
        relevanceScore: calculateRelevance(product, criteria),
        platformName: PLATFORM_NAMES[product.platform] || product.platform
    }));

    results.sort((a, b) => b.relevanceScore - a.relevanceScore);

    return { products: results, relaxedFilters };
}

function getSuggestions(query) {
    if (!query) return [];
    const lowerQuery = query.toLowerCase();
    const suggestions = [];
    for (const product of MOCK_PRODUCTS) {
        if (product.title.toLowerCase().includes(lowerQuery)) {
            suggestions.push(product.title);
        }
    }
    return [...new Set(suggestions)].slice(0, 5);
}

const server = http.createServer(async (req, res) => {
    const parsedUrl = new URL(req.url, `http://${req.headers.host || '127.0.0.1'}`);
    const pathname = parsedUrl.pathname;
    const method = req.method;

    if (method === 'OPTIONS') {
        sendJSON(res, 200, {});
        return;
    }

    if (pathname === '/api/health' && method === 'GET') {
        sendJSON(res, 200, { status: 'ok', service: 'backend', timestamp: new Date().toISOString() });
        return;
    }

    if (pathname === '/api/products' && method === 'GET') {
        sendJSON(res, 200, {
            success: true,
            total: MOCK_PRODUCTS.length,
            products: MOCK_PRODUCTS.map(p => ({
                ...p,
                platformName: PLATFORM_NAMES[p.platform] || p.platform
            }))
        });
        return;
    }

    if (pathname === '/api/search' && method === 'POST') {
        try {
            const criteria = await parseBody(req);
            const { products, relaxedFilters } = searchProducts(criteria);
            sendJSON(res, 200, {
                success: true,
                total: products.length,
                criteria,
                products,
                relaxedFilters
            });
        } catch (err) {
            sendJSON(res, 400, { success: false, error: 'Invalid request body' });
        }
        return;
    }

    if (pathname === '/api/suggestions' && method === 'GET') {
        const query = parsedUrl.searchParams.get('q') || '';
        sendJSON(res, 200, {
            success: true,
            query,
            suggestions: getSuggestions(query)
        });
        return;
    }

    sendJSON(res, 404, { success: false, error: 'Not found' });
});

server.listen(PORT, '127.0.0.1', () => {
    console.log(`Backend API ready at http://127.0.0.1:${PORT}`);
});

server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
        console.error(`Port ${PORT} is already in use`);
        process.exit(1);
    }
    console.error('Backend server error:', err);
    process.exit(1);
});
