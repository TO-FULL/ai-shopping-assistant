/**
 * AI Shopping Assistant - Main Application
 * Handles UI interactions, search flow, and result rendering
 */

class ShoppingApp {
    constructor() {
        this.currentResults = [];
        this.currentCriteria = null;
        this.currentSort = 'relevance';
        this.displayedCount = 0;
        this.pageSize = 12;

        this.initElements();
        this.bindEvents();
    }

    initElements() {
        this.userInput = document.getElementById('userInput');
        this.btnSearch = document.getElementById('btnSearch');
        this.btnClear = document.getElementById('btnClear');
        this.inputSection = document.getElementById('inputSection');
        this.loadingSection = document.getElementById('loadingSection');
        this.resultsSection = document.getElementById('resultsSection');
        this.loadingSteps = document.getElementById('loadingSteps');
        this.filterSummary = document.getElementById('filterSummary');
        this.filterTags = document.getElementById('filterTags');
        this.resultCount = document.getElementById('resultCount');
        this.productGrid = document.getElementById('productGrid');
        this.loadMoreContainer = document.getElementById('loadMoreContainer');
        this.btnLoadMore = document.getElementById('btnLoadMore');
        this.emptyState = document.getElementById('emptyState');
        this.btnRetry = document.getElementById('btnRetry');
        this.btnEdit = document.getElementById('btnEdit');
        this.modalOverlay = document.getElementById('modalOverlay');
        this.modalClose = document.getElementById('modalClose');
        this.modalBody = document.getElementById('modalBody');
        this.detailSection = document.getElementById('detailSection');
        this.detailBody = document.getElementById('detailBody');
        this.btnBack = document.getElementById('btnBack');
    }

