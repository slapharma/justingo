// Content for demo-only screens (city guides, hotels, community, plans, business). All names are
// invented placeholders: no real hotels, races, clubs or brands. Real product data lives in store.ts.
import type { Tier } from './components/demo';
import type { PhotoKey } from './photos';

export interface CityGuide {
  id: string;
  name: string;
  blurb: string;
  routeIds: string[];
  neighbourhoods: string[];
  photo: PhotoKey;
}

export const CITY_GUIDES: CityGuide[] = [
  {
    id: 'central',
    name: 'Central London',
    blurb: 'Royal parks, the Thames and the canal. Flat, busy early, beautiful at dawn.',
    routeIds: ['hyde-park-loop', 'regents-park-primrose-hill', 'thames-bridges-loop', 'regents-canal'],
    neighbourhoods: ['Westminster', 'South Bank', 'Marylebone', 'King’s Cross'],
    photo: 'central',
  },
  {
    id: 'north',
    name: 'North London',
    blurb: 'Hills and views: the Heath, Parliament Hill and Ally Pally.',
    routeIds: ['hampstead-heath', 'alexandra-palace'],
    neighbourhoods: ['Hampstead', 'Highgate', 'Muswell Hill'],
    photo: 'north',
  },
  {
    id: 'east',
    name: 'East London',
    blurb: 'Fast, flat laps and the Olympic Park.',
    routeIds: ['victoria-park', 'olympic-park'],
    neighbourhoods: ['Hackney', 'Stratford', 'Bow'],
    photo: 'east',
  },
  {
    id: 'south',
    name: 'South London',
    blurb: 'Commons, riverside parks and Greenwich’s hill.',
    routeIds: ['clapham-common', 'battersea-park', 'crystal-palace', 'greenwich-park'],
    neighbourhoods: ['Clapham', 'Battersea', 'Greenwich', 'Crystal Palace'],
    photo: 'south',
  },
  {
    id: 'west',
    name: 'West London',
    blurb: 'Big green spaces: Richmond Park, Bushy Park and the Thames Path.',
    routeIds: ['richmond-park-gates', 'bushy-park', 'kew-richmond-thames', 'wimbledon-common'],
    neighbourhoods: ['Richmond', 'Kew', 'Wimbledon', 'Teddington'],
    photo: 'west',
  },
];

export interface HotelDemo {
  id: string;
  name: string;
  area: string;
  routes: string;
  perks: string[];
  photo: PhotoKey;
}

export const HOTELS: HotelDemo[] = [
  { id: 'h1', name: 'The Parkside Hotel', area: 'Knightsbridge', routes: '3 routes from the lobby', perks: ['Concierge-narrated 5K', 'Mindful morning walk', 'Juice bar finish'], photo: 'hotel' },
  { id: 'h2', name: 'Riverside Grand', area: 'South Bank', routes: '2 routes from the lobby', perks: ['Bridges 10K', 'Marathon shakeout run'], photo: 'hotel' },
  { id: 'h3', name: 'Canal House', area: 'King’s Cross', routes: '2 routes from the lobby', perks: ['Towpath 5K', 'Bike tour'], photo: 'hotel' },
  { id: 'h4', name: 'Hilltop Lodge', area: 'Hampstead', routes: '1 route from the lobby', perks: ['Heath hills loop'], photo: 'hotel' },
];

export const CHALLENGES = [
  { id: 'c1', title: 'Royal Parks 50', detail: 'Run 50 km across London’s royal parks this month', progress: 0.42, joined: 1284, tier: 'free' as Tier },
  { id: 'c2', title: 'Thames Bridges Series', detail: 'Three bridge routes, lowest combined time wins', progress: 0.0, joined: 316, tier: 'free' as Tier },
  { id: 'c3', title: 'Team Step Up', detail: 'Corporate wellness: your office vs the city', progress: 0.18, joined: 57, tier: 'free' as Tier },
];

export const VIRTUAL_RACES = [
  { id: 'v1', title: 'Autumn Heath 10K', date: '1–31 Oct', mode: 'On course or anywhere' },
  { id: 'v2', title: 'Charity Dash 5K', date: '9 Nov', mode: 'Open course window' },
];

