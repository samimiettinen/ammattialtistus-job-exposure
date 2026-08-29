import { getTranslations } from "next-intl/server";
import { loadCatalog } from "@/lib/catalog";

export default async function MethodologyPage() {
  const t = await getTranslations();
  const catalog = loadCatalog();
  const p = catalog.provenance;

  return (
    <article className="prose prose-slate max-w-3xl">
      <h1 className="font-serif text-3xl text-[#0b3f3c]">{t("methodology.title")}</h1>
      <p className="text-lg">{t("methodology.lead")}</p>
      <p className="rounded border border-[#e6d3b8] bg-[#f8ead6] px-3 py-2 font-semibold text-[#8a4b12]">
        {t("notice")}
      </p>

      <h2>Mitä tämä työkalu näyttää</h2>
      <p>
        Ammattialtistus kuvaa Ammattiluokitus 2010 -ammattien teoreettista tekoälyaltistusta,
        havaittua käyttöönottoa ja työmarkkinoiden kohtaantoa. Altistus on arvio tehtävien
        luonteesta. Se ei ole ennuste irtisanomisista, automatisaatiosta tai ammatin
        katoamisesta.
      </p>

      <h2>Viralliset lähteet (haettu {catalog.retrievedAt})</h2>
      <ul>
        <li>
          Ammattiluokitus 2010, <code>{p.classification.localId}</code>, {p.classification.itemCount}{" "}
          luokkaa.{" "}
          <a href={p.classification.url}>{p.classification.url}</a>
        </li>
        <li>
          Tilastokeskus, työssäkäynti, taulu {p.employment.tableId}, vuosi {p.employment.year},
          päivitetty {p.employment.updated ?? "ei tiedossa"}.{" "}
          <a href={p.employment.url}>{p.employment.url}</a>
        </li>
        <li>
          Työvoimabarometri (KEHA), kohtaantojakso {p.outlook.period}, {p.outlook.occupationCount}{" "}
          ammattia. {p.outlook.aggregation}{" "}
          <a href={p.outlook.catalogUrl}>{p.outlook.catalogUrl}</a>
        </li>
      </ul>
      <p>
        Koko kartoitus ja kenttäkohtaiset skeemat: <code>docs/SOURCE_DATA_MAPPING.md</code>.
      </p>

      <h2>Mitä ei ole viranomaisaineistoa</h2>
      <p>
        Tekoälyaltistus- ja käyttöönottopisteet eivät ole Tilastokeskuksen, KEHA-keskuksen tai
        TEM:n tilastoja. Ilman rajapinta-avainta näytetään vain merkitty esimerkkijoukko
        (<code>fixture/2026-08-29</code>). Muut ammatit näkyvät pisteyttämättöminä. Pisteytys
        ajetaan vain offline-pipelineissa, ei selaimessa eikä Next.js-rajapinnassa.
      </p>

      <h2>Työmarkkinanäkymän kooste</h2>
      <p>
        Työvoimabarometrin julkinen JSON palauttaa kohtaannon 19 maakunnalle, ei yhtä
        valtakunnallista ammattikohtaista indeksiä. Näytetty kansallinen tila on työllisten
        (<code>toissa</code>) mukaan painotettu enemmistö alueiden <code>kohtaantotila</code>
        -kentästä. Indeksi on painotettu keskiarvo etumerkillisestä <code>kohtaantoaste</code>
        -luvusta (pula positiivinen, ylitarjonta negatiivinen). Tämä on dokumentoitu johdannainen,
        ei KEHA:n julkaisema valtakunnallinen tunnusluku.
      </p>

      <h2>Vanhat ja puuttuvat tiedot</h2>
      <p>
        Työssäkäyntitilaston tuorein vuosi tässä poiminnassa on 2023, joten työllisyys merkitään
        vanhentuneeksi vuonna 2026. Jos AML-koodia ei ole barometrissa tai työllisyystaulussa,
        kenttä näytetään puuttuvana. Pisteyttämättömät ammatit eivät saa keksittyä lukua.
      </p>

      <h2>Saavutettavuus ja kieli</h2>
      <p>
        Oletuskieli on suomi. Ruotsi ja englanti käyttävät Tilastokeskuksen luokitusnimiä.
        Viralliset kuvaukset ovat pääosin suomeksi. Käyttöliittymä on näppäimistöllä
        käytettävä; vähentynyt liike kytkee kaavioanimaatiot pois.
      </p>
    </article>
  );
}
