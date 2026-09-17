import { GoogleTagManager } from '@next/third-parties/google';
import type { ScriptProps } from 'next/script';
import Script from 'next/script';

/*
 * This component is used to load third-party scripts
 * You can add more scripts to the scripts array
 * You can dedide to load all scripts or only some of them by specifying the scripts array
 */

interface ScriptProperties {
  loadAll?: boolean;
  strategy?: ScriptProps['strategy'];
  scripts?: ('googleTagManager' | 'googleAnalytics' | 'hubspot' | 'segment' | 'facebook' | 'hotjar')[];
}

const Scripts = (props: ScriptProperties) => {
  const { loadAll = false, strategy = 'afterInteractive', scripts = [] } = props;

  const scriptsToLoad = [];

  // Google Tag Manager
  const GOOGLE_TAG_MANAGER_ID = process.env.NEXT_PUBLIC_GOOGLE_TAG_MANAGER_ID;
  if ((loadAll || scripts.includes('googleTagManager')) && GOOGLE_TAG_MANAGER_ID) {
    scriptsToLoad.push(<GoogleTagManager key="gtm" gtmId={GOOGLE_TAG_MANAGER_ID} />);
  }

  // Google Analytics
  const GOOGLE_ANALYTICS_ID = process.env.NEXT_PUBLIC_GOOGLE_ANALYTICS_ID;
  if ((loadAll || scripts.includes('googleAnalytics')) && GOOGLE_ANALYTICS_ID) {
    scriptsToLoad.push(
      <Script
        id="ga"
        key="ga"
        strategy={strategy}
        src={`https://www.googletagmanager.com/gtag/js?id=${GOOGLE_ANALYTICS_ID}`}
      />
    );
    scriptsToLoad.push(
      <Script
        id="ga-init"
        key="ga-init"
        strategy={strategy}
        dangerouslySetInnerHTML={{
          __html: `
                window.dataLayer = window.dataLayer || [];
                function gtag() {
                dataLayer.push(arguments);
                }
                gtag("js", new Date());
                gtag("config", "${GOOGLE_ANALYTICS_ID}");
            `
        }}
      />
    );
  }

  // Hubspot
  const HUBSPOT_ID = process.env.NEXT_PUBLIC_HUBSPOT_ID;
  if ((loadAll || scripts.includes('hubspot')) && HUBSPOT_ID) {
    scriptsToLoad.push(
      <Script id="hubspot" key="hubspot" strategy="lazyOnload" src={`https://js.hsforms.net/forms/v2.js`} />
    );
    scriptsToLoad.push(
      <Script
        id="hubspot-init"
        key="hubspot-init"
        strategy={strategy}
        dangerouslySetInnerHTML={{
          __html: `
                    hbspt.forms.create({
                    portalId: "${HUBSPOT_ID}",
                    formId: "b2b4f2a8-1b1e-4b3c-8f1c-8e6f0e0e1b4b",
                    target: "#hubspot-form"
                    });
                `
        }}
      />
    );
  }

  // Segment Analytics
  const SEGMENT_ID = process.env.NEXT_PUBLIC_SEGMENT_ID;
  if ((loadAll || scripts.includes('segment')) && SEGMENT_ID) {
    scriptsToLoad.push(
      <Script
        id="segment"
        key="segment"
        strategy="lazyOnload"
        dangerouslySetInnerHTML={{
          __html: `
                      !function(){var analytics=window.analytics=window.analytics||[];if(!analytics.initialize)if(analytics.invoked)window.console&&console.error&&console.error("Segment snippet included twice.");else{analytics.invoked=!0;analytics.methods=["trackSubmit","trackClick","trackLink","trackForm","pageview","identify","reset","group","track","ready","alias","debug","page","once","off","on"];analytics.factory=function(t){return function(){var e=Array.prototype.slice.call(arguments);e.unshift(t);analytics.push(e);return analytics}};for(var t=0;t<analytics.methods.length;t++){var e=analytics.methods[t];analytics[e]=analytics.factory(e)}analytics.load=function(t,e){var n=document.createElement("script");n.type="text/javascript";n.async=!0;n.src="https://cdn.segment.com/analytics.js/v1/"+t+"/analytics.min.js";var a=document.getElementsByTagName("script")[0];a.parentNode.insertBefore(n,a);analytics._loadOptions=e};analytics.SNIPPET_VERSION="4.13.1";
                      analytics.load("${SEGMENT_ID}");
                      analytics.page();
                      }}
                    `
        }}
      />
    );
  }

  // Facebook Pixel
  const FACEBOOK_PIXEL_ID = process.env.NEXT_PUBLIC_FACEBOOK_PIXEL_ID;
  if ((loadAll || scripts.includes('facebook')) && FACEBOOK_PIXEL_ID) {
    scriptsToLoad.push(
      <Script
        id="fb"
        key="fb"
        strategy={strategy}
        dangerouslySetInnerHTML={{
          __html: `
                  !function(f,b,e,v,n,t,s)
                  {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
                  n.callMethod.apply(n,arguments):n.queue.push(arguments)};
                  if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
                  n.queue=[];t=b.createElement(e);t.async=!0;
                  t.src=v;s=b.getElementsByTagName(e)[0];
                  s.parentNode.insertBefore(t,s)}(window, document,'script',
                  'https://connect.facebook.net/en_US/fbevents.js');
                  fbq('init', '${FACEBOOK_PIXEL_ID}');
                  fbq('track', 'PageView');
              `
        }}
      />
    );
    scriptsToLoad.push(
      <noscript
        key="fb-noscript"
        dangerouslySetInnerHTML={{
          __html: `
                  <img height="1" width="1" style="display:none"
                  src="https://www.facebook.com/tr?id=${FACEBOOK_PIXEL_ID}&ev=PageView&noscript=1"/>
              `
        }}
      />
    );
  }

  // Hotjar
  const HOTJAR_ID = process.env.NEXT_PUBLIC_HOTJAR_ID;
  if ((loadAll || scripts.includes('hotjar')) && HOTJAR_ID) {
    scriptsToLoad.push(
      <Script
        id="hotjar"
        key="hotjar"
        strategy="lazyOnload"
        dangerouslySetInnerHTML={{
          __html: `
                    (function(h,o,t,j,a,r){
                      h.hj=h.hj||function(){(h.hj.q=h.hj.q||[]).push(arguments)};
                      h._hjSettings={hjid:${HOTJAR_ID},hjsv:6};
                      a=o.getElementsByTagName('head')[0];
                      r=o.createElement('script');r.async=1;
                      r.src=t+h._hjSettings.hjid+j+h._hjSettings.hjsv;
                      a.appendChild(r);
                    })(window,document,'https://static.hotjar.com/c/hotjar-','.js?sv=');
                `
        }}
      />
    );
  }

  return scriptsToLoad;
};

export default Scripts;
