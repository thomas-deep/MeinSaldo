/**
 * Befüllt eine Demo-Datenbank mit synthetischen, aber realistischen Daten —
 * für Screenshots und damit neue Contributor die App gefüllt erleben.
 *
 * Voraussetzung: der Dev-Server läuft mit der Demo-DB:
 *   npm run dev:demo          (setzt FINANZEN_DB_PATH=data/demo.db)
 * Dann in einem zweiten Terminal:
 *   npm run seed:demo
 *
 * ALLE Daten hier sind frei erfunden — keine echten Personen, Konten, IBANs.
 */

const BASE = process.env.SEED_BASE_URL || "http://localhost:3000";

// ── deterministischer RNG (mulberry32), damit die Demo reproduzierbar ist ──
function rng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rand = rng(20260521);
const pick = (arr) => arr[Math.floor(rand() * arr.length)];
const between = (lo, hi) => Math.round((lo + rand() * (hi - lo)) * 100) / 100;
const round2 = (n) => Math.round(n * 100) / 100;

async function api(path, method, body) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: body ? { "content-type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`${method} ${path} → ${res.status}: ${text.slice(0, 200)}`);
  }
  return res.json();
}

async function waitForServer() {
  for (let i = 0; i < 60; i++) {
    try {
      const res = await fetch(`${BASE}/api/transactions`);
      if (res.ok) return;
    } catch {
      // noch nicht bereit
    }
    await new Promise((r) => setTimeout(r, 1000));
  }
  throw new Error(`Server unter ${BASE} nicht erreichbar — läuft 'npm run dev:demo'?`);
}

