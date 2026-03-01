// Helper para buscar imagens de comandantes da Scryfall
const ScryfallHelper = {
    cache: new Map(),
    
    /**
     * Busca a imagem art_crop de uma carta pelo nome
     * @param {string} cardName - Nome da carta
     * @returns {Promise<string>} URL da imagem ou placeholder
     */
    async getCardImage(cardName) {
        if (!cardName) return this.getPlaceholder();
        
        // Verificar cache
        if (this.cache.has(cardName)) {
            return this.cache.get(cardName);
        }
        
        try {
            const response = await fetch(`https://api.scryfall.com/cards/named?fuzzy=${encodeURIComponent(cardName)}`);
            
            if (!response.ok) {
                console.warn(`Carta não encontrada: ${cardName}`);
                return this.getPlaceholder();
            }
            
            const data = await response.json();
            const imageUrl = data.image_uris?.art_crop || data.image_uris?.normal || this.getPlaceholder();
            
            // Salvar no cache
            this.cache.set(cardName, imageUrl);
            
            return imageUrl;
        } catch (error) {
            console.error(`Erro ao buscar carta ${cardName}:`, error);
            return this.getPlaceholder();
        }
    },
    
    /**
     * Retorna URL de placeholder
     */
    getPlaceholder() {
        return 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100"%3E%3Crect fill="%23ddd" width="100" height="100"/%3E%3Ctext x="50" y="50" text-anchor="middle" dy=".3em" fill="%23999" font-family="sans-serif" font-size="14"%3EMTG%3C/text%3E%3C/svg%3E';
    },
    
    /**
     * Cria elemento de imagem com loading lazy
     * @param {string} comandante - Nome do comandante
     * @param {string} deckNome - Nome do deck (para alt text)
     * @returns {HTMLElement} Elemento img
     */
    createImageElement(comandante, deckNome) {
        const img = document.createElement('img');
        img.alt = comandante || deckNome;
        img.style.width = '48px';
        img.style.height = '48px';
        img.style.borderRadius = '8px';
        img.style.objectFit = 'cover';
        img.style.border = '2px solid var(--gray-300)';
        img.loading = 'lazy';
        
        // Placeholder inicial
        img.src = this.getPlaceholder();
        
        // Carregar imagem real
        if (comandante) {
            this.getCardImage(comandante).then(url => {
                img.src = url;
            });
        }
        
        return img;
    },
    
    /**
     * Cria HTML string para imagem (para uso em innerHTML)
     * @param {string} comandante - Nome do comandante
     * @param {string} deckNome - Nome do deck
     * @returns {string} HTML string
     */
    getImageHTML(comandante, deckNome) {
        return `<img 
            src="${this.getPlaceholder()}" 
            alt="${comandante || deckNome}"
            data-comandante="${comandante || ''}"
            class="commander-art"
            style="width: 48px; height: 48px; border-radius: 8px; object-fit: cover; border: 2px solid var(--gray-300);"
            loading="lazy"
        >`;
    },
    
    /**
     * Carrega imagens para todos os elementos com classe commander-art
     */
    loadAllImages() {
        document.querySelectorAll('.commander-art[data-comandante]').forEach(img => {
            const comandante = img.dataset.comandante;
            if (comandante) {
                this.getCardImage(comandante).then(url => {
                    img.src = url;
                });
            }
        });
    }
};

// Auto-carregar imagens quando o DOM estiver pronto
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => ScryfallHelper.loadAllImages());
} else {
    ScryfallHelper.loadAllImages();
}
