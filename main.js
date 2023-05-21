import router from './plugins/router.js'
import registerWebComponents from './plugins/component.js'
document.addEventListener('alpine:init', () => {
    window.Alpine.bind('SomeMagic', () => ({
        '@click'(){
            alert('SomeMagic')
        }
    }))

    window.Alpine.data('DataMagic', () => ({
        clicky: {
            ['@click'](){
                alert('DataMagic')
            }
        }
    }))

    window.Alpine.plugin(router)
    window.Alpine.plugin(registerWebComponents)
})
