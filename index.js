const fs = require('fs');
const fetch = require('node-fetch');
const { parse } = require('node-html-parser');
const { convertOnClickUrl } = require('./utilities/urlConverter');

const orgCodeFiles = [
    { code: '11816294095661060495', name: 'ucberkeley' },
    { code: '14108176128635076915', name: 'ucla'},
    { code: '7549334305653538480', name: 'ucsd' },
    { code: '21288157106126462', name: 'ucdavid' },
    { code: '1925309612018474740', name: 'ucirvine' },
    { code: '16278580130520462922', name: 'ucmerced' },
    { code: '9458886787299642237', name: 'ucriverside' },
    { code: '244821239474481393', name: 'ucsf' },
    { code: '13303172519087716448', name: 'ucsb' },
    { code: '6192028974562668508', name: 'ucsc' },
];

const index = 0;
const domain = 'https://scholar.google.com';
const seedPath = `/citations?view_op=view_org&hl=en&org=${orgCodeFiles[index].code}`;
const outFileName = `./outfiles/${orgCodeFiles[index].name}.csv`;
const interval = 1500;

const retrieve10Page = (outFileName, path, univOfCounter, univOfMaxCount, userCounter) => {
    univOfCounter = univOfCounter || 0;
    univOfMaxCount = univOfMaxCount || 10000;
    userCounter = userCounter || 0;

    if (userCounter === 0) {
        resetFile(outFileName);    
    }
    console.log(univOfCounter, userCounter, path);
    fetch(`${domain}${path}`)
    .then(res => res.text())
    .then(async (html) => {
        const root = parse(html);
        const buttonNext = root.querySelector('.gs_btnPR');
        const users = root.querySelectorAll('.gsc_1usr');

        const articlePromises = users.map(async (user) => {
            const name = user.querySelector('.gs_ai_name a');
            const affiliate = user.querySelector('.gs_ai_aff');
            const emailDomain = user.querySelector('.gs_ai_eml').text.replace('Verified email at ', '');
            const keywords = user.querySelectorAll('.gs_ai_int .gs_ai_one_int').map(kw => kw.text).join('/');

            const articleHtml = await (await fetch(`${domain}${name.attributes.href}`)).text();

            const articleHtmlRoot = parse(articleHtml);
            const articleTitles = [...articleHtmlRoot.querySelectorAll('td.gsc_a_t a')].map(elm => elm.text);
            const articlePublishes = [...articleHtmlRoot.querySelectorAll('td.gsc_a_t div.gs_gray')].filter((elm, idx) => idx % 2 === 1).map(elm => elm.text);

            const articles = articleTitles.map((title, index) => ({title, publisher: articlePublishes[index]}));

            return { name, affiliate, emailDomain, keywords, articles };
        });

        const articleResponses = await Promise.all(articlePromises);
        articleResponses.forEach(({ name, affiliate, emailDomain, keywords, articles }) => {
            appendToFile(outFileName, `"${userCounter}", "${name.text}", "${affiliate.text}", "${emailDomain}", "${keywords}", "${articles.map(article => `${article.title}(${article.publisher})`).join(', ')}"\n`)
            ++userCounter;
        });

        let pathNext = convertOnClickUrl(buttonNext.attributes.onclick);

        // meaning the second attribute is not onclick event handler. 
        // reached the end of pages.
        if (pathNext === 'aria-label="Next"') {
            ++univOfCounter;
            userCounter = 0;
            if (univOfCounter < univOfMaxCount) {
                const univ = orgCodeFiles[univOfCounter];
                pathNext = `/citations?view_op=view_org&hl=en&org=${univ.code}`;
                outFileName = `./outfiles/${univ.name}.csv`;
                setTimeout(() =>retrieve10Page(outFileName, pathNext, univOfCounter, univOfMaxCount, userCounter), interval);
            }
        } else {
            setTimeout(() =>retrieve10Page(outFileName, pathNext, univOfCounter, univOfMaxCount, userCounter), interval);
        }
    });
};

function appendToFile(filename, content) {
    try {
        fs.appendFileSync(filename, content);
    } catch(err) {
        console.error(err);
    }
}

function resetFile(filename) {
    try {
        fs.writeFileSync(filename, '');
    } catch(err) {
        console.error(err);
    }
}

retrieve10Page(outFileName, seedPath, index, orgCodeFiles.length, 0);