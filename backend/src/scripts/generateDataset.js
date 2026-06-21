/**
 * generateDataset.js
 *
 * Generates a realistic 100k+ search query dataset and writes it to queries.csv
 *
 * Categories: tech, sports, food, entertainment, health, finance, travel, shopping
 * Format: query,count
 *
 * Run: node src/scripts/generateDataset.js
 */

const fs = require('fs');
const path = require('path');

// Seed data — real-world-like query templates
const seeds = {
  tech: [
    'iphone', 'iphone 15', 'iphone 15 pro', 'iphone 15 pro max', 'iphone charger',
    'samsung galaxy', 'samsung galaxy s24', 'samsung galaxy a54', 'samsung s24 ultra',
    'laptop', 'gaming laptop', 'best laptop 2024', 'laptop under 50000',
    'macbook air', 'macbook pro', 'macbook m3', 'macbook charger',
    'android phone', 'best android phone', 'android 14',
    'headphones', 'wireless headphones', 'noise cancelling headphones', 'airpods',
    'airpods pro', 'airpods max', 'sony headphones', 'boat headphones',
    'smartwatch', 'apple watch', 'samsung watch', 'garmin watch',
    'keyboard', 'mechanical keyboard', 'gaming keyboard', 'wireless keyboard',
    'mouse', 'gaming mouse', 'wireless mouse', 'logitech mouse',
    'monitor', '4k monitor', 'gaming monitor', 'ultrawide monitor',
    'gpu', 'rtx 4090', 'rtx 4080', 'amd gpu', 'graphics card',
    'cpu', 'intel i9', 'ryzen 9', 'best processor',
    'ssd', '1tb ssd', 'nvme ssd', 'external ssd',
    'router', 'wifi router', 'mesh router', 'best router 2024',
    'javascript', 'python tutorial', 'react js', 'node js', 'typescript',
    'docker tutorial', 'kubernetes basics', 'aws tutorial', 'linux commands',
    'chatgpt', 'openai api', 'gemini ai', 'claude ai', 'copilot',
    'vscode extensions', 'git commands', 'github actions', 'terraform',
    'ipad', 'ipad pro', 'ipad air', 'ipad mini',
    'pixel 8', 'pixel 8 pro', 'google pixel',
    'oneplus 12', 'oneplus nord', 'realme phone',
    'tablet', 'best tablet 2024', 'drawing tablet',
    'camera', 'dslr camera', 'mirrorless camera', 'sony camera',
    'gopro', 'action camera', 'drone camera',
    'tv', 'smart tv', 'oled tv', '4k tv', 'samsung tv', 'lg tv',
    'speaker', 'bluetooth speaker', 'soundbar', 'home theater',
    'power bank', 'fast charger', 'usb c charger',
    'gaming chair', 'gaming setup', 'rgb setup',
    'vr headset', 'meta quest', 'playstation vr',
    'ps5', 'xbox series x', 'nintendo switch',
    'gaming controller', 'ps5 controller', 'xbox controller',
    'raspberry pi', 'arduino', 'microcontroller',
    'chat gpt 4', 'ai tools', 'midjourney', 'stable diffusion',
    'figma tutorial', 'adobe xd', 'canva design',
    'best vpn', 'antivirus', 'password manager',
  ],
  sports: [
    'ipl 2024', 'ipl schedule', 'ipl live score', 'ipl final',
    'cricket score', 'india vs pakistan', 'india vs australia',
    'virat kohli', 'rohit sharma', 'ms dhoni', 'sachin tendulkar',
    'football', 'premier league', 'la liga', 'champions league',
    'cristiano ronaldo', 'lionel messi', 'neymar', 'mbappe',
    'fifa world cup', 'euro 2024', 'copa america',
    'nba', 'nba playoffs', 'lebron james', 'stephen curry',
    'tennis', 'wimbledon', 'us open', 'french open', 'australian open',
    'roger federer', 'rafael nadal', 'novak djokovic', 'carlos alcaraz',
    'badminton', 'pv sindhu', 'saina nehwal', 'kidambi srikanth',
    'olympics 2024', 'paris olympics', 'india olympics',
    'kabaddi', 'pro kabaddi', 'wrestling',
    'boxing', 'ufc', 'mma', 'wwe',
    'f1', 'formula 1', 'max verstappen', 'lewis hamilton',
    'golf', 'tiger woods', 'masters golf',
    'marathon', 'boston marathon', 'running tips',
    'gym workout', 'weight loss exercise', 'yoga for beginners',
    'fitness tracker', 'calorie calculator', 'protein diet',
    'football jersey', 'cricket bat', 'sports shoes',
    'hockey', 'field hockey', 'ice hockey',
    'swimming', 'michael phelps', 'swimming tips',
  ],
  food: [
    'pizza recipe', 'pizza near me', 'dominos pizza', 'pizza hut',
    'biryani recipe', 'chicken biryani', 'hyderabadi biryani',
    'pasta recipe', 'spaghetti carbonara', 'pasta near me',
    'burger', 'mcdonalds', 'burger king', 'best burger near me',
    'sushi near me', 'japanese food', 'ramen recipe',
    'chinese food', 'chinese food near me', 'fried rice recipe',
    'cake recipe', 'chocolate cake', 'birthday cake ideas',
    'coffee', 'starbucks', 'cold coffee recipe', 'espresso',
    'smoothie recipes', 'protein smoothie', 'green smoothie',
    'healthy breakfast', 'oatmeal recipe', 'avocado toast',
    'indian food', 'butter chicken recipe', 'palak paneer',
    'vegan recipes', 'vegetarian dinner', 'plant based diet',
    'keto diet recipes', 'intermittent fasting', 'calorie counting',
    'air fryer recipes', 'instant pot recipes', 'slow cooker recipes',
    'dessert recipes', 'ice cream', 'cheesecake recipe',
    'cocktail recipes', 'mocktail recipes', 'lemonade recipe',
    'food delivery', 'swiggy', 'zomato', 'uber eats',
    'restaurant near me', 'best restaurant', 'fine dining',
  ],
  entertainment: [
    'netflix movies', 'netflix series', 'best netflix shows',
    'amazon prime video', 'hotstar', 'disney plus',
    'movies 2024', 'new movies', 'upcoming movies',
    'avengers', 'marvel movies order', 'spider man',
    'the batman', 'dc movies', 'black panther',
    'stranger things', 'game of thrones', 'breaking bad',
    'the office', 'friends', 'how i met your mother',
    'money heist', 'dark series', 'squid game',
    'bollywood movies', 'new hindi movies', 'shah rukh khan movies',
    'pathaan movie', 'jawan movie', 'animal movie',
    'south indian movies', 'tollywood', 'kollywood',
    'anime', 'naruto', 'one piece', 'attack on titan', 'demon slayer',
    'youtube', 'youtube music', 'youtube shorts',
    'spotify playlist', 'spotify premium', 'apple music',
    'arijit singh songs', 'taylor swift songs', 'ed sheeran songs',
    'bollywood songs 2024', 'latest songs', 'old songs hindi',
    'podcast', 'best podcasts', 'comedy podcasts',
    'tiktok', 'instagram reels', 'facebook',
    'twitch', 'gaming streamer', 'youtube gaming',
    'movie download', 'web series', 'tv shows 2024',
    'book recommendations', 'best novels', 'kindle books',
  ],
  health: [
    'weight loss tips', 'how to lose weight fast', 'belly fat exercise',
    'diabetes symptoms', 'diabetes diet', 'blood sugar control',
    'blood pressure', 'high bp remedies', 'hypertension treatment',
    'anxiety symptoms', 'depression treatment', 'mental health tips',
    'yoga benefits', 'meditation for beginners', 'deep breathing',
    'vitamin d deficiency', 'vitamin c benefits', 'multivitamin',
    'protein powder', 'whey protein', 'creatine supplement',
    'thyroid symptoms', 'hypothyroidism diet', 'thyroid test',
    'covid symptoms', 'immunity booster', 'health tips',
    'acne treatment', 'skincare routine', 'face wash',
    'hair fall treatment', 'hair growth tips', 'dandruff remedy',
    'back pain exercises', 'knee pain relief', 'joint pain',
    'sleep tips', 'insomnia remedies', 'melatonin',
    'pregnancy symptoms', 'pregnancy diet', 'baby care tips',
    'first aid', 'home remedies', 'ayurveda',
  ],
  finance: [
    'stock market today', 'nifty 50', 'sensex today', 'share price',
    'reliance industries', 'tata motors', 'infosys share price',
    'mutual funds', 'sip investment', 'best mutual funds 2024',
    'fd interest rate', 'fixed deposit', 'bank fd rates',
    'bitcoin price', 'ethereum price', 'crypto market',
    'gold price today', 'silver price today', 'gold investment',
    'insurance policy', 'term insurance', 'health insurance',
    'income tax', 'itr filing', 'tax saving investments',
    'home loan', 'personal loan', 'emi calculator',
    'credit card', 'best credit card', 'credit card offers',
    'upi payment', 'gpay', 'phonepe', 'paytm',
    'real estate investment', 'property price', 'flat for sale',
    'startup funding', 'venture capital', 'angel investor',
    'budget 2024', 'gst rate', 'epf withdrawal',
  ],
  travel: [
    'goa travel guide', 'goa beaches', 'best time to visit goa',
    'manali trip', 'manali in december', 'manali snow',
    'kashmir tour package', 'kashmir valley', 'dal lake',
    'rajasthan tour', 'jaipur travel guide', 'udaipur hotels',
    'kerala tour package', 'kerala backwaters', 'munnar',
    'shimla tour', 'ooty trip', 'coorg travel',
    'dubai travel guide', 'dubai visa', 'dubai hotels',
    'singapore tour', 'singapore attractions', 'singapore package',
    'thailand tour', 'bangkok travel', 'phuket beaches',
    'europe tour package', 'paris eiffel tower', 'rome colosseum',
    'maldives honeymoon', 'bali trip', 'indonesia visa',
    'flight booking', 'cheap flights', 'indigo flights',
    'hotel booking', 'oyo rooms', 'airbnb india',
    'train ticket booking', 'irctc login', 'tatkal ticket',
    'visa application', 'passport renewal', 'travel insurance',
    'road trip india', 'best hill stations', 'summer vacation',
  ],
  shopping: [
    'amazon sale', 'amazon prime day', 'amazon deals',
    'flipkart sale', 'flipkart big billion day', 'flipkart offers',
    'myntra sale', 'fashion sale', 'clothing discount',
    'shoes online', 'nike shoes', 'adidas shoes', 'puma shoes',
    'watch under 5000', 'smart watch under 10000',
    'furniture online', 'sofa set', 'bedroom furniture',
    'home decor', 'kitchen appliances', 'refrigerator',
    'washing machine', 'air conditioner', 'ac price',
    'meesho products', 'meesho kurta', 'meesho saree',
    'jewellery online', 'gold jewellery', 'diamond ring',
    'toys online', 'lego sets', 'kids toys',
    'books online', 'textbooks', 'stationery',
    'makeup products', 'lipstick', 'foundation', 'mascara',
    'perfume for men', 'women perfume', 'best deodorant',
    'organic products', 'natural skincare', 'herbal products',
    'sports shoes under 2000', 'running shoes', 'training shoes',
    'gym equipment', 'dumbbell set', 'yoga mat',
  ],
};

