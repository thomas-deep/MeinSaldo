import { CategoryRule, Transaction } from "./types";

export const categoryRules: CategoryRule[] = [
  {
    kategorie: "Gehalt & Einkommen",
    direction: "einnahme",
    keywords: [
      "gehalt", "lohn", "vergütung", "honorar", "sold", "bezüge", "entgelt",
      "gehaltszahlung", "lohnzahlung", "bonus", "tantieme", "weihnachtsgeld",
      "urlaubsgeld", "provision", "abschlagszahlung",
    ],
    namePatterns: [],
  },
  {
    kategorie: "Zahlung Ausgangsrechnung",
    direction: "einnahme",
    keywords: [
      "ausgangsrechnung", "ar-nr", "ar nr", "ar-nummer", "rechnungsnummer ar",
      "zahlung rechnung", "rg-nr", "rg nr", "honorarnote", "honorar-rechnung",
    ],
    namePatterns: [],
  },
  {
    kategorie: "Steuererstattung",
    direction: "einnahme",
    keywords: [
      "steuererstattung", "umsatzsteuererstattung", "ust-erstattung",
      "vorsteuererstattung", "einkommensteuererstattung",
      "lohnsteuererstattung", "körperschaftsteuererstattung",
      "gewerbesteuererstattung", "ust-guthaben", "steuer-guthaben",
    ],
    namePatterns: [],
  },
  {
    kategorie: "Mieteinnahmen",
    direction: "einnahme",
    keywords: [
      "mieteinnahme", "mietzahlung", "mietzins", "pachtzahlung",
      "pachteinnahme", "mieteingang", "kaltmiete eingang",
    ],
    namePatterns: [],
  },
  {
    kategorie: "Miete & Wohnen",
    direction: "ausgabe",
    keywords: [
      "miete", "kaltmiete", "warmmiete", "nebenkosten", "betriebskosten",
      "hausgeld", "wohngeld", "grundsteuer", "wohnungsbaugenossenschaft",
      "vermietung", "vermieter", "hausverwaltung", "wohnraum",
    ],
    namePatterns: [],
  },
  {
    kategorie: "Versicherungen",
    direction: "ausgabe",
    keywords: [
      "versicherung", "police", "beitrag", "krankenkasse", "haftpflicht",
      "rechtsschutz", "hausrat", "unfall", "berufsunfähigkeit",
      "lebensversicherung", "rentenversicherung", "kfz-versicherung",
    ],
    namePatterns: [
      "allianz", "huk-coburg", "huk24", "ergo", "axa", "debeka", "signal iduna",
      "generali", "zurich", "gothaer", "lvm", "r+v", "provinzial", "devk",
      "hdi", "württembergische", "alte leipziger", "cosmosdirekt", "getsafe",
      "friday", "clark", "check24", "friendsurance", "wgv", "barmenia",
    ],
  },
  {
    kategorie: "Strom & Gas & Wasser",
    direction: "ausgabe",
    keywords: [
      "strom", "stadtwerke", "energieversorgung", "energieversorger",
      "gas", "wasser", "abwasser", "ökostrom", "naturstrom", "fernwärme",
    ],
    namePatterns: [
      "stadtwerke", "eon", "e.on", "vattenfall", "enercity", "ewe", "mainova",
      "lichtblick", "ökostrom", "naturstrom", "e wie einfach", "yello",
      "eprimo", "rwe", "innogy", "envia", "swm", "gasag", "mainz-gas",
      "lekker", "verivox", "tibber",
    ],
  },
  {
    kategorie: "Telekommunikation",
    direction: "ausgabe",
    keywords: [
      "telekom", "mobilfunk", "internet", "dsl", "glasfaser", "festnetz",
      "telefon", "handyvertrag", "tarif", "datenvolumen",
    ],
    namePatterns: [
      "telekom", "vodafone", "o2", "telefonica", "1und1", "1&1", "congstar",
      "freenet", "aldi talk", "lidl connect", "fonic", "lebara", "lyca",
      "klarmobil", "simyo", "blau", "drillisch", "base", "winsim",
      "smartmobil", "premiumsim", "magenta",
    ],
  },
  {
    kategorie: "Lebensmittel",
    direction: "ausgabe",
    keywords: [
      "supermarkt", "lebensmittel", "wocheneinkauf", "einkauf bio",
      "bio company", "bio markt", "naturkost",
    ],
    namePatterns: [
      "edeka", "rewe", "aldi", "lidl", "penny", "netto", "kaufland", "real",
      "norma", "denns", "alnatura", "tegut", "marktkauf", "hit markt",
      "basic ag", "bio company", "bio markt", "rossmann", "dm-drogerie",
      "dm drogerie", "müller drogerie", "müller markt", "drogerie",
      "globus", "selgros", "metro", "famila", "combi", "feneberg",
    ],
  },
  {
    kategorie: "Restaurant & Lieferung",
    direction: "ausgabe",
    keywords: [
      "restaurant", "gastro", "bistro", "imbiss", "pizza", "café", "cafe",
      "bäckerei", "baeckerei", "konditorei", "metzgerei", "lieferung",
      "delivery", "abendessen", "mittagessen", "frühstück", "bar ",
    ],
    namePatterns: [
      "lieferando", "uber eats", "ubereats", "wolt", "foodora", "lieferheld",
      "mcdonald", "burger king", "subway", "kfc", "dominos", "domino's",
      "vapiano", "pizza hut", "nordsee", "ditsch", "backwerk", "kamps",
      "starbucks", "tim hortons", "coffee fellows", "balzac", "san francisco",
      "hellofresh", "marley spoon", "kochhaus", "kochabo", "dean & david",
      "block house", "block haus", "vapiano", "l'osteria", "losteria",
    ],
  },
  {
    kategorie: "Transport & Mobilität",
    direction: "ausgabe",
    keywords: [
      "tankstelle", "tanken", "kraftstoff", "benzin", "diesel", "carsharing",
      "kfz", "werkstatt", "tüv", "dekra", "öpnv", "verkehrsverbund",
      "monatskarte", "jahresticket", "deutschland-ticket", "deutschlandticket",
      "parkhaus", "parkschein", "parking", "parkster", "easypark",
      "leasing", "leasingrate", "autohaus",
    ],
    namePatterns: [
      "aral", "shell", "total", "jet ", "esso", "agip", "omv", "bp ",
      "hem", "sb-tank", "freie tankstelle",
      "deutsche bahn", "db vertrieb", "db fernverkehr", "db navigator",
      "bvg", "hvv", "mvv", "kvb", "vrr", "vrn", "vbb", "rmv", "vvs",
      "flixbus", "flixtrain", "blablacar", "freenow", "mytaxi", "uber",
      "miles", "share now", "sharenow", "weshare", "we share", "sixt share",
      "cambio", "stadtmobil", "drive now", "free now",
      "sixt", "europcar", "hertz", "avis", "buchbinder", "adac",
      "vw", "bmw", "mercedes", "audi", "kfz-zulassung",
    ],
  },
  {
    kategorie: "Abonnements & Streaming",
    direction: "ausgabe",
    keywords: [
      "abo ", "abonnement", "subscription", "monatsbeitrag", "jahresbeitrag",
      "streaming", "premium", "plus member", "membership",
    ],
    namePatterns: [
      "netflix", "spotify", "amazon prime", "amazon music", "disney",
      "apple.com", "apple music", "apple tv", "icloud", "apple one",
      "youtube", "google one", "google storage", "dropbox", "microsoft 365",
      "office 365", "github", "gitlab", "jetbrains", "notion", "evernote",
      "todoist", "slack", "zoom", "calendly", "vimeo", "twitch", "patreon",
      "substack", "medium", "masterclass", "audible", "kindle", "scribd",
      "dazn", "sky ", "magenta tv", "magentatv", "joyn", "rtl+", "prosieben",
      "wow", "waipu", "zattoo", "deezer", "tidal", "soundcloud",
      "hbo", "paramount", "mubi", "wakanim", "crunchyroll",
    ],
  },
  {
    kategorie: "Shopping & Konsum",
    direction: "ausgabe",
    keywords: [
      "online-shop", "online shop", "bestellung", "rechnung", "kauf auf",
    ],
    namePatterns: [
      "amazon", "zalando", "otto", "ebay", "paypal", "klarna", "afterpay",
      "mediamarkt", "media markt", "saturn", "conrad", "gravis", "alternate",
      "mindfactory", "notebooksbilliger", "cyberport", "ikea", "höffner",
      "xxxlutz", "poco", "mömax", "roller", "porta",
      "h&m", "hm.com", "zara", "uniqlo", "primark", "kik", "c&a", "esprit",
      "s.oliver", "tom tailor", "tk maxx", "tkmaxx", "deichmann", "görtz",
      "peek & cloppenburg", "peek und cloppenburg", "p&c", "breuninger",
      "manor", "galeria", "kaufhof", "karstadt",
      "thalia", "hugendubel", "buecher.de", "bücher.de", "buch.de", "weltbild",
      "douglas", "parfumdreams", "flaconi", "lush", "body shop", "etsy",
      "vinted", "kleinanzeigen", "momox", "rebuy", "idealo", "asos",
      "about you", "aboutyou", "bonprix", "myth", "mytoys", "snipes",
      "footlocker", "foot locker", "decathlon", "intersport", "sportscheck",
      "jack wolfskin", "north face", "patagonia", "bauhaus", "obi",
      "hornbach", "hagebau", "toom", "globus baumarkt",
    ],
  },
  {
    kategorie: "Gesundheit",
    direction: "ausgabe",
    keywords: [
      "apotheke", "arzt", "ärzt", "praxis", "krankenhaus", "klinik", "zahnarzt",
      "optiker", "labor", "therapie", "physiotherapie", "ergotherapie",
      "heilpraktiker", "gesundheit", "medikamente", "rezept", "brille",
      "hörgeräte", "hilfsmittel",
    ],
    namePatterns: [
      "apotheke", "doc morris", "docmorris", "shop apotheke", "shop-apotheke",
      "fielmann", "mister spex", "misterspex", "brillen.de", "apollo optik",
      "sanitätshaus", "kkh", "tk krankenkasse", "aok", "dak", "barmer",
      "ikk", "knappschaft", "hkk", "siemens-bkk", "techniker",
    ],
  },
  {
    kategorie: "Fitness & Sport",
    direction: "ausgabe",
    keywords: [
      "fitness", "gym", "sport", "fitnessstudio", "schwimmbad", "schwimmbäder",
      "yoga", "pilates", "crossfit", "kletterhalle", "boulderhalle",
      "vereinsbeitrag", "sportverein",
    ],
    namePatterns: [
      "mcfit", "fitness first", "fitnessfirst", "urban sports", "urbansports",
      "john reed", "fit star", "fitx", "easyfitness", "kieser training",
      "kieser", "premium fitness", "clever fit", "cleverfit", "ai-fitness",
      "ai fitness", "body+soul", "tigerlilly",
    ],
  },
  {
    kategorie: "Bildung",
    direction: "ausgabe",
    keywords: [
      "universität", "uni ", "hochschule", "fachhochschule", "studiengebühr",
      "semesterbeitrag", "kursgebühr", "vhs", "volkshochschule",
      "weiterbildung", "fortbildung", "seminar", "workshop", "schulgebühr",
      "schulgeld", "kita", "kindergarten", "betreuungskosten",
    ],
    namePatterns: [
      "udemy", "coursera", "linkedin learning", "skillshare", "edx", "udacity",
      "babbel", "duolingo", "rosetta stone", "busuu",
    ],
  },
  {
    kategorie: "Reisen & Urlaub",
    direction: "ausgabe",
    keywords: [
      "hotel", "hostel", "pension", "fewo", "ferienwohnung", "ferienhaus",
      "übernachtung", "flug", "flugticket", "reise", "urlaub", "reisebüro",
      "kreuzfahrt", "rundreise", "buchung", "auslandskrankenversicherung",
    ],
    namePatterns: [
      "booking.com", "booking com", "airbnb", "expedia", "hrs ", "trivago",
      "hotels.com", "agoda", "kayak", "skyscanner", "opodo", "ebookers",
      "lufthansa", "ryanair", "easyjet", "eurowings", "condor", "wizz air",
      "wizzair", "tuifly", "british airways", "klm", "air france",
      "tui ", "tui deutschland", "neckermann", "dertour", "fti", "alltours",
      "schauinsland", "lmx", "olimar", "vtours", "rewe reisen",
      "deutsche bahn touristik", "centerparcs", "center parcs",
    ],
  },
  {
    kategorie: "Steuern & Abgaben",
    direction: "ausgabe",
    keywords: [
      "finanzamt", "steuer", "einkommensteuer", "umsatzsteuer", "gewerbesteuer",
      "kfz-steuer", "kraftfahrzeugsteuer", "gez", "rundfunkbeitrag",
      "ihk-beitrag", "kammerbeitrag", "kirchensteuer", "soli",
    ],
    namePatterns: [
      "finanzamt", "beitragsservice", "ard zdf", "ard-zdf", "bundeskasse",
      "hauptzollamt", "zollamt", "ihk", "hwk",
    ],
  },
  {
    kategorie: "Sparen & Investieren",
    direction: "beide",
    keywords: [
      "sparplan", "depot", "etf", "wertpapier", "fondskauf", "fondsanteil",
      "investment", "anlage", "anleihe", "aktien", "dividende",
    ],
    namePatterns: [
      "trade republic", "traderepublic", "scalable capital", "scalable",
      "dkb broker", "comdirect depot", "consorsbank", "flatex", "degiro",
      "etoro", "smartbroker", "finanzen.net zero", "justtrade", "n26",
      "revolut", "blackrock", "vanguard", "ishares", "lyxor", "xtrackers",
      "amundi", "wisdomtree", "bitcoin", "crypto", "coinbase", "kraken",
      "bitpanda", "binance",
    ],
  },
  {
    kategorie: "Bank-Gebühren & Zinsen",
    direction: "beide",
    keywords: [
      "kontoführung", "kontoführungsentgelt", "kontoführungsgebühr",
      "jahresgebühr", "kartengebühr", "kreditkartengebühr", "kontogebühr",
      "sollzinsen", "dispozinsen", "habenzinsen", "überziehungszinsen",
      "mahngebühr", "rücklastschriftgebühr", "rücklastschrift",
      "auslandseinsatzentgelt", "fremdwährungsgebühr", "buchungsgebühr",
      "abschluss zinsen", "abschlussrechnung",
    ],
    namePatterns: [],
  },
  {
    kategorie: "Spenden",
    direction: "ausgabe",
    keywords: [
      "spende", "donation", "charity", "hilfsorganisation", "wohltätig",
      "kirchensteuer", "kirchgeld",
    ],
    namePatterns: [
      "oxfam", "unicef", "ärzte ohne grenzen", "aerzte ohne grenzen",
      "brot für die welt", "caritas", "diakonie", "drk", "rotes kreuz",
      "kindernothilfe", "welthungerhilfe", "misereor", "greenpeace", "wwf",
      "amnesty", "deutsche umwelthilfe", "bund ", "nabu",
    ],
  },
  {
    kategorie: "Familie & Kinder",
    direction: "beide",
    keywords: [
      "kindergeld", "elterngeld", "unterhalt", "spielzeug", "kinderbedarf",
      "schule", "schulgebühren", "hort", "tagesmutter", "jugendamt",
    ],
    namePatterns: [
      "mytoys", "toys r us", "toys'r'us", "smyths toys", "smyths", "babywalz",
      "baby walz", "ernsting's family", "ernstings family", "tausendkind",
      "windeln.de", "rofu", "lego",
    ],
  },
  {
    kategorie: "Haustier",
    direction: "ausgabe",
    keywords: [
      "tierarzt", "tierheim", "tierfutter", "haustier", "katzenfutter",
      "hundefutter",
    ],
    namePatterns: [
      "fressnapf", "futterhaus", "zooplus", "zoo plus", "zooroyal",
      "zoo royal", "dehner", "kölle zoo",
    ],
  },
  {
    kategorie: "Geschenke & Blumen",
    direction: "ausgabe",
    keywords: [
      "geschenk", "blumen", "blumenstrauß", "präsent",
    ],
    namePatterns: [
      "fleurop", "blume2000", "blume 2000", "valentins", "flora prima",
    ],
  },
  {
    kategorie: "Bargeld",
    direction: "beide",
    keywords: [
      "bargeldauszahlung", "geldautomat", "atm", "abhebung", "auszahlung am",
      "cash", "sb-bargeldauszahlung",
    ],
    namePatterns: [],
  },
  {
    kategorie: "Überweisung",
    direction: "beide",
    keywords: [
      "umbuchung", "übertrag", "dauerauftrag", "zahlungseingang",
      "ueberweisungseingang", "ueberweisungsausgang",
    ],
    namePatterns: [],
  },
];

export function categorizeTransaction(
  tx: Transaction,
  rules: CategoryRule[] = categoryRules
): string {
  const searchText = [
    tx.verwendungszweck,
    tx.nameZahlungsbeteiligter,
    tx.buchungstext,
  ]
    .join(" ")
    .toLowerCase();

  const counterpartyText = tx.nameZahlungsbeteiligter.toLowerCase();
  const txDirection = tx.betrag >= 0 ? "einnahme" : "ausgabe";

  for (const rule of rules) {
    if (rule.direction !== "beide" && rule.direction !== txDirection) continue;
    for (const keyword of rule.keywords) {
      if (!keyword) continue;
      if (searchText.includes(keyword.toLowerCase())) {
        return rule.kategorie;
      }
    }
    for (const pattern of rule.namePatterns) {
      if (!pattern) continue;
      const p = pattern.toLowerCase();
      if (counterpartyText.includes(p) || searchText.includes(p)) {
        return rule.kategorie;
      }
    }
  }

  if (tx.betrag > 0) return "Sonstige Einnahmen";
  return "Sonstiges";
}
