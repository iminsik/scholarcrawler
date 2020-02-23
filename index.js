const fs = require('fs');
const fetch = require('node-fetch');
const { parse } = require('node-html-parser');
const { convertOnClickUrl, getRandomArbitrary } = require('./utilities/urlConverter');

const MIN = 15, MAX = 20;
const index = 0;
const userCounter = 0;
const domain = 'https://scholar.google.com';

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

const seedPath = `/citations?view_op=view_org&hl=en&org=${orgCodeFiles[index].code}`;
const outFileName = `./outfiles/${orgCodeFiles[index].name}.csv`;
const logFileName = `./outfiles/${orgCodeFiles[index].name}.log`;

const retrieve10Page = async (outFileName, path, univOfCounter, univOfMaxCount, userCounter) => {
    univOfCounter = univOfCounter || 0;
    univOfMaxCount = univOfMaxCount || 10000;
    userCounter = userCounter || 0;

    if (userCounter === 0) {
        resetFile(outFileName);    
        resetFile(logFileName);
    }

    // TODO: how to handle retry in fetching a list?
    console.log(univOfCounter, orgCodeFiles[univOfCounter].name, `${userCounter}`.padStart(4, ' '), path);
    const responseProfiles = await fetch(`${domain}${path}`);
    const html = await responseProfiles.text();

    const root = parse(html);
    const buttonNext = root.querySelector('.gs_btnPR');
    const users = root.querySelectorAll('.gsc_1usr');

    const articles = users.map((user) => {
        const name = user.querySelector('.gs_ai_name a');
        const affiliate = user.querySelector('.gs_ai_aff');
        const emailDomain = user.querySelector('.gs_ai_eml').text.replace('Verified email at ', '');
        const keywords = user.querySelectorAll('.gs_ai_int .gs_ai_one_int').map(kw => kw.text).join('/');
        const articlePath = `${name.attributes.href}`;
        return { name, affiliate, emailDomain, keywords, articlePath };
    });

    let pathNext = convertOnClickUrl(buttonNext.rawAttrs.split(' ')[1]); 

    const articleFetch = async (articles, numOfTry) => {
        if (articles.length === 0) {
            // The second attribute is not onclick event handle means it reached the end of pages.
            if (pathNext === 'aria-label="Next"') {
                ++univOfCounter;
                userCounter = 0;
                if (univOfCounter < univOfMaxCount) {
                    const univ = orgCodeFiles[univOfCounter];
                    pathNext = `/citations?view_op=view_org&hl=en&org=${univ.code}`;
                    outFileName = `./outfiles/${univ.name}.csv`;
                    setTimeout(async () => await retrieve10Page(outFileName, pathNext, univOfCounter, univOfMaxCount, userCounter), getRandomArbitrary(MIN, MAX));
                }
            } else {
                setTimeout(async () => await retrieve10Page(outFileName, pathNext, univOfCounter, univOfMaxCount, userCounter), getRandomArbitrary(MIN, MAX));
            }
        }
        else {
            const { name, affiliate, emailDomain, keywords, articlePath } = articles[0];
            try {
                const articleResponse = await fetch(`${domain}${articlePath}`);
                const articleHtml = await articleResponse.text();
                const articleHtmlRoot = parse(articleHtml);
                const articleTitles = [...articleHtmlRoot.querySelectorAll('td.gsc_a_t a')].map(elm => elm.text);
                const articlePublishes = [...articleHtmlRoot.querySelectorAll('td.gsc_a_t div.gs_gray')].filter((elm, idx) => idx % 2 === 1).map(elm => elm.text);

                const articleInfos = articleTitles.map((title, index) => ({title, publisher: articlePublishes[index]}));
                appendToFile(outFileName, `"${userCounter}", "${name.text}", "${affiliate.text}", "${emailDomain}", "${keywords}", "${articleInfos.map(article => `${article.title}`).join(', ')}"\n`)
                ++userCounter;
                articles.shift();
                setTimeout(async () => await articleFetch(articles, 0), getRandomArbitrary(MIN, MAX));
            }
            catch (error) {
                // try 3 times.
                if (numOfTry > 2) {
                    const message = `Skip with ${numOfTry} times: ${domain}${name.attributes.href}`;
                    console.warning(message);
                    appendToFile(logFileName, message);
                    articles.shift();
                    setTimeout(async () => await articleFetch(articles, 0), getRandomArbitrary(MIN, MAX));
                } else {
                    ++numOfTry;
                    console.warning(`Retry fetching in ${numOfTry} time:`, `${domain}${name.attributes.href}`);
                    setTimeout(async () => await articleFetch(articles, numOfTry), getRandomArbitrary(MIN, MAX));
                } 
            }
        }
    };
    await articleFetch(articles, 0);
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

retrieve10Page(outFileName, seedPath, index, orgCodeFiles.length, userCounter);
