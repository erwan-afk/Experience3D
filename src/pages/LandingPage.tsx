import { Link, useNavigate } from "react-router-dom";
import { LiquidButton } from "@/components/ui/liquid-glass-button";

/**
 * Landing page de l'expérience GENESIS
 * SEO-friendly avec structure sémantique HTML5
 */
export function LandingPage() {
  const navigate = useNavigate();

  const handleEnter = () => {
    navigate("/experience");
  };

  return (
    <div className="min-h-screen bg-black text-white font-sans">
      {/* Header - Fixed avec blur progressif */}
      <header className="fixed top-0 left-0 w-full z-50">
        {/* Background gradient */}
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(to bottom, rgba(0,0,0) 0%, rgba(0,0,0,0.5) 73%, rgba(0,0,0,0) 100%)",
          }}
        />
        {/* Progressive blur effect */}
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
            to="/projet"
            className="text-sm font-normal uppercase tracking-wider transition-all relative group"
          >
            Le projet
            <span className="absolute left-0 bottom-0 w-0 h-px bg-white transition-all duration-300 group-hover:w-full" />
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
            <LiquidButton
              size="lg"
              className="gap-2"
              aria-label="Entrer dans l'expérience"
            >
              <span className="text-sm font-normal uppercase tracking-wider px-2">
                Entrer
              </span>
            </LiquidButton>
          </Link>
        </nav>
      </header>

      <main>
        {/* Hero Section - 100vh avec header fixe et badge en bas */}
        <section className="relative h-screen flex flex-col">
          <h1 className="sr-only">ECHOOES - Expérience Immersive</h1>

          {/* Vidéo Hero - 100vh - header (74px) - badge (76px) */}
          <div
            className="relative flex items-end justify-center bg-black"
            style={{ height: "calc(100vh - 76px)" }}
          >
            <div className="relative inline-block">
              <video
                className="w-auto max-h-full"
                style={{ maxHeight: "calc(100vh - 76px)" }}
                autoPlay
                muted
                loop
                playsInline
                onLoadedMetadata={(e) => {
                  e.currentTarget.currentTime = 1.5;
                }}
                onTimeUpdate={(e) => {
                  if (e.currentTarget.currentTime < 1.5) {
                    e.currentTarget.currentTime = 1.5;
                  }
                }}
              >
                <source src="/landing/hero-echooes.mp4" type="video/mp4" />
              </video>
              {/* Overlay dégradé bas */}
              <div
                className="absolute inset-0 pointer-events-none"
                style={{
                  background:
                    "linear-gradient(to bottom, rgba(0,0,0,0) 0%, rgba(0,0,0,0.2) 50%, rgba(0,0,0,0.9) 82%, rgba(0,0,0,1) 100%)",
                }}
              />
              {/* Overlay dégradé gauche */}
              <div
                className="absolute inset-0 pointer-events-none"
                style={{
                  background:
                    "linear-gradient(to right, rgba(0,0,0,1) 0%, rgba(0,0,0,0) 30%)",
                }}
              />
              {/* Overlay dégradé droit */}
              <div
                className="absolute inset-0 pointer-events-none"
                style={{
                  background:
                    "linear-gradient(to left, rgba(0,0,0,1) 0%, rgba(0,0,0,0) 30%)",
                }}
              />
            </div>
          </div>

          {/* Badge Genesis Experience - 76px */}
          <div className="relative z-10 flex flex-col items-center h-[76px]">
            <img
              src="/landing/genesis-badge.svg"
              alt="Genesis Experience"
              className="h-full w-auto"
            />
          </div>
        </section>

        {/* Section principale - Titre + CTA avec cristaux */}
        <section className="relative min-h-[120vh] flex flex-col items-center justify-center px-4 py-20 overflow-hidden">
          {/* Cristal gauche */}
          <img
            src="/landing/crystal-left.png"
            alt=""
            className="absolute left-0 top-1/2 pointer-events-none crystal-size crystal-left"
            style={{
              filter: "drop-shadow(0 0 150px rgba(255, 98, 0, 0.4))",
            }}
          />

          {/* Cristal droit - même image flippée */}
          <img
            src="/landing/crystal-left.png"
            alt=""
            className="absolute right-0 top-1/2 pointer-events-none crystal-size crystal-right"
            style={{
              filter: "drop-shadow(0 0 150px rgba(255, 98, 0, 0.4))",
            }}
          />

          {/* Contenu central */}
          <div className="relative z-10 flex flex-col items-center gap-12 text-center">
            <h2 className="sr-only">
              Une odyssée sensorielle au coeur de la matière
            </h2>
            <img
              src="/landing/slogan.svg"
              alt="Une odyssée sensorielle au coeur de la matière"
              className="w-full h-auto slogan-size"
            />

            <Link to="/experience">
              <LiquidButton
                size="lg"
                className="gap-2"
                aria-label="Lancer l'expérience immersive"
              >
                <span className="text-sm font-normal uppercase tracking-wider px-2">
                  Lancer l'expérience
                </span>
              </LiquidButton>
            </Link>
          </div>
        </section>

        {/* Section GENESIS wordmark */}
        <section className="flex justify-center items-center px-8 lg:px-[181px] py-12">
          <img
            src="/landing/genesis-wordmark.svg"
            alt="GENESIS"
            className="w-full max-w-[1100px] h-auto"
          />
        </section>
      </main>

      {/* Footer */}
      <footer className="px-8 lg:px-[181px] py-12 text-center">
        <p className="text-sm font-normal uppercase tracking-wider text-neutral-400">
          2026 © Erwan Thibaud. Tous droits réservés.
        </p>
      </footer>
    </div>
  );
}
