import Hero from "@/components/sections/Hero";
import Intro from "@/components/sections/Intro";
import Featured from "@/components/sections/Featured";
import NewArrivals from "@/components/sections/NewArrivals";
import Promo from "@/components/sections/Promo";
import WhyUs from "@/components/sections/WhyUs";
import Newsletter from "@/components/sections/Newsletter";
import { getAllProducts } from "@/lib/products";
import { getActiveHeroVideos } from "@/lib/hero-videos";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [products, heroVideo] = await Promise.all([getAllProducts(), getActiveHeroVideos()]);
  const newProducts = products.filter((p) => p.isNew);

  return (
    <>
      <Hero video={heroVideo} />
      <div className="hairline-full mx-auto max-w-[1400px]" aria-hidden="true" />
      <Intro />
      <Featured products={products} />
      <NewArrivals products={newProducts} />
      <Promo />
      <WhyUs />
      <div className="hairline-full mx-auto max-w-[1400px]" aria-hidden="true" />
      <Newsletter />
    </>
  );
}
