const { src, context, task } = require('fuse-box/sparky')
const { FuseBox, QuantumPlugin, EnvPlugin, BabelPlugin } = require('fuse-box')
const path = require('path')

task('default', async context => {
  await context.cleanDist()
  context.isProduction = true
  const fuse = FuseBox.init(context.baseConfig('browser'))
  context.createBundle(fuse, 'peer')
  await fuse.run()
})

task('dist', async context => {
  await context.cleanDist()
  context.isProduction = true
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
    return {
      homeDir: 'src',
      output: 'dist/$name.js',
      cache: false,
      package: 'wesync-signal',
      target: `${target}@es5`,
      useTypescriptCompiler: true,
      sourceMaps: { project: true, vendor: true },
      plugins: [
        EnvPlugin({
          NODE_ENV: this.isProduction ? 'production' : 'development',
        }),
        this.isProduction && QuantumPlugin({
          uglify: true,
          treeshake: true,
          target,
        })
      ]
    }
  }

  createBundle (fuse, name) {
    const bundle = fuse.bundle(name)
      .instructions(` > ${name}.ts`)

    if (!this.isProduction) {
      bundle
        .watch()
        .cache(true)
        .hmr()
    }

    return bundle
  }

  async cleanDist () {
    await src('dist/').clean('dist/').exec()
  }
})
