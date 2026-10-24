// components/layout/analytics.tsx
// Google Analytics 4 + Meta Pixel, activés seulement si les identifiants
// sont définis (NEXT_PUBLIC_GA4_ID, NEXT_PUBLIC_META_PIXEL_ID).
import Script from "next/script";

const GA4_ID = process.env.NEXT_PUBLIC_GA4_ID;
const PIXEL_ID = process.env.NEXT_PUBLIC_META_PIXEL_ID;
const SAFE_ID = /^[A-Za-z0-9-]+$/;

export function Analytics() {
  return (
    <>
      {GA4_ID && SAFE_ID.test(GA4_ID) && (
        <>
          <Script src={`https://www.googletagmanager.com/gtag/js?id=${GA4_ID}`} strategy="afterInteractive" />
          <Script id="ga4-init" strategy="afterInteractive">
            {`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${GA4_ID}');`}
          </Script>
        </>
      )}
      {PIXEL_ID && SAFE_ID.test(PIXEL_ID) && (
        <Script id="meta-pixel" strategy="afterInteractive">
          {`!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init','${PIXEL_ID}');fbq('track','PageView');`}
        </Script>
      )}
    </>
  );
}

/** Envoie un événement de conversion aux outils configurés (côté navigateur). */
export function trackConversion(name: "Purchase" | "Lead", params: { value?: number; currency?: string; id?: string } = {}) {
  if (typeof window === "undefined") return;
  const w = window as any;
  if (name === "Purchase") {
    w.gtag?.("event", "purchase", { transaction_id: params.id, value: params.value, currency: params.currency || "CAD" });
    w.fbq?.("track", "Purchase", { value: params.value, currency: params.currency || "CAD" }, params.id ? { eventID: params.id } : undefined);
  } else {
    w.gtag?.("event", "generate_lead", {});
    w.fbq?.("track", "Lead");
  }
}
