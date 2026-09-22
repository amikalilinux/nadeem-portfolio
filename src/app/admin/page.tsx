import Script from "next/script";

export const metadata = {
  title: "Portfolio Admin | Nadeem Jamal",
  robots: "noindex, nofollow",
};

export default function AdminPage() {
  return (
    <>
      <Script src="https://unpkg.com/decap-cms@3.8.3/dist/decap-cms.js" strategy="afterInteractive" />
      <main id="nc-root" aria-label="Portfolio content management dashboard" />
    </>
  );
}
