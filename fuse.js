const { src, context, task, tsc, bumpVersion, npmPublish, exec } = require('fuse-box/sparky')
const { FuseBox, QuantumPlugin, EnvPlugin } = require('fuse-box')
const TypeHelper = require('fuse-box-typechecker').TypeHelper
const path = require('path')
const Mocha = require('mocha')
const glob = require('glob')

task('default', async context => {
  await context.cleanDist()
  context.checker().runWatch('./src')
  const { serverConfig, peerConfig } = context.createConfigs()
  context.createInstructions({ serverConfig, peerConfig })
  context.run({ serverConfig, peerConfig })
})

task('test', ['clean', 'build'], async context => {
  await context.test()
  await exec('clean')
})

task('clean', async context => {
  await Promise.all([
    context.cleanDist(),
    context.cleanTemp(),
  ])
})

task('build', async context => {
  const errors = await context.checker().runPromise()
  if (errors) throw new Error('Type checking failed')
  const { serverConfig, peerConfig } = context.createConfigs()
  context.createInstructions({ serverConfig, peerConfig })
  await context.run({ serverConfig, peerConfig })
})

task('publishPatch', ['prepublish', 'bumpPatch', 'postPublish'])
task('publishMinor', ['prepublish', 'bumpMinor', 'postPublish'])
task('publishMajor', ['prepublish', 'bumpMajor', 'postPublish'])

task('setProduction', context => {
  context.isProduction = true
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

task('prepublish', [
  'setProduction',
  'clean',
  'build',
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

  checker () {
    return TypeHelper({
      tsConfig: './tsconfig.json',
      basePath: '.',
      tsLint: './tslint.json'
    })
  }

  baseConfig (target, name) {
    return {
      homeDir: 'src',
      globals: { 'default': '*' }, // we need to expore index in our bundles
      output: 'dist/$name.js',
      cache: false,
      package: 'wesync-signal',
      target: `${target}@es5`,
      sourceMaps: { project: true, vendor: true },
      tsConfig: path.resolve('tsconfig.json'),
      plugins: [
        EnvPlugin({
          NODE_ENV: this.isProduction ? 'production' : 'development',
        }),
        QuantumPlugin({
          uglify: !!this.isProduction,
          treeshake: !!this.isProduction,
          target,
          bakeApiIntoBundle: name,
        }),
      ]
    }
  }

  createPeerConfig () {
    return this.merge(this.baseConfig('universal', 'peer'), {})
  }

  createServerConfig () {
    return this.merge(this.baseConfig('server', 'server'), {})
  }

  createConfigs () {
    return {
      serverConfig: this.createServerConfig(),
      peerConfig: this.createPeerConfig()
    }
  }

  createInstruction (config, name) {
    const instruction = config.bundle(name)
      .instructions(` > [${name}.ts]`)

    return instruction
  }

  createInstructions ({ serverConfig, peerConfig }) {
    return {
      serverInstruction: this.createInstruction(serverConfig, 'server'),
      peerInstruction: this.createInstruction(peerConfig, 'peer'),
    }
  }

  async run ({ serverConfig, peerConfig }) {
    await serverConfig.run()
    await peerConfig.run()
  }

  async test () {
    const mocha = new Mocha()
    const pattern = 'test/**/**.test.js'
    const files = await new Promise((resolve, reject) =>
      glob(pattern, {},  (err, files) => (err && reject(err)) || resolve(files)))
    files
      .map(f => path.resolve(f))
      .forEach(f => mocha.addFile(f))
    return new Promise(resolve => mocha.run(() => resolve()))
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

  async publish () {
    await npmPublish({ path: 'dist' })
  }
})
