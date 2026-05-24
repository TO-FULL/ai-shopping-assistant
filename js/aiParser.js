/**
 * AI Shopping Assistant - Natural Language Parser
 * Parses user input into structured shopping criteria
 */

const CATEGORY_KEYWORDS = {
    '牛仔裤': ['牛仔裤', '牛仔', 'jeans', '牛仔库', '牛子裤'],
    '运动鞋': ['运动鞋', '跑鞋', '球鞋', '跑步鞋', '运动', '鞋子', '鞋'],
    '面霜': ['面霜', '保湿霜', '润肤霜', '乳霜', 'cream'],
    '衬衫': ['衬衫', '衬衣', 'shirt'],
    '蓝牙耳机': ['蓝牙耳机', '耳机', '无线耳机', '降噪耳机', 'earphone', 'headphone'],
    'T恤': ['t恤', '短袖', 't shirt', 'tee'],
    '连衣裙': ['连衣裙', '裙子', '裙'],
    '包包': ['包', '包包', '背包', '手提包', '挎包', 'bag'],
    '手表': ['手表', '腕表', 'watch'],
    '护肤套装': ['护肤套装', '护肤品', '护肤', 'skincare'],
    '口红': ['口红', '唇膏', '唇釉', 'lipstick'],
    '卫衣': ['卫衣', '连帽衫', 'hoodie', '套头衫'],
    '外套': ['外套', '夹克', '大衣', '风衣', 'jacket', '冲锋衣', '西装']
};

const COLOR_KEYWORDS = {
    '黑色': ['黑色', '黑', 'black'],
    '白色': ['白色', '白', 'white'],
    '蓝色': ['蓝色', '蓝', 'navy', 'blue'],
    '浅蓝色': ['浅蓝色', '浅蓝', '天蓝色', '天蓝'],
    '红色': ['红色', '红', 'red'],
    '粉色': ['粉色', '粉红', 'pink'],
    '绿色': ['绿色', '绿', 'green'],
    '黄色': ['黄色', '黄', 'yellow'],
    '棕色': ['棕色', '棕', '咖啡', 'brown'],
    '灰色': ['灰色', '灰', 'grey', 'gray'],
    '紫色': ['紫色', '紫', 'purple'],
    '碎花': ['碎花', '印花', '花'],
    '金色': ['金色', '金', 'gold'],
    '黑金': ['黑金', '黑金色'],
    '多色': ['多色', '彩色', '多种颜色']
};

const STYLE_KEYWORDS = {
    '微喇': ['微喇', '微喇叭', '喇叭'],
    '阔腿': ['阔腿', '宽松裤'],
    '直筒': ['直筒', '直简'],
    '修身': ['修身', '紧身', '贴身', ' slim'],
    '宽松': ['宽松', 'oversize', '肥大'],
    '韩版': ['韩版', '韩国', '韩风'],
    '法式': ['法式', '法国', 'french'],
    '商务': ['商务', '正装', '职业', '上班', '工作'],
    '休闲': ['休闲', '日常', 'casual'],
    '运动': ['运动', '健身', 'running'],
    '复古': ['复古', 'vintage', '古着'],
    '简约': ['简约', '简单', '极简', 'minimal'],
    '高级感': ['高级感', '高端', '高级'],
    '吊带': ['吊带', '背心'],
    '腋下包': ['腋下包', '单肩包'],
    '托特包': ['托特包', 'tote', '大包'],
    '哑光': ['哑光', '雾面', 'matte'],
    '丝绒': ['丝绒', '绒面']
};

const SEASON_KEYWORDS = {
    '春季': ['春季', '春天', '春款', '春装', '春'],
    '夏季': ['夏季', '夏天', '夏款', '夏装', '夏', '透气'],
    '秋季': ['秋季', '秋天', '秋款', '秋装', '秋'],
    '冬季': ['冬季', '冬天', '冬款', '冬装', '冬', '保暖'],
    '春秋': ['春秋', '春秋季', '春秋款', '春秋装'],
    '四季': ['四季', '全年', '通用']
};

