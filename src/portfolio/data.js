// =====================================================================================
//  PORTFOLIO CONTENT — edit everything for the five category windows in this file.
//
//  • Add a real image:  put the file in  public/portfolio/<category>/  and set
//        src: '/portfolio/ecommerce/01.jpg'
//    While `src` is '' the UI shows a clearly-labelled IMAGE SLOT instead.
//  • ratio is 'width/height' (e.g. '3/4' portrait, '16/9' landscape, '1/1' square).
//    The frame always keeps this ratio, so crop/export your image to match it.
//    Optional per-item  fit: 'contain'  shows the whole image instead of cropping.
//  • Text fields left as '' show a dim hint (see HINTS) — nothing is shown as fake content.
//  • Add or remove a project by adding/removing an object in `items`.
//    (Layouts are tuned for the item counts noted in each section.)
// =====================================================================================

export const HINTS = {
  title: 'Project title',
  brand: 'Brand name',
  client: 'Client name',
  description: 'Short description goes here.',
  character: 'Character name',
  company: 'Company or project name — add here',
  commissionedBy: 'Who commissioned the artwork — add here',
  game: 'Associated game or project — add here',
  platform: 'Platform — add here',
  purpose: 'Intended purpose of the characters — add here',
}

/* ---------- 01 · E-COMMERCE — IN-GAME STORE (7 portrait items) ---------- */
export const ECOMMERCE = {
  kicker: 'SHOP // 001',
  title: 'CREATIVE SHOP',
  subtitle: 'Browse the inventory of product visuals, e-commerce assets, and commercial designs.',
  items: [
    { title: 'Crunchy Snack Promotional Ad', brand: 'Food & Beverage', description: 'A bold and edgy promotional advertisement concept for a fictional snack brand, featuring a dark textured background, contrasting red accents, and eye-catching typography to highlight the product\'s crunchy appeal.', src: '/Images/Ecommerce/E1.mp4', alt: '', ratio: '3/4' },
    { title: 'Modern Fashion Collection Campaign', brand: 'Fashion & Apparel', description: 'A lifestyle-focused fashion advertisement concept showcasing a fictional clothing brand through editorial-style photography, layered image compositions, and warm, elegant tones to create a stylish and contemporary look.', src: '/Images/Ecommerce/E2.webp', alt: '', ratio: '3/4' },
    { title: 'Luxury Bedding Collection Promotion', brand: 'Home & Living', description: 'A minimalist promotional design concept for a fictional bedding collection, combining elegant typography, neutral tones, and layered product imagery to communicate comfort, relaxation, and understated luxury.', src: '/Images/Ecommerce/E3.webp', alt: '', ratio: '3/4' },
    { title: 'Botanical Skincare Product Campaign', brand: 'Beauty & Personal Care', description: 'An elegant product advertisement concept for a fictional skincare brand, highlighting a facial serum through botanical elements, soft neutral colors, and refined product presentation to convey a natural and premium feel.', src: '/Images/Ecommerce/E4.webp', alt: '', ratio: '3/4' },
    { title: 'Refreshing Citrus Drink Campaign', brand: 'Food & Beverage', description: 'A vibrant promotional advertisement concept for a fictional citrus beverage, using bright orange and yellow tones, fresh citrus illustrations, and clean product-focused layouts to communicate freshness and energy.', src: '/Images/Ecommerce/E5.webp', alt: '', ratio: '3/4' },
    { title: '', brand: '', description: '', src: '/Images/Ecommerce/E6.webp', alt: '', ratio: '3/4' },
    { title: '', brand: '', description: '', src: '/Images/Ecommerce/E7.webp', alt: '', ratio: '3/4' },
  ],
}

