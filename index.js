const allSettled = require('promise.allsettled');
const axios = require('axios');
const argv = require('yargs').argv;
const { parse } = require('node-html-parser');
const { convertOnClickUrl, getRandomArbitrary, escapeDoubleQuotes, appendToFile, resetFile, sanitize } = require('./utilities/urlConverter');

const MIN = 10, MAX = 15;
const domain = 'https://scholar.google.com';

const orgCodeFiles = [
    { code: '11816294095661060495', name: 'ucberkeley' },
    { code: '14108176128635076915', name: 'ucla'},
    { code: '7549334305653538480', name: 'ucsd' },
    { code: '21288157106126462', name: 'ucdavis' },
    { code: '1925309612018474740', name: 'ucirvine' },
    { code: '16278580130520462922', name: 'ucmerced' },
    { code: '9458886787299642237', name: 'ucriverside' },
    { code: '244821239474481393', name: 'ucsf' },
    { code: '13303172519087716448', name: 'ucsb' },
    { code: '6192028974562668508', name: 'ucsc' },
];

let userCounter = 0;
if (argv.userCounter !== undefined) {
    userCounter = argv.userCounter;
    console.log("Override userCounter: ", userCounter);
}

let index = 0;
if (argv.index !== undefined) {
    index = argv.index;
    console.log("Override index: ", index);
} 

let seedPath = `/citations?view_op=view_org&hl=en&oe=UTF8&org=${orgCodeFiles[index].code}`;
if (argv.url !== undefined) {
    seedPath = argv.url;
    console.log("Override seedPath: ", seedPath);
}

let univMaxCount = orgCodeFiles.length;
if (argv.univMaxCount) {
    univMaxCount = argv.univMaxCount;
    console.log("Override univMaxCount: ", univMaxCount);
}

let outFileName = `./outfiles/${orgCodeFiles[index].name}.csv`;
let logFileName = `./outfiles/${orgCodeFiles[index].name}.log`;
const headers = `"Index","Name","Title","Email Domain","Area","Article Titles (Delimited by ###)"`;

