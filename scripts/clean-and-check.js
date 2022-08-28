'use strict';

const fs = require('fs');
const p = require('path');
const psl = require('psl');
const dns = require('dns');
const _ = require('lodash');

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
const rawInactiveList = [...new Set(fs.readFileSync(pathInactive)
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

function querySingleDns(domain){
    return new Promise(async function (resolve, reject) {
        dns.resolveMx(domain, (err, addresses) => {
            if(err){
                resolve(false);
            }else{
                resolve(true);
            }
        });
    });
}


async function checkMxRecords(list) {
    let validDomains = [];
    let invalidDomains = rawInactiveList;
    console.log(invalidDomains.length);
    for (const domain of list) {
        if (await querySingleDns(domain)) {
            validDomains.push(domain);
            console.log(`${domain} is valid`);
        } else {
            invalidDomains.push(domain);
            console.log(`${domain} is invalid`);
        }
    }
    let filteredInvalidDomains = [...new Set(invalidDomains)].sort();
    return {active: validDomains, inactive: filteredInvalidDomains};
}
