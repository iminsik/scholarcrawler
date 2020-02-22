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

module.exports = {
    convertOnClickUrl,
    getRandomArbitrary
};