    bindEvents() {
        this.btnSearch.addEventListener('click', () => this.handleSearch());
        this.userInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.handleSearch();
            }
        });
        this.btnClear.addEventListener('click', () => this.clearInput());
        this.btnLoadMore.addEventListener('click', () => this.loadMore());
        this.btnRetry.addEventListener('click', () => this.clearInput());
        this.btnEdit.addEventListener('click', () => this.showInputSection());
        this.modalClose.addEventListener('click', () => this.closeModal());
        this.modalOverlay.addEventListener('click', (e) => {
            if (e.target === this.modalOverlay) this.closeModal();
        });
        this.btnBack.addEventListener('click', () => this.hideOrderPage());

        // Quick tags
        document.querySelectorAll('.tag[data-query]').forEach(tag => {
            tag.addEventListener('click', () => {
                this.userInput.value = tag.dataset.query;
                this.handleSearch();
            });
        });

        // Sort buttons
        document.querySelectorAll('.sort-btn').forEach(btn => {
            btn.addEventListener('click', () => this.handleSort(btn.dataset.sort));
        });
    }

    async handleSearch() {
        const query = this.userInput.value.trim();
        if (!query) {
            this.shakeInput();
            return;
        }

        this.btnSearch.disabled = true;
        this.currentCriteria = aiParser.parse(query);

        // Show loading
        this.showLoading();
        await this.animateLoadingSteps();

        try {
            const response = await apiService.search(this.currentCriteria);
            this.currentResults = response.products;
            this.displayedCount = 0;

            // Show results
            this.hideLoading();
            this.showResultsSection();
            this.renderFilterSummary(this.currentCriteria);
            this.renderProducts(true);
        } catch (error) {
            console.error('Search failed:', error);
            this.hideLoading();
            this.showInputSection();
            alert('搜索出错，请重试');
        } finally {
            this.btnSearch.disabled = false;
        }
    }

    showLoading() {
        this.inputSection.classList.add('hidden');
        this.resultsSection.classList.add('hidden');
        this.loadingSection.classList.remove('hidden');

        // Reset steps
        this.loadingSteps.querySelectorAll('.step').forEach(step => {
            step.classList.remove('active', 'completed');
        });
    }

    hideLoading() {
        this.loadingSection.classList.add('hidden');
    }

    async animateLoadingSteps() {
        const steps = this.loadingSteps.querySelectorAll('.step');
        const delays = [0, 600, 1200, 1800];

        for (let i = 0; i < steps.length; i++) {
            await this.delay(delays[i] - (i > 0 ? delays[i - 1] : 0));
            if (i > 0) steps[i - 1].classList.remove('active');
            if (i > 0) steps[i - 1].classList.add('completed');
            steps[i].classList.add('active');
        }

        await this.delay(400);
        steps[steps.length - 1].classList.remove('active');
        steps[steps.length - 1].classList.add('completed');
        await this.delay(300);
    }

    showResultsSection() {
        this.resultsSection.classList.remove('hidden');
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    showInputSection() {
        this.resultsSection.classList.add('hidden');
        this.inputSection.classList.remove('hidden');
        this.userInput.focus();
    }

    renderFilterSummary(criteria) {
        const tags = aiParser.getConfirmationText(criteria);
        this.filterTags.innerHTML = tags.map(tag => {
            const [label, value] = tag.split('：');
            return `<span class="filter-tag"><span class="tag-label">${label}：</span>${value}</span>`;
        }).join('');
    }

    renderProducts(reset = false) {
        if (reset) {
            this.productGrid.innerHTML = '';
            this.displayedCount = 0;
        }

        if (this.currentResults.length === 0) {
            this.emptyState.classList.remove('hidden');
            this.loadMoreContainer.classList.add('hidden');
            this.resultCount.textContent = '找到 0 件商品';
            return;
        }

        this.emptyState.classList.add('hidden');
        const sorted = this.getSortedResults();
        const toShow = sorted.slice(this.displayedCount, this.displayedCount + this.pageSize);

        toShow.forEach((product, index) => {
            const card = this.createProductCard(product, index);
            this.productGrid.appendChild(card);
        });

        this.displayedCount += toShow.length;
        this.resultCount.textContent = `找到 ${sorted.length} 件商品，显示 ${this.displayedCount} 件`;

        if (this.displayedCount < sorted.length) {
            this.loadMoreContainer.classList.remove('hidden');
        } else {
            this.loadMoreContainer.classList.add('hidden');
        }
    }

    getSortedResults() {
        const results = [...this.currentResults];

        switch (this.currentSort) {
            case 'price-asc':
                results.sort((a, b) => a.price - b.price);
                break;
            case 'price-desc':
                results.sort((a, b) => b.price - a.price);
                break;
            case 'sales':
                results.sort((a, b) => b.sales - a.sales);
                break;
            case 'relevance':
            default:
                results.sort((a, b) => b.relevanceScore - a.relevanceScore);
        }

        return results;
    }

    createProductCard(product, index) {
        const card = document.createElement('div');
        card.className = 'product-card';
        card.style.animationDelay = `${index * 0.05}s`;

        const platformClass = product.platform;
        const discount = Math.round((1 - product.price / product.originalPrice) * 100);

        card.innerHTML = `
            <div class="product-image-wrapper">
                <img class="product-image" src="${product.image}" alt="${product.title}" loading="lazy">
                <span class="platform-badge ${platformClass}">${product.platformName}</span>
            </div>
            <div class="product-info">
                <h3 class="product-title">${product.title}</h3>
                <div class="product-price-row">
                    <span class="price-symbol">¥</span>
                    <span class="price-value">${product.price}</span>
                    <span class="price-original">¥${product.originalPrice}</span>
                </div>
                <div class="product-meta">
                    <span>月销 ${this.formatSales(product.sales)}</span>
                    <span>评分 ${product.rating}</span>
                    <span>省${discount}%</span>
                </div>
                <div class="product-reason">
                    <strong>推荐理由：</strong>${product.reason}
                </div>
                <div class="product-actions">
                    <a class="btn-buy" href="${product.link}" target="_blank" rel="noopener">立即购买</a>
                    <button class="btn-detail" data-id="${product.id}">详情</button>
                </div>
            </div>
        `;

        card.querySelector('.btn-detail').addEventListener('click', (e) => {
            e.stopPropagation();
            this.showProductDetail(product);
        });

        card.addEventListener('click', () => this.showProductDetail(product));

        return card;
    }

    showProductDetail(product) {
        this.modalBody.innerHTML = `
            <img class="modal-image" src="${product.image}" alt="${product.title}">
            <div class="modal-info">
                <h2 class="modal-title">${product.title}</h2>
                <div class="modal-price">
                    <span style="font-size:18px;">¥</span>${product.price}
                    <span style="font-size:14px;color:var(--text-muted);text-decoration:line-through;margin-left:8px;">¥${product.originalPrice}</span>
                </div>
                <div class="modal-meta">
                    <div class="meta-item"><strong>平台</strong>${product.platformName}</div>
                    <div class="meta-item"><strong>月销量</strong>${this.formatSales(product.sales)}</div>
                    <div class="meta-item"><strong>评分</strong>${product.rating} / 5.0</div>
                    ${product.color ? `<div class="meta-item"><strong>颜色</strong>${product.color}</div>` : ''}
                    ${product.style ? `<div class="meta-item"><strong>风格</strong>${product.style}</div>` : ''}
                    ${product.season ? `<div class="meta-item"><strong>季节</strong>${product.season}</div>` : ''}
                    ${product.material ? `<div class="meta-item"><strong>材质</strong>${product.material}</div>` : ''}
                    ${product.size ? `<div class="meta-item"><strong>尺码</strong>${Array.isArray(product.size) ? product.size.join(', ') : product.size}</div>` : ''}
                </div>
                <div class="modal-reason">
                    <h4>AI 推荐理由</h4>
                    <p>${product.reason}</p>
                </div>
                <div class="modal-actions">
                    <a class="btn-buy" href="${product.link}" target="_blank" rel="noopener">立即购买</a>
                </div>
            </div>
        `;
        this.modalOverlay.classList.remove('hidden');
        requestAnimationFrame(() => this.modalOverlay.classList.add('show'));
        document.body.style.overflow = 'hidden';
    }

    closeModal() {
        this.modalOverlay.classList.remove('show');
        setTimeout(() => {
            this.modalOverlay.classList.add('hidden');
            document.body.style.overflow = '';
        }, 300);
    }

    showDetailPage(product) {
        this.closeModal();
        this.resultsSection.classList.add('hidden');
        this.detailSection.classList.remove('hidden');
        window.scrollTo({ top: 0, behavior: 'instant' });

        const discount = Math.round((1 - product.price / product.originalPrice) * 100);
        const sizes = Array.isArray(product.size) ? product.size : (product.size ? [product.size] : []);
        const colors = product.color ? (product.color === '多色' ? ['默认'] : [product.color]) : [];

        this.detailBody.innerHTML = `
            <div class="detail-layout">
                <div class="detail-gallery">
                    <img class="detail-main-image" src="${product.image}" alt="${product.title}">
                </div>
                <div class="detail-info">
                    <span class="detail-platform ${product.platform}">${product.platformName}</span>
                    <h1 class="detail-title">${product.title}</h1>
                    <div class="detail-price-row">
                        <div class="detail-price"><span class="symbol">¥</span>${product.price}</div>
                        <div class="detail-original-price">¥${product.originalPrice}</div>
                        <span class="detail-discount">省${discount}%</span>
                    </div>
                    <div class="detail-meta-grid">
                        <div class="detail-meta-item"><strong>月销量</strong>${this.formatSales(product.sales)}</div>
                        <div class="detail-meta-item"><strong>评分</strong>${product.rating} / 5.0</div>
                        ${product.material ? `<div class="detail-meta-item"><strong>材质</strong>${product.material}</div>` : ''}
                        ${product.season ? `<div class="detail-meta-item"><strong>季节</strong>${product.season}</div>` : ''}
                    </div>
                    ${colors.length ? `
                    <div class="spec-section">
                        <div class="spec-label">颜色</div>
                        <div class="spec-options" id="colorOptions">
                            ${colors.map((c, i) => `<button class="spec-option ${i === 0 ? 'active' : ''}" data-value="${c}">${c}</button>`).join('')}
                        </div>
                    </div>
                    ` : ''}
                    ${sizes.length ? `
                    <div class="spec-section">
                        <div class="spec-label">尺码</div>
                        <div class="spec-options" id="sizeOptions">
                            ${sizes.map((s, i) => `<button class="spec-option ${i === 0 ? 'active' : ''}" data-value="${s}">${s}</button>`).join('')}
                        </div>
                    </div>
                    ` : ''}
                    <div class="quantity-section">
                        <span class="quantity-label">数量</span>
                        <div class="quantity-control">
                            <button class="quantity-btn" id="qtyDec">-</button>
                            <input class="quantity-input" id="qtyInput" value="1" readonly>
                            <button class="quantity-btn" id="qtyInc">+</button>
                        </div>
                    </div>
                    <div class="total-price-row">
                        <span class="total-price-label">合计</span>
                        <span class="total-price-value" id="totalPrice">¥${product.price}</span>
                    </div>
                </div>
            </div>
            <div class="detail-action-bar">
                <a class="btn-buy" href="${product.link}" target="_blank" rel="noopener">立即购买</a>
                <button class="btn-back-list" id="btnBackList">返回商品列表</button>
            </div>
        `;

        let quantity = 1;
        const qtyInput = this.detailBody.querySelector('#qtyInput');
        const totalPriceEl = this.detailBody.querySelector('#totalPrice');
        const updateTotal = () => {
            qtyInput.value = quantity;
            totalPriceEl.textContent = `¥${(product.price * quantity).toFixed(2)}`;
        };

        this.detailBody.querySelector('#qtyDec').addEventListener('click', () => {
            if (quantity > 1) { quantity--; updateTotal(); }
        });
        this.detailBody.querySelector('#qtyInc').addEventListener('click', () => {
            if (quantity < 99) { quantity++; updateTotal(); }
        });

        this.detailBody.querySelectorAll('.spec-options').forEach(container => {
            container.addEventListener('click', (e) => {
                if (e.target.classList.contains('spec-option')) {
                    container.querySelectorAll('.spec-option').forEach(opt => opt.classList.remove('active'));
                    e.target.classList.add('active');
                }
            });
        });

        this.detailBody.querySelector('#btnBackList').addEventListener('click', () => this.hideOrderPage());
    }

    showOrderSuccess(product, quantity, color, size) {
        const total = (product.price * quantity).toFixed(2);
        this.detailBody.innerHTML = `
            <div class="order-success">
                <div class="success-icon">
                    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                        <polyline points="20 6 9 17 4 12"/>
                    </svg>
                </div>
                <h2 class="success-title">下单成功</h2>
                <p class="success-subtitle">您的订单已提交，商家将尽快为您发货</p>
                <div class="success-info">
                    <div class="success-info-row">
                        <span class="success-info-label">商品</span>
                        <span class="success-info-value">${product.title}</span>
                    </div>
                    ${color ? `
                    <div class="success-info-row">
                        <span class="success-info-label">颜色</span>
                        <span class="success-info-value">${color}</span>
                    </div>` : ''}
                    ${size ? `
                    <div class="success-info-row">
                        <span class="success-info-label">尺码</span>
                        <span class="success-info-value">${size}</span>
                    </div>` : ''}
                    <div class="success-info-row">
                        <span class="success-info-label">数量</span>
                        <span class="success-info-value">${quantity}</span>
                    </div>
                    <div class="success-info-row">
                        <span class="success-info-label">实付金额</span>
                        <span class="success-info-value" style="color:var(--secondary);font-size:16px;">¥${total}</span>
                    </div>
                </div>
                <button class="btn-confirm" id="btnSuccessConfirm">完成</button>
            </div>
        `;
        this.detailBody.querySelector('#btnSuccessConfirm').addEventListener('click', () => this.hideOrderPage());
    }

    hideOrderPage() {
        this.detailSection.classList.add('hidden');
        this.resultsSection.classList.remove('hidden');
        window.scrollTo({ top: 0, behavior: 'instant' });
    }

    handleSort(sortType) {
        this.currentSort = sortType;
        document.querySelectorAll('.sort-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.sort === sortType);
        });
        this.renderProducts(true);
    }

    loadMore() {
        this.renderProducts(false);
    }

    clearInput() {
        this.userInput.value = '';
        this.showInputSection();
        this.userInput.focus();
    }

    shakeInput() {
        this.userInput.style.transform = 'translateX(-5px)';
        setTimeout(() => {
            this.userInput.style.transform = 'translateX(5px)';
            setTimeout(() => {
                this.userInput.style.transform = 'translateX(-5px)';
                setTimeout(() => {
                    this.userInput.style.transform = 'translateX(0)';
                }, 100);
            }, 100);
        }, 100);
    }

    formatSales(num) {
        if (num >= 10000) {
            return (num / 10000).toFixed(1) + '万';
        }
        return num.toString();
    }

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    new ShoppingApp();
});