const MATERIAL_KEYWORDS = {
    '棉': ['纯棉', '全棉', '棉质', '棉', 'cotton'],
    '牛仔': ['牛仔布', '牛仔'],
    '网面': ['网面', '网布', 'mesh'],
    '帆布': ['帆布', 'canvas'],
    '雪纺': ['雪纺', 'chiffon'],
    '缎面': ['缎面', '丝绸', '真丝', 'silk'],
    '真皮': ['真皮', '牛皮', '羊皮', 'leather'],
    '树脂': ['树脂', '塑料', '塑胶'],
    '不锈钢': ['不锈钢', '钢带']
};

const PLATFORM_KEYWORDS = {
    '淘宝': ['淘宝', '天猫', 'taobao'],
    '京东': ['京东', 'jd', 'jingdong'],
    '拼多多': ['拼多多', 'pdd', '拼夕夕']
};

const PRICE_PATTERNS = [
    /(\d+)\s*[-~到至]\s*(\d+)\s*元?/,
    /(\d+)\s*元?\s*以内/,
    /(\d+)\s*元?\s*以下/,
    /(\d+)\s*元?\s*左右/,
    /(\d+)\s*元?\s*以下/,
    /(\d+)\s*元?\s*以内/,
    /预算\s*(\d+)/,
    /价格\s*(\d+)\s*[-~到至]\s*(\d+)/,
    /(\d+)\s*[-~]\s*(\d+)\s*块/,
    /(\d+)\s*块\s*以内/
];

class AIParser {
    parse(input) {
        if (!input || !input.trim()) {
            return null;
        }

        const text = input.toLowerCase();

        // Extract price first, so size extraction can avoid price numbers
        const priceInfo = this.extractPrice(text);

        const criteria = {
            query: input.trim(),
            category: this.extractCategory(text),
            priceMin: priceInfo ? priceInfo.min : null,
            priceMax: priceInfo ? priceInfo.max : null,
            color: this.extractColor(text),
            style: this.extractStyle(text),
            season: this.extractSeason(text),
            material: null,
            size: this.extractSize(text, priceInfo),
            platform: this.extractPlatform(text),
            keywords: []
        };

        // Extract material only if category doesn't already contain it (e.g. "牛仔裤" -> don't extract "牛仔" as material)
        criteria.material = this.extractMaterial(text, criteria.category);

        // Extract additional keywords (adjectives that don't fit other categories)
        criteria.keywords = this.extractKeywords(text, criteria);

        return criteria;
    }

