import Hero from "@/components/sections/Hero";
import Intro from "@/components/sections/Intro";
import Featured from "@/components/sections/Featured";
import NewArrivals from "@/components/sections/NewArrivals";
import Promo from "@/components/sections/Promo";
import WhyUs from "@/components/sections/WhyUs";
import Newsletter from "@/components/sections/Newsletter";
import PromoSlot from "@/components/promo/PromoSlot";
import { getAllProducts } from "@/lib/products";
import { getActiveHeroVideos } from "@/lib/hero-videos";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [products, heroVideo] = await Promise.all([getAllProducts(), getActiveHeroVideos()]);
  const newProducts = products.filter((p) => p.isNew);

  return (
    <>
      {/* homepage top — sits between the fixed nav and the hero */}
      <PromoSlot placements={["home_top"]} className="mx-auto max-w-[1400px] px-6 pt-28 md:px-10 md:pt-32" />
      <Hero video={heroVideo} />
      {/* below hero */}
      <PromoSlot placements={["below_hero"]} className="mx-auto max-w-[1400px] px-6 md:px-10" />
      <div className="hairline-full mx-auto max-w-[1400px]" aria-hidden="true" />
      <Intro />
      {/* above product section */}
      <PromoSlot placements={["above_products"]} className="mx-auto max-w-[1400px] px-6 md:px-10" />
      <Featured products={products} />
      {/* between product sections */}
      <PromoSlot placements={["between_sections"]} className="mx-auto max-w-[1400px] px-6 md:px-10" />
      <NewArrivals products={newProducts} />
      <Promo />
      <WhyUs />
      <div className="hairline-full mx-auto max-w-[1400px]" aria-hidden="true" />
      <Newsletter />
    </>
  );
}
