import { resolve } from 'path'
import { defineConfig } from 'vite'

export default defineConfig({
    build: {
        minify: false,
        lib: {
            // Could also be a dictionary or array of multiple entry points
            entry: [resolve(__dirname, 'plugins/router.js'), resolve(__dirname, 'plugins/component.js')],
            // name: 'AlpineRouter',
            // the proper extensions will be added
            fileName: (ft, name) => `${name}/index.${ft}.js`
        },
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
})
