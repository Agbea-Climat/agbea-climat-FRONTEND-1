import { Language } from '../types/climate.ts';

export const TRANSLATIONS: Record<
  Language,
  {
    nav: {
      home: string;
      map: string;
      compare: string;
      assistant: string;
      about: string;
      publicMode: string;
      scientificMode: string;
      modeLabel: string;
    };
    common: {
      loading: string;
      retry: string;
      errorTitle: string;
      emptyDataTitle: string;
      emptyDataDesc: string;
      source: string;
      resolution: string;
      period: string;
      location: string;
      indicator: string;
      year: string;
      month: string;
      allYear: string;
      rainySeason: string;
      drySeason: string;
      precipitation: string;
      vegetation: string;
      temperature: string;
      precipitationUnit: string;
      vegetationUnit: string;
      temperatureUnit: string;
      coordinates: string;
      elevation: string;
    };
    home: {
      eyebrow: string;
      heroTitle: string;
      heroSubtitle: string;
      ctaPrimary: string;
      ctaSecondary: string;
      heroCaption: string;
      howTitle: string;
      howSubtitle: string;
      step1Title: string;
      step1Desc: string;
      step2Title: string;
      step2Desc: string;
      step3Title: string;
      step3Desc: string;
      themesTitle: string;
      themesSubtitle: string;
      themeRainDesc: string;
      themeVegDesc: string;
      themeTempDesc: string;
      exploreLayer: string;
      modesTitle: string;
      modesSubtitle: string;
      publicCardTitle: string;
      publicCardDesc: string;
      publicCardCta: string;
      sciCardTitle: string;
      sciCardDesc: string;
      sciCardCta: string;
      voiceTitle: string;
      voiceDesc: string;
      voiceCta: string;
      sourcesTitle: string;
      sourcesDesc: string;
    };
    footer: {
      mission: string;
      navigation: string;
      experiences: string;
      contact: string;
      dataNote: string;
      rights: string;
    };
  }
