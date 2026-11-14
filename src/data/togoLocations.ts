import { RegionPolygon, TogoLocation } from '../types/climate.ts';

export const TOGO_CENTER: [number, number] = [8.6195, 0.8248];
export const TOGO_DEFAULT_ZOOM = 7;

export const TOGO_LOCATIONS: TogoLocation[] = [
  {
    id: 'lome',
    name: 'Lomé',
    regionId: 'maritime',
    regionName: 'Maritime',
    lat: 6.1319,
    lon: 1.2255,
    elevationM: 12,
    climateZoneFr: 'Zone côtière subéquatoriale (régime bimodal)',
    climateZoneEn: 'Subequatorial coastal zone (bimodal rainfall)',
    descriptionFr:
      'Capitale côtière au climat subéquatorial marqué par deux saisons pluvieuses (avril-juillet et septembre-octobre) et l’influence maritime du golfe de Guinée.',
    descriptionEn:
      'Coastal capital with a subequatorial climate featuring two rainy seasons (April–July and September–October) moderated by the Gulf of Guinea.',
    cropsFr: ['Maïs', 'Manioc', 'Cultures maraîchères', 'Cocotier'],
    cropsEn: ['Maize', 'Cassava', 'Market gardening', 'Coconut'],
    rainySeasonMonths: [4, 5, 6, 7, 9, 10],
  },
  {
    id: 'tsevie',
    name: 'Tsévié',
    regionId: 'maritime',
    regionName: 'Maritime',
    lat: 6.4261,
    lon: 1.2133,
    elevationM: 76,
    climateZoneFr: 'Plaine côtière intérieure (régime bimodal)',
    climateZoneEn: 'Inland coastal plain (bimodal rainfall)',
    descriptionFr:
      'Chef-lieu de la région Maritime situé dans les plaines agricoles au nord de Lomé, avec des sols propices aux cultures vivrières.',
    descriptionEn:
      'Administrative center of the Maritime region located across agricultural plains north of Lomé, supporting staple food crops.',
    cropsFr: ['Maïs', 'Manioc', 'Palmier à huile', 'Ananas'],
    cropsEn: ['Maize', 'Cassava', 'Oil palm', 'Pineapple'],
    rainySeasonMonths: [4, 5, 6, 7, 9, 10],
  },
  {
    id: 'aneho',
    name: 'Aného',
    regionId: 'maritime',
    regionName: 'Maritime',
    lat: 6.2281,
    lon: 1.5919,
    elevationM: 8,
    climateZoneFr: 'Littoral lagunaire oriental',
    climateZoneEn: 'Eastern lagoon littoral',
    descriptionFr:
      'Zone côtière et lagunaire à l’est du Togo, exposée aux variations maritimes, aux crues du fleuve Mono et à la dynamique côtière.',
    descriptionEn:
      'Eastern coastal and lagoon zone exposed to marine influences, Mono river discharge, and shoreline dynamics.',
    cropsFr: ['Maïs', 'Manioc', 'Pêche lagunaire', 'Cocotier'],
    cropsEn: ['Maize', 'Cassava', 'Lagoon fisheries', 'Coconut'],
    rainySeasonMonths: [4, 5, 6, 7, 9, 10],
  },
  {
    id: 'kpalime',
    name: 'Kpalimé',
    regionId: 'plateaux',
    regionName: 'Plateaux',
    lat: 6.9000,
    lon: 0.6333,
    elevationM: 225,
    climateZoneFr: 'Zone montagneuse forestière humide',
    climateZoneEn: 'Humid forested highland zone',
    descriptionFr:
      'Zone des monts du Togo caractérisée par une forte humidité, un relief forestier et l’une des pluviométries les plus abondantes du pays.',
    descriptionEn:
      'Togo Mountains zone characterized by high humidity, forested relief, and among the highest rainfall totals in the country.',
    cropsFr: ['Cacao', 'Café', 'Banane plantain', 'Igname'],
    cropsEn: ['Cocoa', 'Coffee', 'Plantain', 'Yam'],
    rainySeasonMonths: [4, 5, 6, 7, 8, 9, 10],
  },
  {
    id: 'atakpame',
    name: 'Atakpamé',
    regionId: 'plateaux',
    regionName: 'Plateaux',
    lat: 7.5333,
    lon: 1.1333,
    elevationM: 376,
    climateZoneFr: 'Hauts plateaux et collines (transition humide)',
    climateZoneEn: 'Highlands and hills (humid transition)',
    descriptionFr:
      'Chef-lieu de la région des Plateaux, situé sur les hauteurs entre le régime bimodal du sud et le régime unimodal du nord.',
    descriptionEn:
      'Capital of the Plateaux region, situated in the transition belt between southern bimodal and northern unimodal rainfall patterns.',
    cropsFr: ['Coton', 'Maïs', 'Igname', 'Cacao'],
    cropsEn: ['Cotton', 'Maize', 'Yam', 'Cocoa'],
    rainySeasonMonths: [4, 5, 6, 7, 8, 9, 10],
  },
  {
    id: 'sokode',
    name: 'Sokodé',
    regionId: 'centrale',
    regionName: 'Centrale',
    lat: 8.9833,
    lon: 1.1333,
    elevationM: 340,
    climateZoneFr: 'Zone de transition soudano-guinéenne',
    climateZoneEn: 'Sudano-Guinean transition zone',
    descriptionFr:
      'Cœur de la région Centrale, marqué par une alternance nette entre saison humide centrée sur juillet-septembre et saison sèche sous influence de l’Harmattan.',
    descriptionEn:
      'Center of the Centrale region with a distinct alternation between the July–September wet peak and the dry Harmattan season.',
    cropsFr: ['Igname', 'Sorgho', 'Soja', 'Maïs'],
    cropsEn: ['Yam', 'Sorghum', 'Soybean', 'Maize'],
    rainySeasonMonths: [5, 6, 7, 8, 9, 10],
  },
  {
    id: 'kara',
    name: 'Kara',
    regionId: 'kara',
    regionName: 'Kara',
    lat: 9.5511,
    lon: 1.1861,
    elevationM: 312,
    climateZoneFr: 'Zone soudanienne de savane arborée',
    climateZoneEn: 'Sudanian wooded savanna zone',
    descriptionFr:
      'Région septentrionale à saison des pluies unique (mai à octobre) et forte amplitude thermique diurne durant la saison sèche.',
    descriptionEn:
      'Northern region with a single rainy season (May to October) and wide diurnal temperature amplitude during the dry season.',
    cropsFr: ['Sorgho', 'Mil', 'Igname', 'Coton', 'Soja'],
    cropsEn: ['Sorghum', 'Millet', 'Yam', 'Cotton', 'Soybean'],
    rainySeasonMonths: [5, 6, 7, 8, 9, 10],
  },
  {
    id: 'dapaong',
    name: 'Dapaong',
    regionId: 'savanes',
    regionName: 'Savanes',
    lat: 10.8622,
    lon: 0.2075,
    elevationM: 326,
    climateZoneFr: 'Zone soudano-sahélienne (régime unimodal court)',
    climateZoneEn: 'Sudano-Sahelian zone (short unimodal rainfall)',
    descriptionFr:
      'Extrême nord du Togo, caractérisé par une saison des pluies concentrée de juin à septembre et des températures de surface élevées en saison sèche.',
    descriptionEn:
      'Far northern Togo, characterized by a concentrated June–September rainy season and high dry-season land surface temperatures.',
    cropsFr: ['Mil', 'Sorgho', 'Niébé', 'Arachide', 'Riz'],
    cropsEn: ['Millet', 'Sorghum', 'Cowpea', 'Groundnut', 'Rice'],
    rainySeasonMonths: [6, 7, 8, 9],
  },
];