// Assign realistic count distributions to queries
function generateCount(category, index) {
  const baseRanges = {
    tech: [5000, 200000],
    sports: [3000, 150000],
    food: [2000, 120000],
    entertainment: [4000, 180000],
    health: [1500, 100000],
    finance: [2000, 130000],
    travel: [1000, 90000],
    shopping: [2500, 160000],
  };
  const [min, max] = baseRanges[category] || [500, 50000];
  // Earlier seeds (index 0) are more popular
  const decayFactor = Math.exp(-index / 20);
  return Math.floor(min + (max - min) * decayFactor * Math.random());
}

// Build the rows
const rows = [['query', 'count']]; // header
const seen = new Set();

let totalRows = 0;

for (const [category, queries] of Object.entries(seeds)) {
  queries.forEach((q, i) => {
    if (!seen.has(q)) {
      seen.add(q);
      rows.push([q, generateCount(category, i)]);
      totalRows++;
    }
  });
}

// Generate additional synthetic queries to reach 100k+
// Strategy: word1 + word2 + optional modifier, with numeric variants

const word1List = [
  'best','top','cheap','buy','review','how to','what is','install','setup','guide',
  'tutorial','tips','free','online','download','near me','2024','latest','new','compare',
  'vs','vs 2024','under 1000','under 5000','under 10000','under 50000','specifications',
  'price','release date','features','alternatives','problems','fix','update',
];

