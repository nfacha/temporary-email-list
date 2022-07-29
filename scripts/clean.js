'use strict';

const fs = require('fs');
const p = require('path');
const psl = require('psl');
const dns = require('dns');
const _ = require('lodash');

function checkMxRecords(list) {

    return new Promise(async function (resolve, reject) {
        let activeList = [];
        let inactiveList = [];
        let c = 0;
        let cc = 0;
        const chunks = _.chunk(list, 300);
        console.log(`Total chunks: ${chunks.length}`);
        for(let chunk of chunks){
            cc++;
            console.log(`Chunk ${cc} of ${chunks.length}`);
            for (let domain of chunk) {
                console.log(`Checking MX records for ${domain}`);
                dns.resolveMx(domain, (err, addresses) => {
                    c++;
                    if (err && err.code === 'ENOTFOUND') {
                        inactiveList.push(domain);
                    } else {
                        activeList.push(domain);
                    }
                    if (c === list.length - 1) {
                        resolve({active: activeList.sort(), inactive: inactiveList.sort()});
                    }
                });

            }
        }
    });
}

const path = p.resolve(__dirname, '../list.txt');
const pathJson = p.resolve(__dirname, '../list.json');
const pathInactive = p.resolve(__dirname, '../list-inactive.txt');
const pathInactiveJson = p.resolve(__dirname, '../list-inactive.json');
const pathTotalActive = p.resolve(__dirname, '../total-active.txt');
const pathTotalInactive = p.resolve(__dirname, '../total-inactive.txt');
const rawList = [...new Set(fs.readFileSync(path)
    .toString()
    .trim()
    .split("\n"))]
    .sort();

const cleanedList = rawList.filter((domain) => psl.parse(domain).listed);
console.log(`Got ${cleanedList.length} unique domains`);
console.log(`Checking MX records for ${cleanedList.length} domains`);
checkMxRecords(cleanedList).then(function (result) {
    console.log(`${result.active.length} domains have MX records`);
    console.log(`${result.inactive.length} domains do not have MX records`);

    fs.writeFileSync(path, result.active.join("\n"))
    fs.writeFileSync(pathJson, JSON.stringify(result.active))

    fs.writeFileSync(pathInactive, result.inactive.join("\n"))
    fs.writeFileSync(pathInactiveJson, JSON.stringify(result.inactive))

    fs.writeFileSync(pathTotalActive, result.active.length.toString())
    fs.writeFileSync(pathTotalInactive, result.inactive.length.toString())
});

