import { resolve } from 'path'
import { defineConfig, loadEnv } from 'vite'

export default defineConfig(({mode}) => {
    const env = loadEnv(mode, process.cwd(), '')

    return {
        base: mode === 'build' ? '/alpine-plugins/' : '',
        // base: '/alpine-plugins/',
        build: {
            minify: false,
            lib: env.lib ? {
                // Could also be a dictionary or array of multiple entry points
                entry: [resolve(__dirname, 'plugins/router.js'), resolve(__dirname, 'plugins/component.js')],
                // name: 'AlpineRouter',
                // the proper extensions will be added
                fileName: (ft, name) => `${name}/index.${ft}.js`
            } : false,
            rollupOptions: {
                // make sure to externalize deps that shouldn't be bundled
                // into your library
                external: ['alpine'],
                output: {
                    // Provide global variables to use in the UMD build
                    // for externalized deps
                    globals: {
                        alpine: 'Alpine',
                    },
                },
            },
        },
    }
})