// ── Monatsliste: 2025-03 .. 2026-05 (15 Monate) ──────────────────────────
const MONTHS = [];
for (let y = 2025, m = 3; !(y === 2026 && m > 5); ) {
  MONTHS.push({ y, m });
  m++;
  if (m > 12) {
    m = 1;
    y++;
  }
}
const iso = (y, m, d) =>
  `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;

// ── Transaktions-Helfer ──────────────────────────────────────────────────
function tx(date, name, zweck, betrag, kategorie, buchungstext, iban) {
  return {
    date,
    name,
    zweck,
    betrag: round2(betrag),
    kategorie,
    buchungstext,
    counterIban: iban || "",
  };
}

/** Wandelt rohe Tx-Liste in API-Form, berechnet laufenden Saldo. */
function finalize(rawList, konto, startBalance) {
  const sorted = [...rawList].sort((a, b) => a.date.localeCompare(b.date));
  let balance = startBalance;
  return sorted.map((t) => {
    balance = round2(balance + t.betrag);
    return {
      id: "seed",
      kontoBezeichnung: konto.name,
      ibanKonto: konto.iban,
      buchungstag: t.date,
      valutadatum: t.date,
      nameZahlungsbeteiligter: t.name,
      ibanZahlungsbeteiligter: t.counterIban,
      buchungstext: t.buchungstext,
      verwendungszweck: t.zweck,
      betrag: t.betrag,
      waehrung: "EUR",
      saldoNachBuchung: balance,
      kategorie: t.kategorie,
    };
  });
}

const GROCERS = ["REWE Markt", "EDEKA Center", "ALDI SÜD", "Lidl", "Penny"];
const RESTAURANTS = [
  "Trattoria Bella",
  "Sushi Yama",
  "Café Central",
  "Burger Brothers",
  "Dönerhaus Anatolia",
];
const FUEL = ["Aral Tankstelle", "Shell Station", "Total Energies"];

// ── Konto: Privat / Giro ─────────────────────────────────────────────────
function genGiro() {
  const list = [];
  MONTHS.forEach(({ y, m }, idx) => {
    list.push(tx(iso(y, m, 1), "Hausverwaltung Nord", `Miete ${m}/${y}`, -1150, "Miete & Wohnen", "Dauerauftrag"));
    list.push(tx(iso(y, m, 2), "FitClub GmbH", "Mitgliedsbeitrag", -39.9, "Fitness & Sport", "Lastschrift"));
    list.push(tx(iso(y, m, 5), "Stadtwerke Musterstadt", `Abschlag Strom ${m}/${y}`, -88, "Strom & Gas & Wasser", "Lastschrift"));
    // Streaming mit Preiserhöhung ab November 2025
    const streamPrice = y > 2025 || (y === 2025 && m >= 11) ? -12.99 : -9.99;
    list.push(tx(iso(y, m, 12), "Streamflix", "Streaming-Abo", streamPrice, "Abonnements & Streaming", "Lastschrift"));
    list.push(tx(iso(y, m, 15), "Telefon Plus", "Mobilfunk", -29.99, "Telekommunikation", "Lastschrift"));
    list.push(tx(iso(y, m, 28), "Muster AG", `Gehalt ${m}/${y}`, 3180, "Gehalt & Einkommen", "Gehalt/Rente/Lohn"));
    if (m % 3 === 1) {
      list.push(tx(iso(y, m, 10), "KFZ-Versicherung Allsecure", "Quartalsbeitrag", -94.5, "Versicherungen", "Lastschrift"));
    }
    // Lebensmittel
    const groceryCount = 3 + Math.floor(rand() * 2);
    for (let i = 0; i < groceryCount; i++) {
      list.push(tx(iso(y, m, 3 + Math.floor(rand() * 24)), pick(GROCERS), "Einkauf", -between(24, 96), "Lebensmittel", "Kartenzahlung"));
    }
    // Restaurant
    for (let i = 0; i < 1 + Math.floor(rand() * 2); i++) {
      list.push(tx(iso(y, m, 6 + Math.floor(rand() * 20)), pick(RESTAURANTS), "Bewirtung", -between(18, 58), "Restaurant & Lieferung", "Kartenzahlung"));
    }
    list.push(tx(iso(y, m, 8 + Math.floor(rand() * 16)), "Amazon EU", "Online-Bestellung", -between(15, 120), "Shopping & Konsum", "Kartenzahlung"));
    list.push(tx(iso(y, m, 7 + Math.floor(rand() * 18)), pick(FUEL), "Tanken", -between(52, 86), "Transport & Mobilität", "Kartenzahlung"));
    list.push(tx(iso(y, m, 9 + Math.floor(rand() * 12)), "Geldautomat Sparkasse", "Bargeldauszahlung", -100, "Bargeld", "Bargeldauszahlung"));
    // Sparen-Transfer (Umbuchung)
    list.push(tx(iso(y, m, 27), "Sparen Tagesgeld", "Sparrate", -400, "Überweisung", "Überweisung"));
    // Kreditkarten-Ausgleich (Umbuchung)
    const visaSettle = 180 + Math.floor(rand() * 220);
    list.push(tx(iso(y, m, 20), "Kreditkarte Ausgleich", "Visa-Abrechnung", -visaSettle, "Überweisung", "Überweisung"));
    list._visaSettle = list._visaSettle || {};
    list._visaSettle[`${y}-${m}`] = visaSettle;
    // Urlaub im Sommer 2025
    if (y === 2025 && (m === 7 || m === 8)) {
      list.push(tx(iso(y, m, 14), "Ferienhaus Ostsee", "Ferienunterkunft", -680, "Reisen & Urlaub", "Überweisung"));
      list.push(tx(iso(y, m, 13), "Deutsche Bahn", "Bahntickets", -118, "Transport & Mobilität", "Kartenzahlung"));
    }
    void idx;
  });
  return list;
}

// ── Konto: Privat / Tagesgeld ────────────────────────────────────────────
function genTagesgeld() {
  const list = [];
  MONTHS.forEach(({ y, m }) => {
    list.push(tx(iso(y, m, 27), "Sparen Tagesgeld", "Sparrate", 400, "Überweisung", "Überweisung"));
    if (m % 3 === 0) {
      list.push(tx(iso(y, m, 30), "Zinsen", "Zinsgutschrift", between(9, 24), "Bank-Gebühren & Zinsen", "Zinsgutschrift"));
    }
  });
  return list;
}

// ── Konto: Privat / Visa ─────────────────────────────────────────────────
const ONLINE_SHOPS = [
  ["Zalando", "Shopping & Konsum"],
  ["Spotify", "Abonnements & Streaming"],
  ["Steam Games", "Shopping & Konsum"],
  ["Lieferando", "Restaurant & Lieferung"],
  ["Apple Services", "Abonnements & Streaming"],
  ["IKEA Online", "Shopping & Konsum"],
];
function genVisa(visaSettleByMonth) {
  const list = [];
  MONTHS.forEach(({ y, m }) => {
    const count = 3 + Math.floor(rand() * 3);
    for (let i = 0; i < count; i++) {
      const [shop, kat] = pick(ONLINE_SHOPS);
      list.push(tx(iso(y, m, 3 + Math.floor(rand() * 24)), shop, "Kreditkartenzahlung", -between(11, 95), kat, "Kreditkarte"));
    }
    const settle = visaSettleByMonth[`${y}-${m}`] || 250;
    list.push(tx(iso(y, m, 19), "Kreditkarte Ausgleich", "Ausgleich Girokonto", settle, "Überweisung", "Überweisung"));
  });
  return list;
}

// ── Konto: Gemeinsam / Haushalt ──────────────────────────────────────────
function genHaushalt() {
  const list = [];
  MONTHS.forEach(({ y, m }) => {
    list.push(tx(iso(y, m, 1), "Beitrag Privatkonto", "Haushaltsbeitrag", 600, "Überweisung", "Überweisung"));
    list.push(tx(iso(y, m, 1), "Beitrag Partnerkonto", "Haushaltsbeitrag", 600, "Überweisung", "Überweisung"));
    for (let i = 0; i < 3; i++) {
      list.push(tx(iso(y, m, 4 + Math.floor(rand() * 22)), pick(GROCERS), "Wocheneinkauf", -between(38, 112), "Lebensmittel", "Kartenzahlung"));
    }
    list.push(tx(iso(y, m, 6 + Math.floor(rand() * 18)), "dm Drogeriemarkt", "Drogerie", -between(18, 46), "Gesundheit", "Kartenzahlung"));
    // Renovierung im Frühjahr
    if ((y === 2025 && m >= 4 && m <= 6) || (y === 2026 && m === 3)) {
      list.push(tx(iso(y, m, 11), "Baumarkt Stark", "Renovierungsbedarf", -between(70, 260), "Shopping & Konsum", "Kartenzahlung"));
    }
  });
  return list;
}

// ── Konto: Firma / Geschäftskonto ────────────────────────────────────────
function genFirma() {
  const list = [];
  MONTHS.forEach(({ y, m }) => {
    list.push(tx(iso(y, m, 14), "Kunde ProjektWerk", `Ausgangsrechnung ${m}/${y}`, between(1900, 3600), "Zahlung Ausgangsrechnung", "Überweisung"));
    list.push(tx(iso(y, m, 4), "Cloud Software Abo", "SaaS-Lizenz", -49, "Abonnements & Streaming", "Lastschrift"));
    list.push(tx(iso(y, m, 8), "Hosting Provider", "Server-Hosting", -19.99, "Telekommunikation", "Lastschrift"));
    if (m % 3 === 2) {
      list.push(tx(iso(y, m, 10), "Finanzamt", "Steuervorauszahlung", -between(820, 1380), "Steuern & Abgaben", "Überweisung"));
    }
  });
  return list;
}

async function main() {
  console.log(`Warte auf Server unter ${BASE} …`);
  await waitForServer();

  const existing = await api("/api/transactions", "GET");
  if (existing.transactions.length > 0) {
    console.log(
      `⚠ Demo-DB enthält bereits ${existing.transactions.length} Buchungen — Seed abgebrochen.\n` +
        `  Für einen frischen Lauf data/demo.db löschen und dev:demo neu starten.`
    );
    return;
  }

  console.log("Lege Inhaber an …");
  const privat = (await api("/api/inhaber", "POST", { name: "Privat", type: "privat", color: "#3b82f6" })).inhaber;
  const gemeinsam = (await api("/api/inhaber", "POST", { name: "Gemeinsam", type: "gemeinsam", color: "#10b981" })).inhaber;
  const firma = (await api("/api/inhaber", "POST", { name: "Firma Beispiel", type: "firma", color: "#8b5cf6" })).inhaber;

  console.log("Lege Kontogruppen an …");
  const giro = (await api("/api/kontogruppen", "POST", { name: "Girokonto", inhaberId: privat.id, art: "girokonto", color: "#3b82f6", icon: "wallet", bank: "Volksbank" })).kontogruppe;
  const tagesgeld = (await api("/api/kontogruppen", "POST", { name: "Tagesgeld", inhaberId: privat.id, art: "sparkonto", color: "#10b981", icon: "piggybank", bank: "ING" })).kontogruppe;
  const visa = (await api("/api/kontogruppen", "POST", { name: "Visa Karte", inhaberId: privat.id, art: "kreditkarte", color: "#f59e0b", icon: "creditcard", bank: "American Express" })).kontogruppe;
  const haushalt = (await api("/api/kontogruppen", "POST", { name: "Haushaltskonto", inhaberId: gemeinsam.id, art: "girokonto", color: "#10b981", icon: "wallet", bank: "Sparkasse" })).kontogruppe;
  const geschaeft = (await api("/api/kontogruppen", "POST", { name: "Geschäftskonto", inhaberId: firma.id, art: "girokonto", color: "#8b5cf6", icon: "briefcase", bank: "Commerzbank" })).kontogruppe;

  const accounts = {
    giro: { name: "Girokonto", iban: "DE00100000000000000001" },
    tagesgeld: { name: "Tagesgeld", iban: "DE00100000000000000002" },
    visa: { name: "Visa Karte", iban: "" },
    haushalt: { name: "Haushaltskonto", iban: "DE00100000000000000004" },
    geschaeft: { name: "Geschäftskonto", iban: "DE00100000000000000005" },
  };

  console.log("Generiere Buchungen …");
  const giroRaw = genGiro();
  const visaSettle = giroRaw._visaSettle || {};
  const batches = [
    [giro.id, finalize(giroRaw, accounts.giro, 2400)],
    [tagesgeld.id, finalize(genTagesgeld(), accounts.tagesgeld, 8000)],
    [visa.id, finalize(genVisa(visaSettle), accounts.visa, 0)],
    [haushalt.id, finalize(genHaushalt(), accounts.haushalt, 1200)],
    [geschaeft.id, finalize(genFirma(), accounts.geschaeft, 5200)],
  ];

  let total = 0;
  for (const [kontogruppeId, transactions] of batches) {
    const r = await api("/api/transactions", "POST", { transactions, kontogruppeId });
    total += r.inserted;
    console.log(`  Konto ${kontogruppeId}: ${r.inserted} Buchungen`);
  }
  console.log(`${total} Buchungen gesamt.`);

  console.log("Lege Tags an und verknüpfe …");
  const tagUrlaub = (await api("/api/tags", "POST", { name: "urlaub-2025", color: "#3b82f6" })).tag;
  const tagReno = (await api("/api/tags", "POST", { name: "renovierung", color: "#f59e0b" })).tag;
  const tagArbeit = (await api("/api/tags", "POST", { name: "arbeit", color: "#8b5cf6" })).tag;

  const all = (await api("/api/transactions", "GET")).transactions;
  async function tagWhere(predicate, tagId, limit) {
    let n = 0;
    for (const t of all) {
      if (n >= limit) break;
      if (!predicate(t)) continue;
      await api(`/api/transactions/${encodeURIComponent(t.id)}/tags`, "PUT", {
        tagIds: [tagId],
      });
      n++;
    }
    return n;
  }
  const nUrlaub = await tagWhere(
    (t) => t.kategorie === "Reisen & Urlaub" || t.nameZahlungsbeteiligter === "Deutsche Bahn",
    tagUrlaub.id,
    6
  );
  const nReno = await tagWhere(
    (t) => t.nameZahlungsbeteiligter === "Baumarkt Stark",
    tagReno.id,
    8
  );
  const nArbeit = await tagWhere(
    (t) => t.nameZahlungsbeteiligter === "Cloud Software Abo",
    tagArbeit.id,
    6
  );
  console.log(`  Tags vergeben: urlaub-2025=${nUrlaub}, renovierung=${nReno}, arbeit=${nArbeit}`);

  console.log("Lege Vermögen & Verbindlichkeiten an …");
  async function entityWithHistory(kind, name, type, startVal, endVal, noise) {
    const path = kind === "asset" ? "assets" : "liabilities";
    const res = await api(`/api/${path}`, "POST", { name, kind: type });
    const id = (res.asset || res.liability).id;
    const n = MONTHS.length;
    for (let i = 0; i < n; i++) {
      const { y, m } = MONTHS[i];
      const frac = i / (n - 1);
      const base = startVal + (endVal - startVal) * frac;
      const wobble = (rand() - 0.5) * 2 * noise;
      const value = Math.max(0, round2(base + wobble));
      await api(`/api/${path}/${id}/snapshots`, "POST", {
        date: iso(y, m, 28),
        value,
      });
    }
  }
  // Vermögen
  await entityWithHistory("asset", "Eigentumswohnung", "Immobilie", 248000, 256000, 0);
  await entityWithHistory("asset", "Depot ETF-Welt", "Depot", 17500, 24200, 900);
  await entityWithHistory("asset", "Bausparvertrag", "Bausparen", 7800, 9600, 60);
  // Verbindlichkeiten
  await entityWithHistory("liability", "Immobilienkredit", "Hypothek", 188000, 179500, 0);
  await entityWithHistory("liability", "Autokredit", "Kredit", 11800, 6900, 0);

  console.log("\n✓ Demo-Datenbank befüllt. Viel Spaß beim Screenshotten.");
}

main().catch((e) => {
  console.error("Seed fehlgeschlagen:", e.message);
  process.exit(1);
});
