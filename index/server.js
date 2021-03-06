const fs = require('fs')
const path = require('path')
const express = require('express')
const favicon = require('serve-favicon')
const resolve = file => path.resolve(__dirname, file)

const isProd = process.env.NODE_ENV === 'production'
const port = process.env.PORT || 3000

const app = express()

let renderer
if (isProd) {
  // In production: create server renderer using server bundle and index HTML
  // template from real fs.
  // The server bundle is generated by vue-ssr-webpack-plugin.
  const bundle = require('./dist/vue-ssr-bundle.json')
  // src/index.template.html is processed by html-webpack-plugin to inject
  // build assets and output as dist/index.html.
  const template = fs.readFileSync(resolve('./dist/index.html'), 'utf-8')
  renderer = createRenderer(bundle, template)
} else {
  // In development: setup the dev server with watch and hot-reload,
  // and create a new renderer on bundle / index template update.
  require('./build/dev-server')(app, (bundle, template) => {
    renderer = createRenderer(bundle, template)
  })
}

function createRenderer (bundle, template) {
  // https://github.com/vuejs/vue/blob/dev/packages/vue-server-renderer/README.md#why-use-bundlerenderer
  return require('vue-server-renderer').createBundleRenderer(bundle, {
    template,
    cache: require('lru-cache')({
      max: 1000,
      maxAge: 1000 * 60 * 15
    })
  })
}

const serve = (path, cache) => express.static(resolve(path), {
  maxAge: cache && isProd ? 60 * 60 * 24 * 30 : 0
})

// ejs 模板引擎
const ejs = require('ejs')
app.engine('html', ejs.__express)
app.set('view engine', 'html')
app.set('views', path.join(__dirname, 'views'))

app.use(favicon(path.resolve(__dirname, 'src/assets/img/ico.jpeg')))
app.use('/service-worker.js', serve('./dist/service-worker.js'))
// 内容spa静态化
app.use('/main/', serve('../main/dist', true))
app.use('/dist', serve('./dist', true))

const mainRouter = {
  share: serve('../main/dist/share.html', true),
  article: serve('../main/dist/article.html', true),
  about: serve('../main/dist/about.html', true),
  progress: serve('../main/dist/progress.html', true),
  articleType: serve('../main/dist/articleType.html', true),
  insideArticleInfo: serve('../main/dist/insideArticleInfo.html', true),
  myBlogManager: serve('../main/dist/myBlogManager.html', true),
  'baidu_verify_5zkiFIuBhO.html': serve('./baidu_verify_5zkiFIuBhO.html', true),
}
for (const key in mainRouter) {
  app.use(`/main/${key}`, mainRouter[key])
}

/*
* 路由控制规则
* */
app.get('/', (req, res) => ssrRender(req, res))
app.get('/index*', (req, res) => ssrRender(req, res))
app.get('/main/', (req, res) => { res.end() })
app.get('/baidu_verify_5zkiFIuBhO.html', (req, res) => { res.end() })

/*
* 404
* */
app.get('*', (req, res) => {
  res.render('404', {
    status: 404
  })
})

/*
* ssr 渲染
* */
const ssrRender = (req, res) => {
  if (!renderer) {
    return res.end('waiting for compilation... refresh in a moment.')
  }

  const s = Date.now()

  res.setHeader('Content-Type', 'text/html')

  const errorHandler = err => {
    if (err && err.code === 404) {
      res.status(404).end('404 | Page Not Found')
    } else {
      // Render Error Page or Redirect
      res.status(500).end('500 | Internal Server Error')
      console.error(`error during render : ${req.url}`)
      console.error(err)
    }
  }

  renderer.renderToStream({ url: req.url })
    .on('error', errorHandler)
    .on('end', () => console.log(`whole request: ${Date.now() - s}ms`))
    .pipe(res)
}

app.listen(port, () => {
  console.log(`server started at http://localhost:${port}`)
})