const word2List = [
  'laptop','phone','camera','watch','tv','speaker','tablet','router','keyboard','mouse',
  'monitor','headphones','earbuds','charger','cable','case','cover','stand','dock','hub',
  'car','bike','scooter','cycle','helmet','tyre','engine','battery','motor','fuel',
  'python','javascript','java','react','node','typescript','golang','rust','cpp','swift',
  'html','css','sql','mongodb','postgresql','redis','docker','kubernetes','aws','gcp',
  'hotel','flight','train','bus','taxi','cab','rental','resort','hostel','airbnb',
  'restaurant','cafe','pizza','burger','sushi','biryani','pasta','noodles','curry','salad',
  'doctor','hospital','clinic','medicine','pharmacy','test','checkup','appointment',
  'school','college','university','course','exam','test','certification','degree',
  'job','resume','interview','salary','internship','freelance','remote work','startup',
  'movie','series','show','anime','documentary','podcast','audiobook','ebook',
  'shoes','shirt','jeans','dress','kurta','saree','jacket','hoodie','sneakers','sandals',
  'laptop bag','backpack','wallet','belt','watch strap','sunglasses','ring','necklace',
  'sofa','bed','table','chair','wardrobe','shelf','lamp','curtain','carpet','mirror',
  'washing machine','refrigerator','microwave','ac','fan','heater','mixer','juicer',
  'cricket bat','football','badminton','tennis racket','chess','carrom','yoga mat','dumbbell',
  'mask','sanitizer','gloves','thermometer','oximeter','bp monitor','glucose meter',
  'book','novel','textbook','comic','magazine','newspaper','journal','diary','planner',
  'perfume','shampoo','conditioner','moisturizer','sunscreen','lipstick','foundation','serum',
  'dog food','cat food','pet toy','aquarium','bird cage','hamster','rabbit','fish',
  'guitar','keyboard','violin','drums','flute','ukulele','piano','harmonium',
  'paint','sketch','drawing','canvas','clay','origami','crochet','knitting','embroidery',
  'garden plant','seeds','fertilizer','pot','soil','grass','flower','cactus','bonsai',
];

