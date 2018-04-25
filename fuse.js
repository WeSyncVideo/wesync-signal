const { src, context, task, tsc } = require('fuse-box/sparky')
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

task('test', async context => {
  throw new Error('not implmented yet')
})

task('publish', async context => {
  await context.cleanDist()
  context.isProduction = true
  const { server, peer } = context.getConfigs()
  context.createBundles({ server, peer })
  await context.run({ server, peer })
  await context.compileDeclarations()
  await context.moveDeclarations()
  await context.cleanTemp()
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
      .instructions(` > [${name}.ts]`)

    return bundle
  }

  createBundles ({ server, peer }) {
    return {
      serverBundle: this.createBundle(server, 'server'),
      peerBundle: this.createBundle(peer, 'peer'),
    }
  }

  async cleanDist () {
    await src('dist/')
      .clean('dist/')
      .exec()
  }

  async cleanTemp () {
    await src('temp/').clean('temp/').exec()
  }

  async compileDeclarations () {
    await tsc('.', {
      target: 'ES5',
      module: 'commonjs',
      importHelpers: true,
      strict: true,
      sourceRoot: './src',
      sourceMap: true,
      outDir: './temp',
      declaration: true,
      rootDir: '.',
      lib: [
        'es2015',
      ],
    })
  }

  async moveDeclarations () {
    const { moveTempFile } = this
    const moveTypes = src('temp/src/types/**/**')
      .dest('dist')
      .exec()
    return Promise.all([
      moveTempFile('server.d.ts'),
      moveTempFile('peer.d.ts'),
      moveTypes,
    ])
  }

  async moveTempFile (name) {
    return src(`temp/src/${name}`)
      .dest('dist/$name')
      .exec()
  }

  async run ({ server, peer }) {
    await server.run()
    await peer.run()
  }
})
