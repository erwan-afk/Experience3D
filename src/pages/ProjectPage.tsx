import { Link } from "react-router-dom";
import { LiquidButton } from "@/components/ui/liquid-glass-button";

/**
 * Page de présentation du projet GENESIS
 */
export function ProjectPage() {
  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <header className="fixed top-0 left-0 w-full z-50">
        <div className="progressive-blur-container">
          <div></div>
          <div></div>
          <div></div>
          <div></div>
          <div></div>
          <div></div>
          <div></div>
          <div></div>
        </div>
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(to bottom, rgba(0,0,0,0.5) 0%, rgba(0,0,0,0.25) 73%, rgba(0,0,0,0) 100%)",
          }}
        />
        <nav
          className="max-w-7xl mx-auto relative z-10"
          style={{
            display: "flex",
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "30px 60px",
          }}
        >
          <Link
            to="/"
            className="text-sm font-normal uppercase tracking-wider hover:opacity-70 transition-opacity flex items-center gap-2"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 16 16"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M10 12L6 8L10 4"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            Retour
          </Link>

          <Link to="/">
            <img
              src="/landing/logo-echooes.svg"
              alt="ECHOOES"
              style={{
                height: "14px",
                width: "auto",
                position: "absolute",
                left: "50%",
                transform: "translateX(-50%)",
              }}
            />
          </Link>

          <Link to="/experience">
            <LiquidButton size="lg" className="gap-2">
              <span className="text-sm font-normal uppercase tracking-wider px-2">
                Entrer
              </span>
            </LiquidButton>
          </Link>
        </nav>
      </header>

      {/* Hero */}
      <section className="pt-32 pb-20 px-[60px]">
        <div className="max-w-4xl mx-auto text-center">
          <p className="text-sm uppercase tracking-widest text-white/60 mb-4">
            Agence ECHOOES
          </p>
          <h1 className="font-sans text-5xl md:text-7xl uppercase font-semibold mb-6">
            Genesis
          </h1>
          <p className="text-lg text-white/70 max-w-2xl mx-auto">
            Une odyssée sensorielle au coeur de la matière
          </p>
        </div>
      </section>

      {/* Navigation du plan */}
      <section className="py-12 border-y border-white/10 px-[60px]">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-xs uppercase tracking-widest text-white/40 mb-6">
            Plan
          </h2>
          <nav className="flex flex-wrap gap-x-8 gap-y-3">
            {[
              "Contexte",
              "État des lieux",
              "Enjeux",
              "Stratégie",
              "Conclusion",
            ].map((item) => (
              <a
                key={item}
                href={`#${item.toLowerCase().replace(/\s+/g, "-").replace(/é/g, "e")}`}
                className="text-sm text-white/60 hover:text-white transition-colors"
              >
                {item}
              </a>
            ))}
          </nav>
        </div>
      </section>

      {/* Contenu principal */}
      <main className="py-20 px-[60px]">
        <div className="max-w-4xl mx-auto space-y-24">
          {/* Contexte */}
          <Section id="contexte" title="Contexte">
            <Subsection title="L'agence">
              <p>
                ECHOES est une agence multimédia créative née de la
                collaboration de quatre étudiants de l'UQAT, à Rouyn-Noranda.
                Fondée dans le cadre d'un projet de fin d'études, elle résulte
                d'une passion commune pour l'art, la science et l'innovation
                interactive.
              </p>
              <p>
                Le nom ECHOES évoque la résonance du temps, la manière dont les
                éléments se transforment et interagissent à travers les âges.
                Notre premier projet, GENESIS, est une odyssée sensorielle qui
                révèle la poésie de la matière. En mêlant images, sons et
                interactivité, nous transformons l'histoire des minerais en une
                expérience immersive où science et art ne font qu'un.
              </p>
            </Subsection>

            <Subsection title="Le projet">
              <p>
                GENESIS plonge le spectateur dans un voyage à travers le temps,
                explorant notre vision artistique des origines cosmiques de la
                matière jusqu'à la formation des minerais. Cette installation
                multimédia déploie une expérience sur trois écrans, créant un
                environnement immersif à 180 degrés. Les visiteurs ne sont pas
                de simples observateurs mais ils sont aussi acteurs de cette
                exploration grâce à des moments d'interactivité qui leur
                permettent de dialoguer avec l'œuvre.
              </p>
              <p>
                L'expérience fusionne projections visuelles, design sonore
                enveloppant et interactions intuitives. Notre vision artistique
                transforme les processus géologiques en une chorégraphie
                visuelle captivante, invitant le public à redécouvrir l'histoire
                de la création des minerais sous un angle poétique et sensoriel.
              </p>
            </Subsection>
          </Section>

          {/* État des lieux */}
          <Section id="etat-des-lieux" title="État des lieux">
            <p className="text-white/60 mb-8">
              Afin d'évaluer le potentiel et les défis liés à notre projet
              GENESIS, nous avons identifié ses forces, ses faiblesses ainsi que
              les menaces à anticiper.
            </p>

            <Subsection title="Les forces du projet">
              <ul className="space-y-3">
                <li className="flex gap-3">
                  <span className="text-amber-500">+</span>
                  <span>
                    La combinaison de projections visuelles, de design sonore et
                    interactivité capte facilement l'attention d'un public jeune
                    en quête de découvertes artistiques innovantes.
                  </span>
                </li>
                <li className="flex gap-3">
                  <span className="text-amber-500">+</span>
                  <span>
                    La durée limitée de l'expérience permet un fort roulement de
                    visiteurs et facilite l'engagement du public.
                  </span>
                </li>
                <li className="flex gap-3">
                  <span className="text-amber-500">+</span>
                  <span>
                    L'inspiration tirée des mines résonne particulièrement avec
                    la population locale, tout en s'inscrivant dans un récit
                    plus large sur l'évolution de la matière.
                  </span>
                </li>
              </ul>
            </Subsection>

            <Subsection title="Les faiblesses du projet">
              <ul className="space-y-3">
                <li className="flex gap-3">
                  <span className="text-red-400">-</span>
                  <span>
                    L'installation se trouve au studio MOCAP, situé au sous-sol
                    de l'UQAT, ce qui limite sa visibilité.
                  </span>
                </li>
                <li className="flex gap-3">
                  <span className="text-red-400">-</span>
                  <span>
                    L'espace ne peut accueillir que trois personnes à la fois,
                    ce qui peut engendrer des files d'attente.
                  </span>
                </li>
                <li className="flex gap-3">
                  <span className="text-red-400">-</span>
                  <span>
                    Le bon fonctionnement repose sur du matériel audiovisuel et
                    interactif, ce qui peut poser des défis techniques.
                  </span>
                </li>
              </ul>
            </Subsection>
          </Section>

          {/* Enjeux */}
          <Section id="enjeux" title="Enjeux">
            <Subsection title="Les enjeux du projet">
              <p>
                L'un des principaux défis de GENESIS repose sur sa visibilité et
                son accessibilité. Bien que l'expérience immersive soit conçue
                pour captiver un public curieux, son emplacement au studio
                MOCAP, en sous-sol de l'UQAT, limite les visites spontanées. De
                plus, la capacité restreinte de l'espace pose un défi logistique
                en termes de gestion du flux de visiteurs.
              </p>
            </Subsection>

            <Subsection title="Objectifs de la communication">
              <p>
                Notre stratégie de communication a pour objectif principal de
                capter l'attention des étudiants et intervenants de l'UQAT. Nous
                souhaitons nous distinguer par une approche visuelle percutante
                et intrigante qui suscite la curiosité. Le but est de maximiser
                la visibilité du projet, malgré son emplacement peu accessible.
              </p>
            </Subsection>
          </Section>

          {/* Stratégie */}
          <Section id="strategie" title="Stratégie de Communication">
            <Subsection title="Plateforme de réservation en ligne">
              <p>
                Afin de faciliter la gestion du flux de visiteurs et d'éviter
                des attentes imprévues, nous utilisons un système de réservation
                en ligne. Ce système permet aux visiteurs de réserver leur
                créneau horaire à l'avance, garantissant ainsi un accès direct à
                l'expérience sans temps d'attente.
              </p>
            </Subsection>

            <Subsection title="Supports physiques et visuels">
              <p>
                Pour capter l'attention de notre public, nous avons choisi de
                privilégier des supports visuels percutants. Nous avons imaginé
                la réalisation d'un mapping vidéo qui diffuserait en continu une
                sorte de teaser sur notre expérience. Cette animation serait à
                la fois intrigante et informative.
              </p>
              <p>
                En complément, nous utilisons une communication plus
                traditionnelle avec des flyers contenant un visuel lié à notre
                expérience et un QR code permettant une réservation rapide.
              </p>
            </Subsection>

            <Subsection title="Guidage des visiteurs">
              <p>
                Le dernier point concerne le guidage des utilisateurs vers
                l'expérience. Nous avons prévu de mettre en place une
                signalétique claire et intuitive pour guider efficacement les
                visiteurs avec des visuels cohérents et des indications
                directionnelles.
              </p>
            </Subsection>
          </Section>

          {/* Conclusion */}
          <Section id="conclusion" title="Conclusion">
            <p>
              GENESIS, créé par l'agence ECHOES, propose une expérience
              immersive mêlant art et science autour de notre vision de
              l'histoire des minerais. Notre plan de communication répond aux
              défis pratiques de l'installation, située au studio MOCAP de
              l'UQAT, avec une capacité d'accueil limitée.
            </p>
            <p>
              La stratégie développée s'articule autour de plusieurs axes
              complémentaires : plateforme de réservation en ligne, mapping
              vidéo innovant et supports physiques soigneusement conçus. GENESIS
              se positionne ainsi comme une expérience unique où la technologie
              se met au service de l'art pour raconter une histoire sous un
              angle artistique.
            </p>
          </Section>
        </div>
      </main>

      {/* CTA Final */}
      <section className="py-20 px-[60px] border-t border-white/10">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="font-sans text-3xl md:text-4xl italic mb-8">
            Prêt à vivre l'expérience ?
          </h2>
          <Link to="/experience">
            <LiquidButton size="lg" className="gap-2">
              <span className="text-sm font-normal uppercase tracking-wider">
                Lancer l'expérience
              </span>
            </LiquidButton>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="px-[60px] py-12 text-center border-t border-white/10">
        <p className="text-xs font-normal uppercase tracking-wider text-neutral-400">
          2026 © Erwan Thibaud. Tous droits réservés.
        </p>
      </footer>
    </div>
  );
}

/* Composants de section */
function Section({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-32">
      <h2 className="text-2xl font-sans italic mb-8 pb-4 border-b border-white/10">
        {title}
      </h2>
      <div className="space-y-8">{children}</div>
    </section>
  );
}

function Subsection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-medium text-white/90">{title}</h3>
      <div className="text-white/60 space-y-4 leading-relaxed">{children}</div>
    </div>
  );
}
