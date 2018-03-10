const { src, context, task } = require('fuse-box/sparky')
const { FuseBox, QuantumPlugin, EnvPlugin, BabelPlugin } = require('fuse-box')
const path = require('path')

task('default', async context => {
  await context.cleanDist()
  context.moveFavicon()
  const fuse = context.getConfig()
  context.createBundle(fuse)
  context.devServer(fuse)
  await fuse.run()
})

task('dist', async context => {
  await context.cleanDist()
  context.moveFavicon()
  context.isProduction = true
  const fuse = context.getConfig()
  context.createBundle(fuse)
  await fuse.run()
})

context(class {

  /**
   * Merge options into Fusebox config
   *
   * @param {object[]} options
   */
  merge (...options) {
    return FuseBox.init(options.reduce(
      (a, b) => ({ ...a, ...b })
    ))
  }

  baseConfig (target) {
    return FuseBox.init({
      homeDir: 'src',
      target: `${target}@es5`,
      useTypescriptCompiler: true,
      sourceMaps: { project: true, vendor: true },
      plugins: [
        EnvPlugin({
          NODE_ENV: this.isProduction ? 'production' : 'development',
        }),
        this.isProduction && QuantumPlugin({
          bakeApiIntoBundle: 'app',
          uglify: true,
          extendServerImport: true,
          treeshake: true,
          target,
        })
      ]
    })
  }

  createBundle (fuse) {
    const bundle = fuse.bundle('app')
      .instructions(' > index.js')

    if (!this.isProduction) {
      bundle
        .watch()
        .cache(false)
        .hmr()
    }

    return bundle
  }

  devServer (fuse) {
    fuse.dev()
  }

  moveFavicon () {
    src(path.resolve('src', 'assets', 'favicon.ico'))
      .dest('dist/')
      .exec()
  }

  async cleanDist () {
    await src('dist/').clean('dist/').exec()
  }
})
