const path = require('path')
const Koa = require('koa')
const cors = require('koa-cors') // 跨域处理
const bodyparser = require('koa-bodyparser') // 传参获取
const compress = require('koa-compress') // 传输压缩
const mount = require('koa-mount') // 路由挂载
const convert = require('koa-convert') // 封装中间件
const mongoose = require('mongoose')
const Pug = require('koa-pug')
const serve = require('koa-static')
const session = require('koa-session')
const moment = require('moment')
const livereload = require('koa-livereload')

const config = require('./config')
const router = require('./config/routes')

const app = new Koa()
const pug = new Pug({
  app,
  viewPath: 'app/views/pages',
  pretty: true,
  locals: {
    moment
  }
})

app.use(serve(path.join(__dirname, '/public')))
app.use(convert(bodyparser()))
app.use(convert(compress()))
app.use(convert(cors()))
app.keys = ['secret is only a secret']
app.use(session({
  key: 'movie-koa2', /** (string) cookie key (default is koa:sess) */
  /** (number || 'session') maxAge in ms (default is 1 days) */
  /** 'session' will result in a cookie that expires when session/browser is closed */
  /** Warning: If a session cookie is stolen, this cookie will never expire */
  maxAge: 86400000,
  overwrite: true, /** (boolean) can overwrite or not (default true) */
  httpOnly: true, /** (boolean) httpOnly or not (default true) */
  signed: true, /** (boolean) signed or not (default true) */
  rolling: false, /** (boolean) Force a session identifier cookie to be set on every response. The expiration is reset to the original maxAge, resetting the expiration countdown. default is false **/
}, app))

app.use(async (ctx, next) => {
  let start = new Date
  await next()
  let ms = new Date - start
  console.log(`${ctx.method}, ${ctx.url}, ${ms}`)
})

// 错误监听
app.on('error', (err, ctx) => {
  console.log('error: ', err)
})

// 实时加载
if (process.env.NODE_ENV === 'development') {
  // 开发配置
  mongoose.set('debug', true)

  var liveReloadPort = process.env.LR_PORT || 35279
  var excludeList = ['.woff', '.flv']

  app.use(livereload({
    port: liveReloadPort,
    excludes: excludeList
  }))
}

// 挂在路由
// app.use(mount('/api/v1', router))
app.use(mount('/', router))

connect()
  .on('error', console.log)
  .on('disconnected', connect)
  .once('open', listen)

function listen () {
  app.listen(config.port, () => {
    console.log('%s BackEnd Server is running on: http://%s:%s', config.appName, config.host, config.port)
  })
}

function connect () {
  mongoose.Promise = global.Promise // resolve a bug that mpromise is deprecated,plug in your own promise library instead
  return mongoose.connect('mongodb://' + config.database.host + '/' + config.database.db, {
    useMongoClient: true
  })
}
