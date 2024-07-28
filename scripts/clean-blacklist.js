'use strict';

const fs = require('fs');
const p = require('path');
const psl = require('psl');
const dns = require('dns');
const _ = require('lodash');

const path = p.resolve(__dirname, '../blacklist.txt');


const rawList = [...new Set(fs.readFileSync(path)
    .toString()
    .replace(/\r\n/g, '\n') // Normalize Windows line endings to Unix
    .trim()
    .split("\n"))]
    .sort();
const cleanedList = rawList.filter((domain) => psl.parse(domain).listed);
console.log(`Got ${cleanedList.length} unique domains on blacklist`);

fs.writeFileSync(path, cleanedList.join("\n"))