    extractCategory(text) {
        for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
            for (const keyword of keywords) {
                if (text.includes(keyword.toLowerCase())) {
                    return category;
                }
            }
        }
        return null;
    }

    extractColor(text) {
        for (const [color, keywords] of Object.entries(COLOR_KEYWORDS)) {
            for (const keyword of keywords) {
                if (text.includes(keyword.toLowerCase())) {
                    return color;
                }
            }
        }
        return null;
    }

    extractStyle(text) {
        const styles = [];
        for (const [style, keywords] of Object.entries(STYLE_KEYWORDS)) {
            for (const keyword of keywords) {
                if (text.includes(keyword.toLowerCase())) {
                    styles.push(style);
                }
            }
        }
        return styles.length > 0 ? styles : null;
    }

    extractSeason(text) {
        // Sort keywords by length descending so longer matches (e.g. "春秋") win over shorter ("春")
        const allKeywords = [];
        for (const [season, keywords] of Object.entries(SEASON_KEYWORDS)) {
            for (const keyword of keywords) {
                allKeywords.push({ season, keyword: keyword.toLowerCase() });
            }
        }
        allKeywords.sort((a, b) => b.keyword.length - a.keyword.length);

        for (const { season, keyword } of allKeywords) {
            if (text.includes(keyword)) {
                return season;
            }
        }
        return null;
    }

    extractMaterial(text, category) {
        for (const [material, keywords] of Object.entries(MATERIAL_KEYWORDS)) {
            // Skip if category already contains this material (e.g. "牛仔裤" contains "牛仔")
            if (category && category.includes(material)) continue;
            for (const keyword of keywords) {
                if (text.includes(keyword.toLowerCase())) {
                    return material;
                }
            }
        }
        return null;
    }

    extractSize(text, priceInfo) {
        // Try letter sizes first
        const letterPatterns = [
            /(?:尺码|码数|尺寸|号).*?([smlxl]+)/i,
            /([smlxl]+)\s*码/,
            /穿\s*([smlxl]+)/
        ];
        for (const pattern of letterPatterns) {
            const match = text.match(pattern);
            if (match) {
                return match[1].toUpperCase();
            }
        }

        // Try numeric sizes, but exclude numbers used in price range
        const numMatch = text.match(/(\d{2,3})/g);
        if (numMatch) {
            for (const num of numMatch) {
                const n = parseInt(num);
                // Skip if this number is part of the price range
                if (priceInfo) {
                    if (n === Math.round(priceInfo.min) || n === Math.round(priceInfo.max)) continue;
                    if (n >= priceInfo.min && n <= priceInfo.max) continue;
                }
                // Heuristic: clothing sizes are usually 24-44 (waist) or < 100
                if (n >= 24 && n <= 44) {
                    return num;
                }
            }
        }
        return null;
    }

    extractPlatform(text) {
        for (const [platform, keywords] of Object.entries(PLATFORM_KEYWORDS)) {
            for (const keyword of keywords) {
                if (text.includes(keyword.toLowerCase())) {
                    return platform;
                }
            }
        }
        return null;
    }

    extractPrice(text) {
        for (const pattern of PRICE_PATTERNS) {
            const match = text.match(pattern);
            if (match) {
                if (match[2]) {
                    return {
                        min: parseInt(match[1]),
                        max: parseInt(match[2])
                    };
                } else {
                    const price = parseInt(match[1]);
                    if (text.includes('以内') || text.includes('以下')) {
                        return { min: 0, max: price };
                    } else if (text.includes('左右')) {
                        return { min: price * 0.7, max: price * 1.3 };
                    } else {
                        return { min: price * 0.8, max: price * 1.2 };
                    }
                }
            }
        }
        return null;
    }

    extractKeywords(text, criteria) {
        const commonWords = new Set([
            '我想买', '我要买', '买', '想要', '需要', '求推荐',
            '的', '了', '在', '和', '或', '有', '没有', '是', '一条',
            '一件', '一双', '一个', '一套', '一瓶', '一款',
            '适合', '可以', '最好', '比较', '非常', '特别', '很',
            '价格', '预算', '大概', '大约', '左右', '以内', '以下',
            '之间', '到', '元', '块', '钱'
        ]);
        const words = text.split(/[\s,，.。!！?？]/).filter(w => w.length >= 2 && w.length <= 8);
        const keywords = [];

        for (const word of words) {
            const lowerWord = word.toLowerCase();
            // Skip common words and overly long phrases
            if (commonWords.has(lowerWord)) continue;
            if (lowerWord.length > 6 && !/[a-z]+/.test(lowerWord)) continue; // skip long Chinese phrases unless they contain English
            if (lowerWord === criteria.category) continue;
            if (lowerWord === criteria.color) continue;
            if (criteria.style && criteria.style.includes(lowerWord)) continue;
            if (lowerWord === criteria.season) continue;
            if (lowerWord === criteria.material) continue;
            if (lowerWord === criteria.platform) continue;
            if (lowerWord === criteria.size) continue;

            // Skip if it's just the category name appearing again (e.g. "牛仔裤" inside "我想买一条高腰微喇牛仔裤")
            if (criteria.category && lowerWord.includes(criteria.category.toLowerCase())) continue;

            if (!/\d+/.test(lowerWord)) {
                keywords.push(word);
            }
        }

        return keywords.slice(0, 5);
    }

    getConfirmationText(criteria) {
        const parts = [];

        if (criteria.category) {
            parts.push(`商品类型：${criteria.category}`);
        }
        if (criteria.color) {
            parts.push(`颜色：${criteria.color}`);
        }
        if (criteria.style) {
            parts.push(`风格：${criteria.style.join('、')}`);
        }
        if (criteria.season) {
            parts.push(`季节：${criteria.season}`);
        }
        if (criteria.material) {
            parts.push(`材质：${criteria.material}`);
        }
        if (criteria.size) {
            parts.push(`尺码：${criteria.size}`);
        }
        if (criteria.priceMin !== null && criteria.priceMax !== null) {
            if (criteria.priceMin === 0) {
                parts.push(`价格：${criteria.priceMax}元以内`);
            } else {
                parts.push(`价格：${criteria.priceMin}-${criteria.priceMax}元`);
            }
        }
        if (criteria.platform) {
            parts.push(`平台：${criteria.platform}`);
        }

        return parts;
    }
}

const aiParser = new AIParser();
