import Alpine from 'alpinejs'
import router from './plugins/router.js'
import registerWebComponents from './plugins/component.js'

Alpine.bind('SomeMagic', () => ({
    '@click'(){
        // alert('SomeMagic')
    }
}))

Alpine.data('DataMagic', () => ({
    clicky: {
        ['@click'](){
            // alert('DataMagic')
        }
    }
}))

Alpine.plugin(registerWebComponents)
Alpine.plugin(router)
window.Alpine = Alpine
Alpine.start();
