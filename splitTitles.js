const { appendToFile, resetFile } = require('./utilities/urlConverter');

function main() {
    const lineReader = require('line-reader');
    const header = `"Index","Name","Title","Email Domain","Area","Title01","Title02","Title03","Title04","Title05","Title06","Title07","Title08","Title09","Title10","Title11","Title12","Title13","Title14","Title15","Title16","Title17","Title18","Title19","Title20"`;

    const files = [
        'ucberkeley',
        'ucdavid',
        'ucirvine',
        'ucla',
        'ucmerced',
        'ucriverside',
        'ucsb',
        'ucsc',
        'ucsd',
        'ucsf'
    ];

    files.forEach(filename => {
        let lineNo = 0;
        lineReader.eachLine(`./outfiles/bk3/${filename}.csv`, function(line) {
            if (filename === 'ucirvine' && lineNo > 112) {
                // debugger
            }
            if (lineNo === 0) {
                resetFile(`./outfiles/bk4/${filename}.csv`);
                appendToFile(`./outfiles/bk4/${filename}.csv`, header + '\n');
            } else {
                const columns = line.spreadTitles();
                appendToFile(`./outfiles/bk4/${filename}.csv`, columns.map(column => `"${column}"`).join(',') + '\n');
            }
            ++lineNo;
        });
    })
}

// const example = `"112","Eric S. SALTZMAN","""University of California, Irvine""  ""University of Miami""","uci.edu","","Climate and atmospheric history of the past 420,000 years from the Vostok ice core, Antarctica###On the limiting aerodynamic roughness of the ocean in very strong winds###20th-century industrial black carbon emissions altered arctic climate forcing###An updated climatology of surface dimethlysulfide concentrations and emission fluxes in the global ocean###Experimental determination of the diffusion coefficient of dimethylsulfide in water###A record of atmospheric halocarbons during the twentieth century from polar firn air###Methane sulfonic acid in the marine atmosphere###Ice-core record of oceanic emissions of dimethylsulphide during the last climate cycle###The holocene-younger dryas transition recorded at Summit, Greenland###Methanesulfonic acid and non-sea-salt sulfate in Pacific air: Regional and seasonal variations###Non‐sea‐salt sulfate and nitrate in trade wind aerosols at Barbados: Evidence for long‐range transport###Spatial and temporal variations of hydrogen peroxide in Gulf of Mexico waters###Processes controlling the distribution of aerosol particles in the lower marine boundary layer during the First Aerosol Characterization Experiment (ACE 1)###H2O2 levels in rainwater collected in South Florida and the Bahama Islands###Recent decreases in fossil-fuel emissions of ethane and methane derived from firn air###Four climate cycles in Vostok ice core###Impact of oceanic sources of biogenic sulphur on sulphate aerosol concentrations at Mawson, Antarctica###Atmospheric sulfur cycle simulated in the global model GOCART: Comparison with field observations and regional budgets###Photoreduction of iron (III) in marine mineral aerosol solutions###Climate change during the last deglaciation in Antarctica"`;
// console.log(example);
// console.log(JSON.stringify(example.spreadTitles(), null, 2));

main();