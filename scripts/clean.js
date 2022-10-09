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
const blacklist = p.resolve(__dirname, '../blacklist.txt');

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
const rawBlackList = [...new Set(fs.readFileSync(blacklist)
    .toString()
    .trim()
    .split("\n"))];
const cleanedList = rawList.filter((domain) => psl.parse(domain).listed).filter((domain) => !rawBlackList.includes(domain));
const cleanedInactiveList = rawInactiveList.filter((domain) => psl.parse(domain).listed);
console.log(`Got ${cleanedList.length} unique domains`);
console.log(`Got ${cleanedInactiveList.length} inactive unique domains`);

fs.writeFileSync(path, cleanedList.join("\n"))
fs.writeFileSync(pathJson, JSON.stringify(cleanedList))

fs.writeFileSync(pathTotalActive, cleanedList.length.toString())


fs.writeFileSync(pathInactive, cleanedInactiveList.join("\n"))
fs.writeFileSync(pathInactiveJson, JSON.stringify(cleanedInactiveList))

fs.writeFileSync(pathTotalInactive, cleanedInactiveList.length.toString())
