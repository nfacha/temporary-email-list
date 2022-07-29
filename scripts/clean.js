'use strict';

const fs = require('fs');
const p = require('path');
const psl = require('psl');

const path = p.resolve(__dirname, '../list.txt');
const pathJson = p.resolve(__dirname, '../list.json');
const rawList = [...new Set(fs.readFileSync(path)
    .toString()
    .trim()
    .split("\n"))]
    .sort();

const cleanedList = rawList.filter((domain) => psl.parse(domain).listed);

fs.writeFileSync(path, cleanedList.join("\n"))
fs.writeFileSync(pathJson, JSON.stringify(cleanedList))
