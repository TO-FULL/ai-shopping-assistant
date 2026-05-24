/**
 * AI Shopping Assistant - API Service
 * Simulates e-commerce platform API calls with intelligent filtering
 */

class APIService {
    constructor() {
        this.products = MOCK_PRODUCTS;
        this.platformNames = PLATFORM_NAMES;
    }

    async search(criteria) {
        // Simulate API delay
        await this.delay(800 + Math.random() * 700);

        let results = [...this.products];

        // Only category is truly core; everything else is soft-filtered to guarantee ≥10 results
        results = this.filterByCategory(results, criteria);

        let relaxedFilters = [];
        results = this.applySoftFilter(results, criteria, 'price', relaxedFilters);
        results = this.applySoftFilter(results, criteria, 'color', relaxedFilters);
        results = this.applySoftFilter(results, criteria, 'platform', relaxedFilters);
        results = this.applySoftFilter(results, criteria, 'style', relaxedFilters);
        results = this.applySoftFilter(results, criteria, 'season', relaxedFilters);
        results = this.applySoftFilter(results, criteria, 'material', relaxedFilters);

        // Keywords only affect relevance score, never used for hard filtering

        // Calculate relevance score for each product
        results = results.map(product => ({
            ...product,
            relevanceScore: this.calculateRelevance(product, criteria),
            platformName: this.platformNames[product.platform] || product.platform,
            link: generatePlatformLink(product),
            _relaxedFilters: relaxedFilters
        }));

        // Sort by relevance
        results.sort((a, b) => b.relevanceScore - a.relevanceScore);

        return {
            success: true,
            total: results.length,
            criteria: criteria,
            products: results,
            relaxedFilters: relaxedFilters
        };
    }

    applySoftFilter(products, criteria, field, relaxedFilters) {
        const minCount = 10;
        if (products.length < minCount) {
            return products; // already too few, don't filter further
        }

        let filtered;
        switch (field) {
            case 'price':
                filtered = this.filterByPrice(products, criteria);
                break;
            case 'color':
                filtered = this.filterByColor(products, criteria);
                break;
            case 'platform':
                filtered = this.filterByPlatform(products, criteria);
                break;
            case 'style':
                filtered = this.filterByStyle(products, criteria);
                break;
            case 'season':
                filtered = this.filterBySeason(products, criteria);
                break;
            case 'material':
                filtered = this.filterByMaterial(products, criteria);
                break;
            default:
                filtered = products;
        }

        if (filtered.length < minCount) {
            relaxedFilters.push(field);
            return products; // keep original, filter was too restrictive
        }
        return filtered;
    }

    filterByCategory(products, criteria) {
        if (!criteria.category) return products;
        return products.filter(p => p.category === criteria.category);
    }

    filterByPrice(products, criteria) {
        if (criteria.priceMin === null && criteria.priceMax === null) return products;

        return products.filter(p => {
            if (criteria.priceMin !== null && p.price < criteria.priceMin) return false;
            if (criteria.priceMax !== null && p.price > criteria.priceMax) return false;
            return true;
        });
    }

    filterByColor(products, criteria) {
        if (!criteria.color) return products;
        return products.filter(p => {
            if (!p.color) return true; // Products without color info pass through
            return p.color === criteria.color || p.color === '多色';
        });
    }

    filterByStyle(products, criteria) {
        if (!criteria.style || criteria.style.length === 0) return products;
        return products.filter(p => {
            if (!p.style) return true;
            return criteria.style.some(s => p.style === s || p.tags.includes(s));
        });
    }

    filterBySeason(products, criteria) {
        if (!criteria.season) return products;
        return products.filter(p => {
            if (!p.season) return true;
            return p.season === criteria.season || p.season === '四季';
        });
    }

    filterByMaterial(products, criteria) {
        if (!criteria.material) return products;
        return products.filter(p => {
            if (!p.material) return true;
            return p.material.includes(criteria.material);
        });
    }

    filterByPlatform(products, criteria) {
        if (!criteria.platform) return products;
        return products.filter(p => this.platformNames[p.platform] === criteria.platform);
    }

    filterByKeywords(products, criteria) {
        if (!criteria.keywords || criteria.keywords.length === 0) return products;

        const filtered = products.filter(p => {
            const searchText = `${p.title} ${p.tags.join(' ')} ${p.reason}`.toLowerCase();
            return criteria.keywords.some(kw => searchText.includes(kw.toLowerCase()));
        });

        // Fallback: if keyword filtering yields nothing, return original products
        return filtered.length > 0 ? filtered : products;
    }

    calculateRelevance(product, criteria) {
        let score = 0;

        // Category match (highest weight)
        if (criteria.category && product.category === criteria.category) {
            score += 30;
        }

        // Color match
        if (criteria.color && product.color === criteria.color) {
            score += 20;
        } else if (criteria.color && product.color === '多色') {
            score += 10;
        }

        // Style match
        if (criteria.style && product.style) {
            if (criteria.style.includes(product.style)) {
                score += 15;
            }
        }

        // Season match
        if (criteria.season && (product.season === criteria.season || product.season === '四季')) {
            score += 10;
        }

        // Price proximity (if within range, higher score)
        if (criteria.priceMin !== null && criteria.priceMax !== null) {
            const midPrice = (criteria.priceMin + criteria.priceMax) / 2;
            const priceDiff = Math.abs(product.price - midPrice);
            const range = criteria.priceMax - criteria.priceMin;
            if (range > 0) {
                score += Math.max(0, 15 - (priceDiff / range) * 15);
            } else {
                score += 15;
            }
        }

        // Material match
        if (criteria.material && product.material && product.material.includes(criteria.material)) {
            score += 8;
        }

        // Keyword matches in title/tags
        if (criteria.keywords) {
            for (const keyword of criteria.keywords) {
                const searchText = `${product.title} ${product.tags.join(' ')}`.toLowerCase();
                if (searchText.includes(keyword.toLowerCase())) {
                    score += 5;
                }
            }
        }

        // Sales and rating bonus
        score += Math.min(product.sales / 10000, 5);
        score += (product.rating - 4) * 3;

        return score;
    }

    async getSuggestions(query) {
        await this.delay(300);

        const suggestions = [];
        const lowerQuery = query.toLowerCase();

        for (const product of this.products) {
            if (product.title.toLowerCase().includes(lowerQuery)) {
                suggestions.push(product.title);
            }
        }

        return [...new Set(suggestions)].slice(0, 5);
    }

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

const apiService = new APIService();
