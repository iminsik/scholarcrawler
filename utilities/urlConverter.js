const fs = require('fs');

// <button type="button" onclick="window.location='/citations?view_op\x3dview_org\x26hl\x3den\x26oe\x3dASCII\x26org\x3d11816294095661060495\x26after_author\x3d4GEAAHC0_f8J\x26astart\x3d10'" aria-label="Next" class="gs_btnPR gs_in_ib gs_btn_half gs_btn_lsb gs_btn_srt gsc_pgn_pnx"><span class="gs_wr"><span class="gs_ico"></span><span class="gs_lbl"></span></span></button>
function convertOnClickUrl(onClickUrl) {
    return onClickUrl.replace(/onclick="window\.location='/g,'')
            .replace(/\\x3d/g, '=')
            .replace(/\\x26/g, '&')
            .replace(/'"$/g, '');
}

function getRandomArbitrary(min, max) {
    return (Math.random() * (max - min) + min) * 100;
}

function removeQuotes() {
    return this.replace(/^"/i, '').replace(/",$/i, '').replace(/"$/i, '');
}

function escapeDoubleQuotes() {
    return this.replace(/"/gi, '""');
}

function appendToFile(filename, content) {
    try {
        fs.appendFileSync(filename, content, 'utf8');
    } catch(err) {
        console.error(err);
    }
}

function resetFile(filename) {
    try {
        fs.writeFileSync(filename, '', 'utf8');
    } catch(err) {
        console.error(err);
    }
}

function sanitize(path) {
    const encodingASCII = '&oe=ASCII';
    const encodingUTF8 = '&oe=UTF8';
    const idx = path.indexOf(encodingASCII);
    if (idx >= 0) {
        return path.replace(encodingASCII, encodingUTF8);
    } else {
        return path + encodingUTF8;
    }
}

function spreadTitles() {
    const titlesPlaceHolder = Array.from({length: 25}, (v, i) => 'NA');
    let position = 0, idx = -1;
    let row = this;

    do {
        idx = row.search(/[^"]",/);
        if (idx === -1) {
            idx = row.search(/^"",/);
        }
        let cell = "";
        if (idx === -1) {
            const titles = row.removeQuotes().split('###');
            titles.forEach((title, idx) => {
                if (position > 24) {
                    console.warn('position cannot be greater than 24');
                }
                titlesPlaceHolder[position] = title;
                ++position;
            });
        } else {
            cell = row.substring(0, idx+1).removeQuotes();
            titlesPlaceHolder[position] = cell;
        }
        row = row.substring(idx+3, row.length);
        ++position;
    } while (idx !== -1);

    return titlesPlaceHolder;
}
String.prototype.removeQuotes = removeQuotes;
String.prototype.escapeDoubleQuotes = escapeDoubleQuotes;
String.prototype.spreadTitles = spreadTitles;

module.exports = {
    convertOnClickUrl,
    getRandomArbitrary,
    escapeDoubleQuotes,
    removeQuotes,
    appendToFile,
    resetFile,
    sanitize,
    spreadTitles
};