import Document, { Main, Head, NextScript } from 'next/document'

import { getAppConfig } from '../src/frontend/appConfig'

export default class MyDocument extends Document {
  static async getInitialProps (ctx) {
    const initialProps = await Document.getInitialProps(ctx)

    const ret = {
      ...initialProps,
      appConfig: getAppConfig(),
    }

    return ret
  }

  render () {
    const { appConfig } = this.props

    const { APP_MODE } = appConfig

    return (
      <html>
        <Head>
          <meta httpEquiv="X-UA-Compatible" content="IE=edge,chrome=1"/>
          <meta
            name="viewport"
            content="width=device-width, initial-scale=1, shrink-to-fit=no, maximum-scale=1, user-scalable=no"
          />
          <meta httpEquiv="Content-Type" content="text/html; charset=utf-8" />

          <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
          <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png" />
          <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png" />
          <link rel="manifest" href="/site.webmanifest" />
          {/* <link rel="mask-icon" href="/safari-pinned-tab.svg" color="#000000" /> */}
          <meta name="apple-mobile-web-app-title" content="Mailmask" />
          <meta name="application-name" content="Mailmask" />
          <meta name="msapplication-TileColor" content="#f7fff7" />
          <meta name="theme-color" content="#f7fff7" />

          <link rel='stylesheet' href='https://unpkg.com/@fortawesome/fontawesome-svg-core@1.2.28/styles.css' crossOrigin='anonymous'></link>

          {APP_MODE === 'live' ? (
            <React.Fragment>
              <script type="text/javascript" dangerouslySetInnerHTML={{
                __html: `
                  var _paq = window._paq || [];
                  /* tracker methods like "setCustomDimension" should be called before "trackPageView" */
                  _paq.push(["setDoNotTrack", true]);
                  _paq.push(['trackPageView']);
                  _paq.push(['enableLinkTracking']);
                  _paq.push(['setCustomVariable', 1, 'appMode', '${appConfig.APP_MODE}', 'visit']);
                  (function() {
                    var u="https://hiddentao.matomo.cloud/";
                    _paq.push(['setTrackerUrl', u+'matomo.php']);
                    _paq.push(['setSiteId', '1']);
                    var d=document, g=d.createElement('script'), s=d.getElementsByTagName('script')[0];
                    g.type='text/javascript'; g.async=true; g.defer=true; g.src='//cdn.matomo.cloud/hiddentao.matomo.cloud/matomo.js'; s.parentNode.insertBefore(g,s);
                  })();
                ` }}></script>
            </React.Fragment>
          ) : null}
          {APP_MODE !== 'selfhost' ? (
            <React.Fragment>
              <script type="text/javascript" dangerouslySetInnerHTML={{
                __html: `
                  window.$crisp=[];window.CRISP_WEBSITE_ID="445bc5b9-ca21-4e22-bae8-0b85244b6efa";(function(){d = document;s=d.createElement("script");s.src="https://client.crisp.chat/l.js";s.async=1;d.getElementsByTagName("head")[0].appendChild(s);})();
                ` }}></script>
              <script src="https://cdn.paddle.com/paddle/paddle.js"></script>
              <script type="text/javascript" dangerouslySetInnerHTML={{
                __html: `
                  Paddle.Setup({ vendor: ${appConfig.PADDLE_VENDOR_ID} });
                ` }}></script>
            </React.Fragment>
          ) : null}
        </Head>
        <body>
          <Main />
          <script type="text/javascript" dangerouslySetInnerHTML={{
            __html: `
              window.appConfig = ${JSON.stringify(appConfig, null, 2)};
            `
          }}></script>
          <NextScript />
        </body>
      </html>
    )
  }
}
