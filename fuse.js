const { src, context, task } = require('fuse-box/sparky')
const { FuseBox, QuantumPlugin, EnvPlugin } = require('fuse-box')
const TypeHelper = require('fuse-box-typechecker').TypeHelper
const path = require('path')

task('default', async context => {
  await context.cleanDist()
  context.isProduction = false
  context.linter().runWatch('./src')
  const { server, peer } = context.getConfigs()
  context.createBundles({ server, peer })
  context.run({ server, peer })
})

task('prod', async context => {
  await context.cleanDist()
  context.isProduction = true
  const { server, peer } = context.getConfigs()
  context.createBundles({ server, peer })
  context.run({ server, peer })
})

task('test', async context => {
  throw new Error('not implmented yet')
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

  linter () {
    return TypeHelper({
      tsConfig: './tsconfig.json',
      basePath: '.',
      tsLint: './tslint.json'
    })
  }

  baseConfig (target, name) {
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
          bakeApiIntoBundle: name
        })
      ]
    }
  }

  peerConfig () {
    return this.merge(this.baseConfig('browser', 'peer'), {

    })
  }

  serverConfig () {
    return this.merge(this.baseConfig('server', 'server'), {

    })
  }

  getConfigs () {
    return {
      server: this.serverConfig(),
      peer: this.peerConfig()
    }
  }

  createBundle (fuse, name) {
    const bundle = fuse.bundle(name)
      .instructions(` > ${name}.ts`)

    return bundle
  }

  createBundles ({ server, peer }) {
    return {
      serverBundle: this.createBundle(server, 'server'),
      peerBundle: this.createBundle(peer, 'peer')
    }
  }

  async cleanDist () {
    await src('dist/').clean('dist/').exec()
  }

  async run ({ server, peer }) {
    await server.run()
    await peer.run()
  }
})
