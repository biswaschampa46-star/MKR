import Reveal from "@/components/Reveal";
import HeroAiChat from "@/components/HeroAiChat";

export default function Intro() {
  return (
    <section className="relative py-24 md:py-40" aria-label="Philosophy">
      <div className="mx-auto max-w-[1400px] px-6 md:px-10">
        <Reveal>
          <p className="label">Our Philosophy</p>
        </Reveal>

        <Reveal delay={90}>
          <h2 className="display-2 mt-8 flex flex-wrap items-center gap-x-6 gap-y-4 max-w-5xl text-foam">
            <span className="lm lm-io"><span>Designed for</span></span>
            <span className="lm lm-io"><span className="text-stroke">the way you live.</span></span>
          </h2>
        </Reveal>

        <div className="mt-14 grid gap-8 md:grid-cols-12">
          <Reveal delay={160} className="md:col-span-5 md:col-start-8">
            <div className="hairline mb-8 w-24" aria-hidden="true" />
            <p className="body-lead">
              We keep the catalogue small on purpose. Every piece here was
              chosen slowly — for how it feels on, how it ages with wear,
              and how quietly it fits into your day.
            </p>
            <p className="mt-6 text-sm leading-relaxed text-mist/70">
              No noise. No clutter. Just things worth keeping.
            </p>
          </Reveal>
        </div>

        {/* premium inline AI stylist — fills the former dead space before Featured Products */}
        <HeroAiChat />
      </div>
    </section>
  );
}
