const axios = require('axios');
const argv = require('yargs').argv;
const { parse } = require('node-html-parser');
const { convertOnClickUrl, getRandomArbitrary, escapeDoubleQuotes, appendToFile, resetFile } = require('./utilities/urlConverter');

const MIN = 15, MAX = 20;
const domain = 'https://scholar.google.com';

String.prototype.escapeDoubleQuotes = escapeDoubleQuotes;

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

let index = 0;
let userCounter = 0;
let seedPath = `/citations?view_op=view_org&hl=en&org=${orgCodeFiles[index].code}`;

if (argv.url !== undefined && argv.index !== undefined && argv.userCounter !== undefined) {
    seedPath = argv.url;
    index = argv.index;
    userCounter = argv.userCounter;
    console.log("Resuming: ", argv.url, argv.index, argv.userCounter);
}

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
    const profiles = await axios(`${domain}${path}`);
    const html = profiles.data;

    const root = parse(html);
    const buttonNext = root.querySelector('.gs_btnPR');
    const users = root.querySelectorAll('.gsc_1usr');

    const articles = users.map((user) => {
        const name = user.querySelector('.gs_ai_name a');
        const affiliate = user.querySelector('.gs_ai_aff');
        const emailDomain = user.querySelector('.gs_ai_eml').text.replace('Verified email at ', '');
        const keywords = user.querySelectorAll('.gs_ai_int .gs_ai_one_int').map(kw => kw.text).join('/');
        const articlePromise = axios(`${domain}${name.attributes.href}`);
        return { name, affiliate, emailDomain, keywords, articlePromise };
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
            const { name, affiliate, emailDomain, keywords, articlePromise } = articles[0];
            try {
                const response = await articlePromise;
                const articleHtml = response.data;
                const articleHtmlRoot = parse(articleHtml);
                const articleTitles = [...articleHtmlRoot.querySelectorAll('td.gsc_a_t a')].map(elm => elm.text);
                const articlePublishes = [...articleHtmlRoot.querySelectorAll('td.gsc_a_t div.gs_gray')].filter((elm, idx) => idx % 2 === 1).map(elm => elm.text);

                const articleInfos = articleTitles.map((title, index) => ({title, publisher: articlePublishes[index]}));
                const columns = [
                    userCounter.toString().escapeDoubleQuotes(),
                    name.text.escapeDoubleQuotes(),
                    affiliate.text.escapeDoubleQuotes(),
                    emailDomain.escapeDoubleQuotes(),
                    keywords.escapeDoubleQuotes(),
                    articleInfos.map(article => `${article.title.escapeDoubleQuotes()}`).join('###').escapeDoubleQuotes()
                ];
                appendToFile(outFileName, `${columns.map(str => `"${str}"`).join(',')}\n`)
                ++userCounter;
                articles.shift();
                setTimeout(async () => await articleFetch(articles, 0), getRandomArbitrary(MIN, MAX));
            }
            catch (error) {
                // try 3 times.
                if (numOfTry > 2) {
                    const message = `Skip with ${numOfTry} times: ${domain}${name.attributes.href}`;
                    console.warn(message);
                    appendToFile(logFileName, message);
                    articles.shift();
                    setTimeout(async () => await articleFetch(articles, 0), getRandomArbitrary(MIN, MAX));
                } else {
                    ++numOfTry;
                    console.warn(`Retry fetching in ${numOfTry} time:`, `${domain}${name.attributes.href}`);
                    articles[0].articlePromise = axios(`${error.config.url}`);
                    setTimeout(async () => await articleFetch(articles, numOfTry), getRandomArbitrary(MIN, MAX));
                } 
            }
        }
    };
    await articleFetch(articles, 0);
};

retrieve10Page(outFileName, seedPath, index, orgCodeFiles.length, userCounter);