// Approximate administrative boundaries of Togo's 5 regions for interactive map selection
export const TOGO_REGION_POLYGONS: RegionPolygon[] = [
  {
    regionId: 'savanes',
    name: 'Région des Savanes',
    capitalLocationId: 'dapaong',
    coordinates: [
      [11.14, 0.0],
      [11.14, 0.92],
      [10.25, 0.98],
      [9.95, 0.36],
      [10.35, -0.1],
      [11.14, 0.0],
    ],
  },
  {
    regionId: 'kara',
    name: 'Région de la Kara',
    capitalLocationId: 'kara',
    coordinates: [
      [10.25, 0.98],
      [10.05, 1.45],
      [9.25, 1.5],
      [9.18, 0.48],
      [9.95, 0.36],
      [10.25, 0.98],
    ],
  },
  {
    regionId: 'centrale',
    name: 'Région Centrale',
    capitalLocationId: 'sokode',
    coordinates: [
      [9.25, 1.5],
      [8.22, 1.62],
      [8.18, 0.56],
      [9.18, 0.48],
      [9.25, 1.5],
    ],
  },
  {
    regionId: 'plateaux',
    name: 'Région des Plateaux',
    capitalLocationId: 'atakpame',
    coordinates: [
      [8.22, 1.62],
      [6.72, 1.66],
      [6.66, 0.58],
      [7.48, 0.55],
      [8.18, 0.56],
      [8.22, 1.62],
    ],
  },
  {
    regionId: 'maritime',
    name: 'Région Maritime',
    capitalLocationId: 'lome',
    coordinates: [
      [6.72, 1.66],
      [6.22, 1.8],
      [6.1, 1.18],
      [6.66, 0.58],
      [6.72, 1.66],
    ],
  },
];

export const MONTH_LABELS_FR = [
  'Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin',
  'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc',
];

export const MONTH_LABELS_EN = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

export function getLocationById(id: string): TogoLocation {
  return TOGO_LOCATIONS.find((l) => l.id === id) ?? TOGO_LOCATIONS[0];
}