/* ---------- 02 · DIGITAL ILLUSTRATIONS — ART CODEX (two portrait, one landscape) ---------- */
export const ILLUSTRATION = {
  kicker: 'CODEX // 002',
  title: 'ART CODEX',
  subtitle: 'An illustrated collection of original artworks, experiments, and digital creations.',
  items: [
    { title: 'Team Secret\'s Most Creative Fan Contest', client: '2ND PLACE', description: 'An award-winning Rocket League illustration personifying the game\'s cars as armored characters inspired by Team Secret\'s identity, earning 2nd place.', src: '/Images/Illustrations/I1.webp', alt: '', ratio: '7/10' },
    { title: 'Fully Booked 20th Anniversary Illustration Design Contest', description: 'Celebrated Fully Booked’s 20th anniversary with an illustration inspired by stories and readers.', src: '/Images/Illustrations/I2.webp', alt: '', ratio: '7/10' },
    { title: 'Artic Origin Contest for Axie Infinity Characters', description: 'Designed a samurai-inspired Axie character for an Axie Infinity art contest.', src: '/Images/Illustrations/I3.webp', alt: '', ratio: '3/2' },
  ],
}

/* ---------- 03 · THUMBNAILS — MEDIA GALLERY (12 landscape items; the first is shown largest) ---------- */
export const THUMBNAILS = {
  kicker: 'ARCHIVE // 003',
  title: 'MEDIA GALLERY',
  subtitle: 'A visual archive of thumbnails crafted to capture attention and tell stories.',
  items: [
    { title: 'The Slow Road to Wealth', client: 'Warren Buffett Explains', description: 'A finance thumbnail visualizing long-term wealth building and investment strategies.', src: '/Images/Thumbnails/T1.webp', alt: '', ratio: '16/9' },
    { title: 'Choosing the Best Tech Ecosystem', client: 'Self-Initiated Sample', description: 'A tech comparison thumbnail highlighting the best platforms and devices to choose from.', src: '/Images/Thumbnails/T2.webp', alt: '', ratio: '16/9' },
    { title: 'This Is NOT Lethal Company!', client: 'Self-Initiated Sample', description: 'A gaming thumbnail capturing a chaotic and unexpected gameplay moment.', src: '/Images/Thumbnails/T3.webp', alt: '', ratio: '16/9' },
    { title: 'The Art of Basic Outdoor Photography', client: 'Self-Initiated Sample', description: 'A cinematic outdoor photography thumbnail showcasing nature and adventure.', src: '/Images/Thumbnails/T4.webp', alt: '', ratio: '16/9' },
    { title: 'Britain\'s Biggest Aviation Mistake', client: 'Self-Initiated Sample', description: 'A historical documentary thumbnail highlighting a major aviation controversy.', src: '/Images/Thumbnails/T5.webp', alt: '', ratio: '16/9' },
    { title: 'Transfer Notes Between Samsung and iPhone', client: 'Fixbotics', description: 'A tech tutorial thumbnail demonstrating how to transfer notes between mobile devices.', src: '/Images/Thumbnails/T6.webp', alt: '', ratio: '16/9' },
    { title: 'How to Land Your Next Job', client: 'Self-Initiated Sample', description: 'A career-focused thumbnail promoting job application tips and employment opportunities.', src: '/Images/Thumbnails/T7.webp', alt: '', ratio: '16/9' },
    { title: 'Movie Universes Explained', client: 'Movie Guy Explains', description: 'A movie breakdown thumbnail showcasing characters and scenes from different film franchises.', src: '/Images/Thumbnails/T8.webp', alt: '', ratio: '16/9' },
    { title: 'The Strikes Have Ended?', client: 'Self-Initiated Sample', description: 'A breaking news thumbnail covering developments surrounding the Iran conflict.', src: '/Images/Thumbnails/T9.webp', alt: '', ratio: '16/9' },
    { title: 'We Lost $10,000 to This Scam!', client: 'Self-Initiated Sample', description: 'A high-impact storytelling podcast thumbnail highlighting a costly online scam.', src: '/Images/Thumbnails/T10.webp', alt: '', ratio: '16/9' },
    { title: 'The $53K Mistake That Changed Everything', client: 'Self-Initiated Sample', description: 'A high-energy trading thumbnail highlighting a dramatic financial loss and unexpected market outcome.', src: '/Images/Thumbnails/T11.webp', alt: '', ratio: '16/9' },
    { title: 'Trump Bombed Iran?!', client: 'Self-Initiated Sample', description: 'A geopolitical news thumbnail illustrating the reported military escalation involving Iran.', src: '/Images/Thumbnails/T12.webp', alt: '', ratio: '16/9' },
  ],
}

