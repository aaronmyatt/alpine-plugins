import Alpine from 'alpinejs'
import router from './plugins/router.js'
import registerWebComponents from './plugins/component.js'


Alpine.plugin(router)
Alpine.plugin(registerWebComponents)
window.Alpine = Alpine
Alpine.start();

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
})
