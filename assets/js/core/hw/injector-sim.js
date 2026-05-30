(function attachInjectorSim(global) {
    function setField(key, value) {
        if (!global.CTStore) return { success: false, error: 'STORE_UNAVAILABLE' };
        return global.CTStore.dispatch({ type: 'set', scope: 'injector', key: key, value: value });
    }

    var injectorSim = {
        setContrastA: function setContrastA(percent) {
            return setField('a', percent);
        },
        setSalineB: function setSalineB(percent) {
            return setField('b', percent);
        }
    };

    global.InjectorSim = injectorSim;
})(window);
