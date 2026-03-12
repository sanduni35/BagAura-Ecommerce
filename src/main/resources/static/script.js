
// Products will be fetched from backend
let products = [];

// Load products from Spring Boot API
async function loadProducts() {
    try {
        const response = await fetch("http://localhost:8080/api/products");
        if (!response.ok) throw new Error("Failed to fetch products");
        products = await response.json();
        app.renderProducts();
    } catch (error) {
        console.error("Error loading products:", error);
    }
}

// App State
const state = {
    cart: [],
    activeTab: 'home',
    showAllProducts: false
};

// Main Application Object
const app = {

    // Initialize app
    init: function() {
        loadProducts();
        this.updateCartUI();
        this.attachEventListeners();
    },

    /* ------------------------- RENDERING ------------------------- */

    renderProducts: function() {
        const grid = document.getElementById('product-grid');
        if (!grid) return;
        grid.innerHTML = '';

        const productsToShow = state.showAllProducts ? products : products.slice(0, 4);

        productsToShow.forEach((product, index) => {
            
            const uniqueId = product.id || product.productId || product._id || `fallback-id-${index}`;
            
            const card = document.createElement('div');
            card.className = 'product-card';
            card.innerHTML = `
                <div class="product-image-container">
                    <button type="button" class="wishlist-btn" onclick="event.preventDefault()">
                        <i class="fa-regular fa-heart"></i>
                    </button>
                    <img src="${product.image}" alt="${product.title}">
                </div>
                <div class="product-info">
                    <h4 class="product-title">${product.title}</h4>
                    <p class="product-color">${product.color || 'Standard'}</p>
                    <div class="product-bottom">
                        <span class="product-price">Rs. ${parseFloat(product.price || 0).toFixed(2)}</span>
                        <button type="button" class="add-to-cart-btn" onclick="app.addToCart('${uniqueId}')" aria-label="Add to cart">
                            <i class="fa-solid fa-cart-plus" style="color: white; font-size: 0.8rem;"></i>
                        </button>
                    </div>
                </div>
            `;
            grid.appendChild(card);
        });
    },

    renderCartItems: function() {
        const container = document.getElementById('cart-items-container');
        const emptyMessage = document.getElementById('empty-cart-message');
        const summary = document.getElementById('cart-summary');

        if (!container) return;
        container.innerHTML = ''; // clear all existing items

        if (state.cart.length === 0) {
            if (emptyMessage) emptyMessage.style.display = 'flex';
            if (summary) summary.style.display = 'none';
            return;
        }

        if (emptyMessage) emptyMessage.style.display = 'none';
        if (summary) summary.style.display = 'block';

        state.cart.forEach(item => {
           
            const product = products.find((p, index) => {
                const uniqueId = p.id || p.productId || p._id || `fallback-id-${index}`;
                return String(uniqueId) === String(item.productId);
            });
            
            if (!product) return;

            const cartEl = document.createElement('div');
            cartEl.className = 'cart-item';
            cartEl.innerHTML = `
                <img src="${product.image}" alt="${product.title}" class="cart-item-img">
                <div class="cart-item-details">
                    <div>
                        <h4 class="cart-item-title">${product.title}</h4>
                        <div class="cart-item-price">Rs. ${parseFloat(product.price || 0).toFixed(2)}</div>
                        <div class="cart-item-variant">${product.color || 'Standard'}</div>
                    </div>
                    <div class="cart-item-actions">
                        <div class="quantity-controls">
                            <!-- Passing item.productId accurately keeps specific item targeted -->
                            <button type="button" class="qty-btn" onclick="app.updateQuantity('${item.productId}', -1)">
                                <i class="fa-solid fa-minus" style="font-size: 0.7rem;"></i>
                            </button>
                            <span class="qty-value">${item.quantity}</span>
                            <button type="button" class="qty-btn" onclick="app.updateQuantity('${item.productId}', 1)">
                                <i class="fa-solid fa-plus" style="font-size: 0.7rem;"></i>
                            </button>
                        </div>
                        <button type="button" class="remove-btn" onclick="app.removeFromCart('${item.productId}')">
                            <i class="fa-regular fa-trash-can"></i> REMOVE
                        </button>
                    </div>
                </div>
            `;
            container.appendChild(cartEl);
        });

        this.calculateTotals();
    },

    calculateTotals: function() {
        let subtotal = 0;
        state.cart.forEach(item => {
            const product = products.find((p, index) => {
                const uniqueId = p.id || p.productId || p._id || `fallback-id-${index}`;
                return String(uniqueId) === String(item.productId);
            });
            if (product) subtotal += (parseFloat(product.price || 0) * item.quantity);
        });

        const shipping = subtotal > 0 ? 100 : 0;
        const total = subtotal + shipping;

        const subtotalEl = document.getElementById('summary-subtotal');
        const shippingEl = document.getElementById('summary-shipping');
        const totalEl = document.getElementById('summary-total');

        if (subtotalEl) subtotalEl.textContent = `Rs. ${subtotal.toFixed(2)}`;
        if (shippingEl) shippingEl.textContent = `Rs. ${shipping.toFixed(2)}`;
        if (totalEl) totalEl.textContent = `Rs. ${total.toFixed(2)}`;
    },

    /* ------------------------- CART ------------------------- */

    addToCart: function(productId) {
        if (!productId || productId === 'undefined') {
            console.error("Attempted to add an item with an invalid ID!");
            return;
        }

        const existingItem = state.cart.find(i => String(i.productId) === String(productId));
        
        if (existingItem) {
            existingItem.quantity += 1;
        } else {
            state.cart.push({ productId: String(productId), quantity: 1 });
        }

        this.updateCartUI();
        if (state.activeTab === 'cart') this.renderCartItems();
    },

    updateQuantity: function(productId, change) {
        // Find the precise single item to change
        const itemIndex = state.cart.findIndex(i => String(i.productId) === String(productId));
        if (itemIndex === -1) return;

        state.cart[itemIndex].quantity += change;
        
        // Remove strictly this specific product if it drops to 0
        if (state.cart[itemIndex].quantity <= 0) {
            this.removeFromCart(productId);
        } else {
            this.renderCartItems();
            this.updateCartUI();
        }
    },

    removeFromCart: function(productId) {
        
        state.cart = state.cart.filter(i => String(i.productId) !== String(productId));
        this.renderCartItems();
        this.updateCartUI();
    },

    updateCartUI: function() {
        const totalItems = state.cart.reduce((sum, i) => sum + i.quantity, 0);
        const badge = document.getElementById('header-cart-badge');

        if (badge) {
            if (totalItems > 0) {
                badge.textContent = totalItems;
                badge.style.display = 'flex';
            } else {
                badge.style.display = 'none';
            }
        }
    },

    /* ------------------------- TABS ------------------------- */

    switchTab: function(tabId) {
        if (state.activeTab === tabId) return;
        state.activeTab = tabId;

        document.querySelectorAll('.view').forEach(view => {
            view.classList.remove('active-view');
            setTimeout(() => {
                if (!view.classList.contains('active-view')) view.style.display = 'none';
            }, 50);
        });

        const targetView = document.getElementById(`${tabId}-view`);
        if (targetView) {
            targetView.style.display = 'block';
            void targetView.offsetWidth; // reflow
            targetView.classList.add('active-view');
        }

        if (tabId === 'cart') this.renderCartItems();
        window.scrollTo(0, 0);
    },

    /* ------------------------- EVENT LISTENERS ------------------------- */

    attachEventListeners: function() {
        // View All Button
        const viewAllBtn = document.querySelector('.view-all');
        if (viewAllBtn) {
            viewAllBtn.addEventListener('click', e => {
                e.preventDefault();
                state.showAllProducts = !state.showAllProducts;

                viewAllBtn.textContent = state.showAllProducts ? 'View Less' : 'View All';
                this.renderProducts();

                if (!state.showAllProducts) {
                    const homeView = document.getElementById('home-view');
                    if (homeView) homeView.scrollIntoView({ behavior: 'smooth' });
                }
            });
        }
    }
};

// Initialize app on DOM ready
document.addEventListener('DOMContentLoaded', () => {
    app.init();
});
