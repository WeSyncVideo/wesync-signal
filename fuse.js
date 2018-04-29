const { src, context, task, tsc, bumpVersion, npmPublish } = require('fuse-box/sparky')
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
  throw new Error('not implemented yet')
})

task('clean', async context => {
  await Promise.all([
    context.cleanDist(),
    context.cleanTemp(),
  ])
})

task('buildJavascript', async context => {
  const { server, peer } = context.getConfigs()
  context.createBundles({ server, peer })
  await context.run({ server, peer })
})

task('buildDeclarations', async context => {
  await context.compileDeclarations()
  await context.moveDeclarations()
})

task('moveRootFiles', async context => {
  await context.moveIndex()
  await context.moveDeclarationIndex()
  await context.movePackageJson()
})

task('setProduction', async context => {
  context.isProduction = true
})

task('prepublish', [
  'setProduction',
  'clean',
  'buildJavascript',
  'buildDeclarations',
])

task('publishNpm', async context => {
  await context.publish()
})

task('postPublish', [
  'moveRootFiles',
  'publishNpm',
  'clean',
])

task('bumpMajor', async context => await context.bumpVersion('major'))
task('bumpMinor', async context => await context.bumpVersion('minor'))
task('bumpPatch', async context => await context.bumpVersion('patch'))

task('publishPatch', ['prepublish', 'bumpPatch', 'postPublish'])
task('publishMinor', ['prepublish', 'bumpMinor', 'postPublish'])
task('publishMajor', ['prepublish', 'bumpMajor', 'postPublish'])

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
    const moveTypes = src('temp/src/types/**/**.d.ts')
      .dest('dist/types/$name')
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

  async moveIndex () {
    return src('./index.js')
      .dest('dist/')
      .exec()
  }

  async moveDeclarationIndex () {
    return src('./index.d.ts')
      .dest('dist/')
      .exec()
  }

  async movePackageJson () {
    return src('./package.json')
      .dest('dist/')
      .exec()
  }

  async bumpVersion (type) {
    await bumpVersion('package.json', { type })
  }

  async run ({ server, peer }) {
    await server.run()
    await peer.run()
  }

  async publish () {
    await npmPublish({ path: 'dist' })
  }
})