export const GROUPS = [
  { id: 'g1', name: 'Hackney Harriers (demo)', members: 214, detail: 'Run club · Tuesday and Thursday routes' },
  { id: 'g2', name: 'London Coffee Runners', members: 1840, detail: 'Social 5Ks that finish at a café' },
  { id: 'g3', name: 'Marathon Training Crew', members: 562, detail: 'Coach-led long runs · Creator group' },
];

export const LEADERBOARD = [
  { rank: 1, name: 'A. Runner', value: '48.2 km' },
  { rank: 2, name: 'Sam P.', value: '44.9 km' },
  { rank: 3, name: 'Priya K.', value: '41.3 km' },
  { rank: 4, name: 'You', value: '21.0 km' },
];

export const BADGES = ['First run', '5K', '10K', 'Half', 'Hill climber', 'Early bird', 'Clean-up run', 'All five areas'];

export interface Plan {
  id: Tier;
  name: string;
  price: string;
  sub: string;
  features: string[];
}

export const PLANS: Plan[] = [
  {
    id: 'free',
    name: 'Free',
    price: '£0',
    sub: 'Forever',
    features: ['Turn-by-turn voice directions', 'Every route in the library', 'Create routes (5 a month)', 'Run log and splits', 'Groups, challenges and badges'],
  },
  {
    id: 'premium',
    name: 'Premium',
    price: '£4.99',
    sub: 'a month · £44.99 a year · £99 lifetime',
    features: ['Unlimited routes', 'Topo and satellite maps', 'Live tracking for friends', 'Strava import and export', 'Interval training', 'Treadmill street view', 'Enhanced voices', '3D flyover'],
  },
  {
    id: 'creator',
    name: 'Creator',
    price: '£16.99',
    sub: 'a month · £169 a year · includes Premium',
    features: ['Photos, logos and audio on routes', 'Branded share pages and images', 'GPX downloads for your followers', 'Creator groups for clubs and coaches'],
  },
];

export interface BusinessModel {
  id: string;
  title: string;
  pitch: string;
  bullets: string[];
  photo: PhotoKey;
}

export const BUSINESS: BusinessModel[] = [
  {
    id: 'hotels',
    title: 'Hotels & hospitality',
    pitch: 'Give every guest a local running guide from the lobby.',
    bullets: ['Voice-guided routes narrated by your staff', 'Brand page, QR room cards and website embeds', 'Concierge mapping tool and digital hotel guide', 'Listing in the JustinGo hotel finder', 'Usage analytics'],
    photo: 'hotel',
  },
  {
    id: 'races',
    title: 'Races & events',
    pitch: 'Course maps, audio guidance and live tracking in one place.',
    bullets: ['Course map embeds for your race site', 'Audio course guidance with sponsor messages', 'Live tracking map for spectators', 'Leaderboards, virtual races and digital medals', 'GPS start and finish timing'],
    photo: 'race',
  },
  {
    id: 'tourism',
    title: 'Tourism & destinations',
    pitch: 'Turn your city into a series of guided runs and walks.',
    bullets: ['Official city guides', 'Themed audio trails', 'Seasonal challenge series'],
    photo: 'tourism',
  },
  {
    id: 'corporate',
    title: 'Corporate wellness',
    pitch: 'Team challenges that get people moving.',
    bullets: ['Company leaderboards', 'Virtual team races', 'Charity step challenges'],
    photo: 'corporate',
  },
  {
    id: 'brands',
    title: 'Brands & sponsors',
    pitch: 'Reach runners at the moment they’re moving.',
    bullets: ['Audio activations along routes', 'Branded routes and badges', 'Sponsored share images'],
    photo: 'brands',
  },
  {
    id: 'clubs',
    title: 'Clubs & coaches',
    pitch: 'Share routes and sessions with your members.',
    bullets: ['Creator plan and branded groups', 'Weekly route drops', 'Member challenges'],
    photo: 'clubs',
  },
];
