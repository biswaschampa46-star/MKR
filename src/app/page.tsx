import Hero from "@/components/sections/Hero";
import Intro from "@/components/sections/Intro";
import Featured from "@/components/sections/Featured";
import NewArrivals from "@/components/sections/NewArrivals";
import Promo from "@/components/sections/Promo";
import WhyUs from "@/components/sections/WhyUs";
import Newsletter from "@/components/sections/Newsletter";
import { getAllProducts } from "@/lib/products";
import DataErrorState from "@/components/DataErrorState";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const result = await getAllProducts();

  // A failed query must not render the homepage as "no products".
  if (!result.ok) {
    return (
      <>
        <Hero />
        <DataErrorState
          title="Products are taking a moment."
          message="The store database did not respond just now. Everything else on this page is fine — the catalogue will be right back. Please try again."
          backHref="/shop"
          backLabel="Go to Shop"
        />
        <Promo />
        <WhyUs />
        <Newsletter />
      </>
    );
  }

  const products = result.data;
  const newProducts = products.filter((p) => p.isNew);

  return (
    <>
      <Hero />
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