const modifiers = [
  '', ' 2024', ' review', ' price in india', ' online', ' near me', ' under budget',
  ' for beginners', ' best brand', ' comparison', ' pros and cons', ' worth it',
  ' amazon', ' flipkart', ' myntra', ' specifications', ' how it works',
  ' setup guide', ' tips and tricks', ' problems', ' alternatives', ' discount',
];

let syntheticCount = 0;
const targetSynthetic = 100000 - totalRows;

outerLoop: for (let mi = 0; mi < modifiers.length; mi++) {
  for (let w1i = 0; w1i < word1List.length; w1i++) {
    for (let w2i = 0; w2i < word2List.length; w2i++) {
      const q = `${word1List[w1i]} ${word2List[w2i]}${modifiers[mi]}`.trim();
      if (!seen.has(q)) {
        seen.add(q);
        rows.push([q, Math.floor(Math.random() * 50000 + 50)]);
        syntheticCount++;
        if (syntheticCount >= targetSynthetic) break outerLoop;
      }
    }
  }
}

const outputPath = path.join(__dirname, '../../dataset/queries.csv');
const csvContent = rows.map(row => `${row[0]},${row[1]}`).join('\n');

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, csvContent, 'utf8');

console.log(`✅ Generated ${rows.length - 1} queries → ${outputPath}`);