/* ---------- 04 · GRAPHIC LAYOUTS — QUEST BOARD (17 mixed portrait / landscape / square items) ---------- */
export const LAYOUTS = {
  kicker: 'MISSIONS // 004',
  title: 'QUEST BOARD',
  subtitle: 'Completed design missions featuring posters, graphic layouts, photo manipulations, and creative visual compositions.',
  items: [
    { title: 'Sentinels X Yu Yu Hakusho E-Sport Jersey Design', client: 'Sentinels', description: 'Created a Sentinels Esports × Yu Yu Hakusho concept jersey and earned 2nd place.', tag: 'Graphic Design', src: '/Images/Graphics/G1.webp', alt: '', ratio: '5/3' },
    { title: 'Worthy', client: 'CREATIVE EXPLORATION', description: 'An illustrated poster featuring Himmel from Frieren, celebrating his legacy and the meaning of being a hero.', tag: 'Illustration', src: '/Images/Graphics/G2.webp', alt: '', ratio: '3/4' },
    { title: 'Black 33\'s Arcade Banner Poster', client: 'Black 33', description: 'A commissioned promotional banner featuring illustrated characters from iconic arcade games for a small business.', tag: 'Commissioned Work', src: '/Images/Graphics/G3.webp', alt: '', ratio: '16/9' },
    { title: 'Website UI Concept for NFT Collection', client: 'FrodoBots AI', description: 'A proposed FrodoBots website section featuring mythical creature NFTs in a continuously moving carousel, designed but never deployed.', tag: 'Website UI', src: '/Images/Graphics/G7.webp', alt: '', ratio: '2/1' },
    { title: 'Raining in Manila', client: 'CREATIVE EXPLORATION', description: 'An experimental typography poster exploring color grading, image clipping, and layered text compositions inspired by a popular song.', tag: 'Poster Design', src: '/Images/Graphics/G5.webp', alt: '', ratio: '5/7' },
    { title: 'Radiant Glow poster', client: 'CREATIVE EXPLORATION', description: 'A magazine-inspired social media poster exploring bold typography, vibrant colors, and editorial composition.', tag: 'Poster Design', src: '/Images/Graphics/G6.webp', alt: '', ratio: '5/7' },
    { title: 'Black 33 Logo Design', client: 'Black 33', description: 'A custom logo merging arcade console aesthetics and vaping culture into a single brand-inspired visual mark.', tag: 'Logo Design', src: '/Images/Graphics/G8.webp', alt: '', ratio: '1/1' },
    { title: '11th IT Congress - Break It Code Competition', client: 'SWITS', description: 'An elegant competition logo concept combining programming-inspired elements with a refined blue and gold visual identity.', tag: 'Logo Design', src: '/Images/Graphics/G4.webp', alt: '', ratio: '1/1' },
    { title: 'SWITS: 12th IT Congress', client: 'SWITS', description: 'An event cover design for SWITS, blending futuristic visuals and technology-inspired elements to match the event\'s theme.', tag: 'Event Graphics', src: '/Images/Graphics/G9.webp', alt: '', ratio: '16/9' },
    { title: 'SWITS Reward Poster', client: 'SWITS', description: 'An elegant promotional graphic showcasing a prize voucher for SWITS\'s 11th IT Congress, following its blue and gold event identity.', tag: 'Social Media Design', src: '/Images/Graphics/G10.webp', alt: '', ratio: '16/9' },
    { title: 'FrodoBots: About Section', client: 'FrodoBots', description: 'A website layout concept introducing FrodoBots\' earthrovers and NFT ecosystem through a structured content and video section.', tag: 'Website UI', src: '/Images/Graphics/G11.webp', alt: '', ratio: '2/1' },
    { title: 'EarthRovers Showcase', client: 'FrodoBots', description: 'An interactive website concept showcasing FrodoBots\' EarthRovers through NFT cards with scroll-triggered flip animations.', tag: 'Website UI', src: '/Images/Graphics/G12.webp', alt: '', ratio: '2/1' },
    { title: 'Pixel Stretch Series', client: 'PERSONAL PROJECT', description: 'A photo manipulation series using stretched image fragments to create abstract motion, depth, and visual distortion in architectural photography.', tag: 'Photo Manipulation', src: '/Images/Graphics/G13.webp', alt: '', ratio: '3/4' },
    { title: 'Pixel Stretch Series', client: 'PERSONAL PROJECT', description: 'A photo manipulation series using stretched image fragments to create abstract motion, depth, and visual distortion in architectural photography.', tag: 'Photo Manipulation', src: '/Images/Graphics/G14.webp', alt: '', ratio: '3/4' },
    { title: 'Pixel Stretch Series', client: 'PERSONAL PROJECT', description: 'A photo manipulation series using stretched image fragments to create abstract motion, depth, and visual distortion in architectural photography.', tag: 'Photo Manipulation', src: '/Images/Graphics/G15.webp', alt: '', ratio: '3/4' },
    { title: 'Pixel Stretch Series', client: 'PERSONAL PROJECT', description: 'A photo manipulation series using stretched image fragments to create abstract motion, depth, and visual distortion in architectural photography.', tag: 'Photo Manipulation', src: '/Images/Graphics/G16.webp', alt: '', ratio: '3/4' },
    { title: 'Pixel Stretch Series', client: 'PERSONAL PROJECT', description: 'A photo manipulation series using stretched image fragments to create abstract motion, depth, and visual distortion in architectural photography.', tag: 'Photo Manipulation', src: '/Images/Graphics/G17.webp', alt: '', ratio: '3/4' },
  ],
}