> = {
  fr: {
    nav: {
      home: 'Accueil',
      map: 'Explorer la carte',
      compare: 'Comparer',
      assistant: 'Assistant AGBÉA',
      about: 'À propos',
      publicMode: 'Mode grand public',
      scientificMode: 'Mode scientifique',
      modeLabel: 'Expérience',
    },
    common: {
      loading: 'Chargement des observations satellitaires NASA...',
      retry: 'Réessayer',
      errorTitle: 'Impossible de charger les observations',
      emptyDataTitle: 'Données non disponibles pour cette période',
      emptyDataDesc:
        'Les jeux de données satellitaires NASA ne contiennent pas encore de mesures validées pour l’ensemble de la période sélectionnée.',
      source: 'Source',
      resolution: 'Résolution spatiale',
      period: 'Période',
      location: 'Localité',
      indicator: 'Indicateur',
      year: 'Année',
      month: 'Mois',
      allYear: 'Année complète',
      rainySeason: 'Saison des pluies',
      drySeason: 'Saison sèche',
      precipitation: 'Précipitations',
      vegetation: 'Végétation & humidité du sol',
      temperature: 'Température de surface',
      precipitationUnit: 'mm/mois',
      vegetationUnit: 'Indice 0–1',
      temperatureUnit: '°C',
      coordinates: 'Coordonnées',
      elevation: 'Altitude',
    },
    home: {
      eyebrow: 'Observation terrestre · Togo & Afrique de l’Ouest',
      heroTitle: "Comprendre notre environnement commence par l'observer.",
      heroSubtitle:
        'AGBÉA CLIMAT transforme les données satellitaires en informations environnementales accessibles pour mieux comprendre les changements qui touchent nos communautés.',
      ctaPrimary: 'Explorer la carte',
      ctaSecondary: 'Découvrir AGBÉA',
      heroCaption: 'Couverture satellitaire du Golfe de Guinée et du Togo — Plateaux, bassins fluviaux et savanes.',
      howTitle: 'Comment fonctionne la plateforme',
      howSubtitle:
        'Une chaîne transparente reliant les archives d’observation terrestre de la NASA aux réalités locales des cinq régions du Togo.',
      step1Title: '01. Collecte satellitaire NASA',
      step1Desc:
        'Interrogation directe des séries climatiques NASA POWER (GPM IMERG, MERRA-2, CERES) et des couches d’imagerie NASA GIBS.',
      step2Title: '02. Contextualisation territoriale',
      step2Desc:
        'Agrégation géographique sur les huit pôles climatiques et agricoles du Togo, de Lomé à Dapaong.',
      step3Title: '03. Lecture adaptée à chaque public',
      step3Desc:
        'Restitution en langage clair pour les citoyens et agriculteurs, et en tableaux analytiques complets pour les chercheurs.',
      themesTitle: 'Trois indicateurs environnementaux essentiels',
      themesSubtitle:
        'Chaque couche cartographique permet d’analyser la dynamique saisonnière et les variations interannuelles.',
      themeRainDesc:
        'Cumuls mensuels et intensité pluviométrique issus de la constellation GPM IMERG et de la réanalyse MERRA-2.',
      themeVegDesc:
        'Imagerie NDVI Terra MODIS et humidité des sols en surface et zone racinaire pour suivre le stress hydrique.',
      themeTempDesc:
        'Température radiométrique de surface (Skin Temp) et température de l’air à 2 mètres pour évaluer la chaleur locale.',
      exploreLayer: 'Ouvrir sur la carte',
      modesTitle: 'Deux expériences conçues pour des besoins distincts',
      modesSubtitle:
        'Accédez à la même rigueur d’observation NASA selon votre niveau de lecture technique.',
      publicCardTitle: 'Mode grand public & agriculture',
      publicCardDesc:
        'Explications sans jargon scientifique, traduction directe des indices en constats concrets et repères saisonniers pour les communautés.',
      publicCardCta: 'Ouvrir le mode grand public',
      sciCardTitle: 'Mode scientifique & recherche',
      sciCardDesc:
        'Séries historiques multi-annuelles, métadonnées de résolution spatiale, limites des capteurs et export CSV brut.',
      sciCardCta: 'Ouvrir le mode scientifique',
      voiceTitle: 'AGBÉA Voice — Assistant climatique ancré dans les données',
      voiceDesc:
        'Posez vos questions par écrit ou par commande vocale. L’assistant interprète uniquement les observations disponibles sur la plateforme pour la localité sélectionnée et signale toute donnée manquante.',
      voiceCta: 'Parler à l’assistant AGBÉA',
      sourcesTitle: 'Sources officielles d’observation de la Terre',
      sourcesDesc:
        'AGBÉA CLIMAT s’appuie sur l’API NASA POWER (Langley Research Center), la réanalyse MERRA-2, les précipitations GPM IMERG et les tuiles satellitaires NASA GIBS (MODIS Terra). Aucune valeur mesurée n’est simulée ou inventée.',
    },
    footer: {
      mission:
        'Plateforme d’intelligence climatique dédiée à l’accessibilité des observations satellitaires de la NASA au Togo et en Afrique.',
      navigation: 'Navigation',
      experiences: 'Parcours dédiés',
      contact: 'Projet & Contact',
      dataNote: 'Observations issues de NASA POWER API & NASA GIBS Earthdata.',
      rights: 'AGBÉA CLIMAT — Initiative d’intelligence environnementale.',
    },
  },
  en: {
    nav: {
      home: 'Home',
      map: 'Explore Map',
      compare: 'Compare Data',
      assistant: 'AGBÉA Assistant',
      about: 'About',
      publicMode: 'Public & Agriculture Mode',
      scientificMode: 'Scientific Mode',
      modeLabel: 'Experience',
    },
    common: {
      loading: 'Loading NASA satellite observations...',
      retry: 'Retry',
      errorTitle: 'Unable to load observations',
      emptyDataTitle: 'No validated data for this period',
      emptyDataDesc:
        'NASA satellite datasets do not yet contain validated observations for the selected period.',
      source: 'Source',
      resolution: 'Spatial resolution',
      period: 'Period',
      location: 'Location',
      indicator: 'Indicator',
      year: 'Year',
      month: 'Month',
      allYear: 'Full year',
      rainySeason: 'Rainy season',
      drySeason: 'Dry season',
      precipitation: 'Precipitation',
      vegetation: 'Vegetation & soil moisture',
      temperature: 'Surface temperature',
      precipitationUnit: 'mm/month',
      vegetationUnit: 'Index 0–1',
      temperatureUnit: '°C',
      coordinates: 'Coordinates',
      elevation: 'Elevation',
    },
    home: {
      eyebrow: 'Earth Observation · Togo & West Africa',
      heroTitle: 'Understanding our environment begins with observing it.',
      heroSubtitle:
        'AGBÉA CLIMAT transforms satellite observations into accessible environmental intelligence to help communities understand local changes.',
      ctaPrimary: 'Explore Map',
      ctaSecondary: 'Discover AGBÉA',
      heroCaption: 'Satellite view of the Gulf of Guinea and Togo — Plateaux highlands, river basins, and northern savanna.',
      howTitle: 'How the platform works',
      howSubtitle:
        'A transparent pipeline connecting NASA Earth observation archives to local conditions across Togo’s five regions.',
      step1Title: '01. NASA Satellite Acquisition',
      step1Desc:
        'Direct querying of NASA POWER climate series (GPM IMERG, MERRA-2, CERES) and NASA GIBS satellite imagery layers.',
      step2Title: '02. Territorial Contextualization',
      step2Desc:
        'Geographic structuring across eight key climate and agricultural hubs in Togo, from Lomé to Dapaong.',
      step3Title: '03. Tailored Interpretation',
      step3Desc:
        'Plain-language insights for citizens and farmers alongside full analytical tables for researchers.',
      themesTitle: 'Three core environmental indicators',
      themesSubtitle:
        'Each map layer tracks seasonal dynamics and year-to-year environmental variations.',
      themeRainDesc:
        'Monthly totals and rainfall rates derived from GPM IMERG precipitation products and MERRA-2 reanalysis.',
      themeVegDesc:
        'MODIS Terra NDVI satellite imagery paired with top and root-zone soil wetness indices to monitor moisture stress.',
      themeTempDesc:
        'Radiometric Earth skin temperature and 2-meter air temperature to evaluate local thermal conditions.',
      exploreLayer: 'Open on map',
      modesTitle: 'Two experiences built for distinct users',
      modesSubtitle:
        'Access the exact same NASA observation foundation adapted to your technical workflow.',
      publicCardTitle: 'Public & Agriculture Mode',
      publicCardDesc:
        'Jargon-free explanations translating scientific metrics into clear local observations and seasonal cues.',
      publicCardCta: 'Open Public Mode',
      sciCardTitle: 'Scientific & Research Mode',
      sciCardDesc:
        'Multi-year historical charts, spatial resolution metadata, sensor limitations, and raw CSV data export.',
      sciCardCta: 'Open Scientific Mode',
      voiceTitle: 'AGBÉA Voice — Data-grounded climate assistant',
      voiceDesc:
        'Ask questions by text or voice recording. The assistant only interprets actual platform observations for the selected location and explicitly states when data is missing.',
      voiceCta: 'Open AGBÉA Assistant',
      sourcesTitle: 'Official Earth Observation Data Sources',
      sourcesDesc:
        'AGBÉA CLIMAT connects to the NASA POWER API (Langley Research Center), MERRA-2 reanalysis, GPM IMERG precipitation, and NASA GIBS MODIS Terra imagery. No environmental values are fabricated.',
    },
    footer: {
      mission:
        'Climate intelligence platform dedicated to making NASA satellite observations understandable across Togo and Africa.',
      navigation: 'Navigation',
      experiences: 'Experiences',
      contact: 'Project & Contact',
      dataNote: 'Observations sourced from NASA POWER API & NASA GIBS Earthdata.',
      rights: 'AGBÉA CLIMAT — Environmental Intelligence Initiative.',
    },
  },
};
