'use strict';

const fs = require('fs');
const p = require('path');
const psl = require('psl');
const dns = require('dns');
const _ = require('lodash');

const path = p.resolve(__dirname, '../list.txt');
const pathJson = p.resolve(__dirname, '../list.json');
const pathTotalActive = p.resolve(__dirname, '../total-active.txt');
const rawList = [...new Set(fs.readFileSync(path)
    .toString()
    .trim()
    .split("\n"))]
    .sort();

const cleanedList = rawList.filter((domain) => psl.parse(domain).listed);
console.log(`Got ${cleanedList.length} unique domains`);

fs.writeFileSync(path, cleanedList.join("\n"))
fs.writeFileSync(pathJson, JSON.stringify(cleanedList))

fs.writeFileSync(pathTotalActive, cleanedList.length.toString())
