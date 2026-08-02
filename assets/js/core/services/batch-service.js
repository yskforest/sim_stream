// バッチキュー操作サービス
function setInjectorSync(index) {
    var current = AppState.gantry.injectorSyncIndex;
    CTCommandBus.execute({
        source: "ui-console",
        target: "gantry",
        action: "setField",
        params: { key: "injectorSyncIndex", value: current === index ? -1 : index },
    });
}

function addScanBatch() {
    if (AppState.gantry.scanSequence.length >= 5) return;
    var newSeq = AppState.gantry.scanSequence.concat([{ mode: "helical", delay: 0 }]);
    CTCommandBus.execute({
        source: "ui-console",
        target: "gantry",
        action: "setField",
        params: { key: "scanSequence", value: newSeq },
    });
}

// バッチを削除する（最低1件は残す）
function removeScanBatch(index) {
    if (AppState.gantry.scanSequence.length <= 1) return;
    var newSeq = AppState.gantry.scanSequence.slice();
    newSeq.splice(index, 1);
    CTCommandBus.execute({
        source: "ui-console",
        target: "gantry",
        action: "setField",
        params: { key: "scanSequence", value: newSeq },
    });
}

function updateBatchData(index, key, value) {
    var newSeq = AppState.gantry.scanSequence.slice();
    var updated = {};
    for (var k in newSeq[index]) {
        if (Object.prototype.hasOwnProperty.call(newSeq[index], k)) {
            updated[k] = newSeq[index][k];
        }
    }
    updated[key] = value;
    newSeq[index] = updated;
    CTCommandBus.execute({
        source: "ui-console",
        target: "gantry",
        action: "setField",
        params: { key: "scanSequence", value: newSeq },
    });

    if (key === "mode") {
        showInfoDialog(value);
        if (index === 0) {
            CTCommandBus.execute({
                source: "ui-console",
                target: "gantry",
                action: "setField",
                params: { key: "currentScanMode", value: value },
            });
        }
    }
}
