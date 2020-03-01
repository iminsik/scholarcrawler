const axios = require('axios');
const { parse } = require('node-html-parser');
const testUrl = `https://scholar.google.com/citations?hl=en&user=L0EA5xEAAAAJ&oe=UTF8`;

async function main() {
    let response = await axios(testUrl);
    const articleHtml = response.data;
    const articleHtmlRoot = parse(articleHtml);

    const affiliateTitle = articleHtmlRoot.querySelector('div.gsc_prf_il').text;
    const articleTitles = [...articleHtmlRoot.querySelectorAll('td.gsc_a_t a')].map(elm => elm.text);
    const articlePublishes = [...articleHtmlRoot.querySelectorAll('td.gsc_a_t div.gs_gray')].filter((elm, idx) => idx % 2 === 1).map(elm => elm.text);
}

main();