const fs = require('fs');
const fetch = require('node-fetch');
const { parse } = require('node-html-parser');
const { convertOnClickUrl } = require('./utilities/urlConverter');

const orgCodeFiles = [
    { code: '11816294095661060495', name: 'ucberkeley' },
    { code: '14108176128635076915', name: 'ucla'}
];

const index = 1;
const domain = 'https://scholar.google.com';
const seedPath = `/citations?view_op=view_org&hl=en&org=${orgCodeFiles[index].code}`;
const outFileName = `./outfiles/${orgCodeFiles[index].name}.csv`;
const interval = 1500;

const retrieve10Page = (outFileName, path, counter, maxCount, userCounter) => {
    counter = counter || 0;
    maxCount = maxCount || 10000;
    userCounter = userCounter || 0;

    if (counter === 0) {
        resetFile(outFileName);    
    }
    console.log(counter, path);
    fetch(`${domain}${path}`)
    .then(res => res.text())
    .then(html => {
        const root = parse(html);
        const buttonNext = root.querySelector('.gs_btnPR');
        const users = root.querySelectorAll('.gsc_1usr');

        users.forEach(user => {
            const name = user.querySelector('.gs_ai_name a');
            const affiliate = user.querySelector('.gs_ai_aff');
            const emailDomain = user.querySelector('.gs_ai_eml').text.replace('Verified email at ', '');
            const keywords = user.querySelectorAll('.gs_ai_int .gs_ai_one_int').map(kw => kw.text).join('/');
            appendToFile(outFileName, `${userCounter}, ${name.text}, ${affiliate.text}, ${emailDomain}, ${keywords}\n`)
            ++userCounter;
        });

        const pathNext = convertOnClickUrl(buttonNext.rawAttrs.split(' ')[1]);

        if (!buttonNext.rawAttrs.includes('disabled')) {
            setTimeout(() =>retrieve10Page(outFileName, pathNext, ++counter, maxCount, userCounter), interval);
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

retrieve10Page(outFileName, seedPath, 0, 0);