// Tween/タイマーユーティリティ
function wait(ms) {
    return new Promise(function (resolve) {
        var interval = 100;
        var elapsed = 0;
        var timer = setInterval(function () {
            elapsed += interval;
            if (AppState.gantry.cancelRequested || elapsed >= ms) {
                clearInterval(timer);
                resolve();
            }
        }, interval);
    });
}

function tweenPromise(target, to, duration, easing) {
    easing = easing || TWEEN.Easing.Quadratic.InOut;
    return new Promise(function (resolve) {
        var tween = new TWEEN.Tween(target)
            .to(to, duration)
            .easing(easing)
            .onUpdate(function () {
                AppState.notify();
                if (AppState.gantry.cancelRequested) {
                    tween.stop();
                    // 停止要求時はトゥイーンを中断して即時完了させる
                    resolve();
                }
            })
            .onComplete(resolve)
            .start();
    });
}
