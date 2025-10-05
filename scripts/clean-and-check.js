'use strict';

const fs = require('fs');
const p = require('path');
const psl = require('psl');
const dns = require('dns');
const _ = require('lodash');

const resolver = new dns.Resolver();
resolver.setServers(['1.1.1.1', '1.0.0.1', '8.8.8.8', '8.8.4.4']);

const CONCURRENCY = parseInt(process.env.DNS_CONCURRENCY || '200', 10); // parallel lookups
const QUERY_TIMEOUT_MS = parseInt(process.env.DNS_TIMEOUT_MS || '5000', 10); // per-lookup timeout
const RETRIES = parseInt(process.env.DNS_RETRIES || '1', 10); // retry count on failure

const path = p.resolve(__dirname, '../list.txt');
const pathJson = p.resolve(__dirname, '../list.json');
const pathInactive = p.resolve(__dirname, '../list-inactive.txt');
const pathInactiveJson = p.resolve(__dirname, '../list-inactive.json');
const pathTotalActive = p.resolve(__dirname, '../total-active.txt');
const pathTotalInactive = p.resolve(__dirname, '../total-inactive.txt');
const blacklist = p.resolve(__dirname, '../blacklist.txt');

const rawList = [...new Set(fs.readFileSync(path)
    .toString()
    .replace(/\r\n/g, '\n') // Normalize Windows line endings to Unix
    .trim()
    .split("\n"))]
    .sort();
const rawInactiveList = [...new Set(fs.readFileSync(pathInactive)
    .toString()
    .replace(/\r\n/g, '\n') // Normalize Windows line endings to Unix
    .trim()
    .split("\n"))]
    .sort();
const rawBlackList = [...new Set(fs.readFileSync(blacklist)
    .toString()
    .replace(/\r\n/g, '\n') // Normalize Windows line endings to Unix
    .trim()
    .split("\n"))];
const cleanedList = rawList.filter((domain) => psl.parse(domain).listed).filter((domain) => !rawBlackList.includes(domain));
const START_TS = Date.now();

console.log(`Got ${cleanedList.length} unique domains`);
console.log(`Checking MX records for ${cleanedList.length} domains`);
console.log(`Settings -> concurrency=${CONCURRENCY}, timeout=${QUERY_TIMEOUT_MS}ms, retries=${RETRIES}`);
checkMxRecords(cleanedList).then(function (result) {
    console.log(`${result.active.length} domains have MX records`);
    console.log(`${result.inactive.length} domains do not have MX records`);

    const elapsedSec = Math.max(1, Math.round((Date.now() - START_TS) / 1000));
    const rate = Math.round((cleanedList.length) / elapsedSec);
    console.log(`Completed in ${elapsedSec}s (≈${rate}/s)`);

    fs.writeFileSync(path, result.active.join("\n"))
    fs.writeFileSync(pathJson, JSON.stringify(result.active))

    fs.writeFileSync(pathInactive, result.inactive.join("\n"))
    fs.writeFileSync(pathInactiveJson, JSON.stringify(result.inactive))

    fs.writeFileSync(pathTotalActive, result.active.length.toString())
    fs.writeFileSync(pathTotalInactive, result.inactive.length.toString())
});

function resolveMxOnce(domain){
    return new Promise(function (resolve, reject) {
        resolver.resolveMx(domain, (err, addresses) => {
            if(err){
                reject(err);
            } else {
                resolve(addresses);
            }
        });
    });
}

function withTimeout(promise, ms){
    return Promise.race([
        promise,
        new Promise((_, reject) => {
            const id = setTimeout(() => {
                clearTimeout(id);
                reject(new Error('TIMEOUT'));
            }, ms);
        })
    ]);
}

async function querySingleDns(domain){
    let attempt = 0;
    while (true){
        try{
            const res = await withTimeout(resolveMxOnce(domain), QUERY_TIMEOUT_MS);
            return Array.isArray(res) && res.length > 0;
        }catch(e){
            if(attempt >= RETRIES){
                return false;
            }
            attempt++;
        }
    }
}


async function checkMxRecords(list) {
    const validDomains = [];
    const invalidDomainsSet = new Set(rawInactiveList);

    let processed = 0;
    const total = list.length;
    const t0 = Date.now();

    for (let i = 0; i < list.length; i += CONCURRENCY) {
        const chunk = list.slice(i, i + CONCURRENCY);

        const results = await Promise.all(chunk.map(domain => querySingleDns(domain)));

        for (let j = 0; j < chunk.length; j++){
            const domain = chunk[j];
            const ok = results[j];
            if (ok) {
                validDomains.push(domain);
            } else {
                invalidDomainsSet.add(domain);
            }
        }

        processed += chunk.length;
        const elapsedMs = Date.now() - t0;
        const elapsedSec = Math.max(1, Math.floor(elapsedMs / 1000));
        const rate = Math.round(processed / elapsedSec);
        const remaining = Math.max(0, total - processed);
        const etaSec = rate > 0 ? Math.round(remaining / rate) : 0;
        const pct = Math.round(processed / total * 100);
        if (processed % (CONCURRENCY * 2) === 0 || processed === total) {
            console.log(`Progress ${pct}% | ${processed}/${total} | active=${validDomains.length} inactive=${invalidDomainsSet.size} | rate≈${rate}/s | ETA≈${etaSec}s`);
        }
    }

    const filteredInvalidDomains = [...invalidDomainsSet].sort();
    return {active: validDomains, inactive: filteredInvalidDomains};
}
