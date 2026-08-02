// ダイアログ表示・フォーカス制御
function showInfoDialog(key) {
    if (!key || key === "none") return;

    var dialog = document.getElementById("info-dialog");
    var titleElem = document.getElementById("info-dialog-title");
    var descElem = document.getElementById("info-dialog-desc");

    var text = Descriptions[key] || "Description not found.";
    var lines = text.split("\n\n");

    // 1段落目をタイトル、2段落目を説明として表示する
    titleElem.innerText = lines[0];
    descElem.innerText = lines[1] || "";

    dialog.classList.remove("hidden");
    dialog.classList.remove("opacity-0");
}

function hideInfoDialog() {
    var dialog = document.getElementById("info-dialog");
    dialog.classList.add("hidden");
    document.getElementById("select-focus").value = "";
}

function handleFocusChange(value) {
    if (!value) return;

    if (value === "XrayTube" || value === "Detector") {
        setGantryOpacity(true);
    } else if (value === "Gantry" || value === "TouchPanel") {
        setGantryOpacity(false);
    }

    setCameraView("focus_" + value);
    showInfoDialog(value);
}