const retrieve10Page = async (outFileName, logFileName, path, univOfCounter, univMaxCount, userCounter, numOfTry) => {
    univOfCounter = univOfCounter || 0;
    univMaxCount = univMaxCount || 0;
    userCounter = userCounter || 0;
    numOfTry = numOfTry || 0
    path = sanitize(path);

    if (userCounter === 0) {
        console.log(univOfCounter, orgCodeFiles[univOfCounter].name, `${userCounter}`.padStart(4, ' '), path);
        resetFile(outFileName);
        appendToFile(outFileName, `${headers}\n`)
        resetFile(logFileName);
    }

    // TODO: how to handle retry in fetching a list?
    appendToFile(logFileName, `${ univOfCounter }, ${ orgCodeFiles[univOfCounter].name}, ${userCounter.toString().padStart(4, ' ')}, ${path}\n`)
    let profiles = null;
    try {
        profiles = await axios(`${domain}${path}`);
    }
    catch (err) {
        // try 3 times.
        if (numOfTry > 2) {
            const message = `Failed with ${numOfTry} times: ${path}, and EXIT program.`;
            console.warn(message);
            appendToFile(logFileName, message);
        } else {
            ++numOfTry;
            const message = `Retry fetching in ${numOfTry} time: ${path}`;
            console.warn(message);
            appendToFile(logFileName, message);
            setTimeout(async () => await retrieve10Page(outFileName, logFileName, path, univOfCounter, univMaxCount, userCounter, numOfTry), getRandomArbitrary(MIN, MAX));
        } 
        return;
    }

    const html = profiles.data;
    const root = parse(html);
    const buttonNext = root.querySelector('.gs_btnPR');
    const users = root.querySelectorAll('.gsc_1usr');

    const articles = users.map((user) => {
        const name = user.querySelector('.gs_ai_name a');
        const emailDomain = user.querySelector('.gs_ai_eml').text.replace('Verified email at ', '');
        const keywords = user.querySelectorAll('.gs_ai_int .gs_ai_one_int').map(kw => kw.text).join('/');
        const articlePromise = axios(`${domain}${name.attributes.href}&oe=UTF8`);
        return { name, emailDomain, keywords, articlePromise };
    });

    let pathNext = convertOnClickUrl(buttonNext.rawAttrs.split(' ')[1]); 

    const articleFetch = async (articles, numOfTry) => {
        if (articles.length === 0) {
            // The second attribute is not onclick event handle means it reached the end of pages.
            if (pathNext === 'aria-label="Next"') {
                ++univOfCounter;
                userCounter = 0;
                if (univOfCounter < univMaxCount) {
                    const univ = orgCodeFiles[univOfCounter];
                    pathNext = `/citations?view_op=view_org&hl=en&org=${univ.code}`;
                    outFileName = `./outfiles/${univ.name}.csv`;
                    setTimeout(async () => await retrieve10Page(outFileName, `./outfiles/${orgCodeFiles[univOfCounter].name}.log`, pathNext, univOfCounter, univMaxCount, userCounter), getRandomArbitrary(MIN, MAX));
                }
            } else {
                setTimeout(async () => await retrieve10Page(outFileName, `./outfiles/${orgCodeFiles[univOfCounter].name}.log`, pathNext, univOfCounter, univMaxCount, userCounter), getRandomArbitrary(MIN, MAX));
            }
        }
        else {
            const { name, emailDomain, keywords, articlePromise } = articles[0];
            try {
                const response = await articlePromise;
                const articleHtml = response.data;
                const articleHtmlRoot = parse(articleHtml);
                const affiliateTitle = articleHtmlRoot.querySelector('div.gsc_prf_il').text;
                const articleTitles = [...articleHtmlRoot.querySelectorAll('td.gsc_a_t a')].map(elm => elm.text);
                const articlePublishes = [...articleHtmlRoot.querySelectorAll('td.gsc_a_t div.gs_gray')].filter((elm, idx) => idx % 2 === 1).map(elm => elm.text);

                const articleInfos = articleTitles.map((title, index) => ({title, publisher: articlePublishes[index]}));
                const columns = [
                    userCounter.toString().escapeDoubleQuotes(),
                    name.text.escapeDoubleQuotes(),
                    affiliateTitle.escapeDoubleQuotes(),
                    emailDomain.escapeDoubleQuotes(),
                    keywords.escapeDoubleQuotes(),
                    articleInfos.map(article => `${article.title.escapeDoubleQuotes()}`).join('###')
                ];
                appendToFile(outFileName, `${columns.map(str => `"${str}"`).join(',')}\n`)
                ++userCounter;
                articles.shift();
                setTimeout(async () => await articleFetch(articles, 0), getRandomArbitrary(5, 10));
            }
            catch (error) {
                // try 3 times.
                if (numOfTry > 2) {
                    const message = `Skip with ${numOfTry} times: ${name.attributes.href}`;
                    console.warn(message);
                    appendToFile(logFileName, `${message}\n`);
                    articles.shift();
                    setTimeout(async () => await articleFetch(articles, 0), getRandomArbitrary(5, 10));
                } else {
                    ++numOfTry;
                    const message = `Retry fetching in ${numOfTry} time: ${name.attributes.href}`;
                    console.warn(message);
                    appendToFile(logFileName, `${message}\n`);
                    articles[0].articlePromise = axios(`${error.config.url}`);
                    setTimeout(async () => await articleFetch(articles, numOfTry), getRandomArbitrary(5, 10));
                } 
            }
        }
    };
    await articleFetch(articles, 0);
};

retrieve10Page(outFileName, logFileName, seedPath, index, univMaxCount, userCounter, 0);

// const test = async () => {
//     const promises = Array.from([1]).forEach(async (elm) => { 
//         try {
//             await axios('https://wwy.jjjjjjjjjjjjj.com');
//         } 
//         catch(error) {
//             console.warn('Caught early');       
//         }
//     });
// };

// const test2 = async () => {
//     try {
//         const promises = await allSettled(Array.from([1,2,3]).map(() => axios('https://wwy.jjjjjjjjjjjjj.com')));
//         console.warn('...');
//     } catch (errors) {
//         console.warn('Caught early');
//     }
// };

// test2();