/* ---------- 05 · NFT COLLECTION — CHARACTER SELECT (5 square characters) ---------- */
// Fixed statement shown in the NFT DISCLAIMER section of every character. Edit the wording if you like.
export const NFT_DISCLAIMER =
  'I do not own the NFT characters or any related intellectual property. My contribution was creating the artwork and designs commissioned for the project.'

export const NFT = {
  kicker: 'ROSTER // 005',
  title: 'NFT CHARACTER SELECTION',
  characterName: 'ET Fugi NFT Collection',
  subtitle: 'A collection of commissioned NFT characters, brought to life through AI-assisted artistry.',
  // Collection-wide details. Every character uses these unless it has its own value below.
  company: 'FrodoBots AI - ET Fugi',
  description: 'An NFT collection of alien fugitives in distinct costumes, created as digital rewards for the community.',
  items: [
    // Per-character title or description overrides are optional.
    { title: '', src: '/Images/NFT/N1.webp', alt: '', ratio: '1/1', fit: 'contain' },
    { title: '', src: '/Images/NFT/N2.webp', alt: '', ratio: '1/1', fit: 'contain' },
    { title: '', src: '/Images/NFT/N3.webp', alt: '', ratio: '1/1', fit: 'contain' },
    { title: '', src: '/Images/NFT/N4.webp', alt: '', ratio: '1/1', fit: 'contain' },
    { title: '', src: '/Images/NFT/N5.webp', alt: '', ratio: '1/1', fit: 'contain' },
  ],
}
