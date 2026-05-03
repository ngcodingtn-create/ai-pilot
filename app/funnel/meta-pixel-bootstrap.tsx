const PIXEL_ID =
  process.env.NEXT_PUBLIC_META_PIXEL_ID?.trim() ||
  process.env.NEXT_PUBLIC_FB_PIXEL_ID?.trim() ||
  "1254451106670901";

const hasMetaPixel = Boolean(PIXEL_ID && PIXEL_ID !== "TON_PIXEL_ID");

export default function MetaPixelBootstrap() {
  if (!hasMetaPixel) {
    return null;
  }

  return (
    <>
      <script
        id="meta-pixel-base"
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
fbq('init', '${PIXEL_ID}');
fbq('track', 'PageView');
          `.trim(),
        }}
      />
      <script
        src="https://unpkg.com/meta-capi-param-builder-clientjs@1.3.0/dist/clientParamBuilder.bundle.js"
        async
      />
      <script
        id="meta-param-builder-bootstrap"
        dangerouslySetInnerHTML={{
          __html: `
(function(){
  var attempts = 0;
  function getClientIp(){
    return fetch('/api/marketing/client-ip', { cache: 'no-store' })
      .then(function(response){ return response.ok ? response.json() : {}; })
      .then(function(payload){ return payload && payload.ip ? payload.ip : ''; })
      .catch(function(){ return ''; });
  }
  function run(){
    attempts += 1;
    if (!window.clientParamBuilder || typeof window.clientParamBuilder.processAndCollectAllParams !== 'function') {
      if (attempts < 40) window.setTimeout(run, 125);
      return;
    }
    window.clientParamBuilder.processAndCollectAllParams(window.location.href, getClientIp)
      .then(function(params){ window.__aipilotMetaParams = params || {}; })
      .catch(function(){});
  }
  run();
})();
          `.trim(),
        }}
      />
      <noscript>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          height="1"
          width="1"
          style={{ display: "none" }}
          src={`https://www.facebook.com/tr?id=${PIXEL_ID}&ev=PageView&noscript=1`}
          alt=""
        />
      </noscript>
    </>
  );
}
