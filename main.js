#!/usr/bin/env node
'use strict'
const program = require('commander')
, path = require('path')
, fse = require('fse')
, requestify = require('requestify')
, cmd = require('node-cmd')
, chalk = require('chalk')
, fetch = require('node-fetch')
, log = console.log;

// Commander Functions
function collect(val, memo) {
  memo.push(val)
  return memo;
}

function list(val) {
  return val.split(',')
}

// Commander Config
program
  .version('0.0.1')
  .option('-f, --folder', 'Create in folder')
  .option('-u, --user <user>', 'Github username', collect, [])
  .option('-u, --users <users>', 'Github username list', list)
  .option('-t, --token <token>', 'Github token')
  .parse(process.argv);   // .action(mainFunction); ?

let arrUsers = [];
if (program.user) {
  arrUsers = arrUsers.concat(program.user);
}
if (program.users) {
  arrUsers = arrUsers.concat(program.users)
}
console.log(chalk.blue(arrUsers));

let token = 'cd998afc37e5104e2e1323343bd4cfd212e2887d';
let requestifyOptions = requestifyOptionsFunc(token);
// let requestifyOptions = requestifyOptionsFunc();

let masterRepoUrls = [];

function requestifyUrlFunc (user, page) {
  let url = 'https://api.github.com/users/' + user + '/repos?page=' + page;
  return url;
}

function requestifyOptionsFunc (token) {
  let requestifyOptions = {};
  if (token) {
    console.log(chalk.blue(token));
    token = 'token ' + token;
    requestifyOptions.headers = {
      Authorization: token
    }
  }
  return requestifyOptions;
}

function getRequestify (repoUrls, requestifyUrl, requestifyOptions) {
  console.log('start getRequestify');
  return requestify.get(requestifyUrl, requestifyOptions, repoUrls)
  .then(function(response) {
    console.log('then getRequestify');
    let body = response.getBody();
    let newRepoUrls = [];
    for (var i = 0; i < body.length; i++) {
      let htmlUrl = body[i].html_url;
      newRepoUrls.push(htmlUrl);
    }
    if (newRepoUrls.length) {
      console.log('if getRequestify');
      repoUrls = repoUrls.concat(newRepoUrls);
    }
    return repoUrls;
  }).catch(function(err) {
    console.log('fail getRequestify');
    console.log(err);
  });
}

function concatRepoUrls (repoUrls, user, page, requestifyOptions) {
  console.log('start concatRepoUrls');
  console.log('user: ' + user + ', page: ' + page);
  let requestifyUrl = requestifyUrlFunc(user, page);
  return getRequestify(repoUrls, requestifyUrl, requestifyOptions).then(function(response) {
    console.log('then concatRepoUrls');
    let addRepoUrls = response;
    console.log('addRepoUrls.length ', addRepoUrls.length);
    console.log('repoUrls.length ', repoUrls.length);
    if (addRepoUrls.length > repoUrls.length) {
      console.log('recursive getRepoUrls');
      page++;
      requestifyUrl = requestifyUrlFunc(user, page);
      return concatRepoUrls(addRepoUrls, user, page, requestifyOptions);
    } else {
      console.log('else concatRepoUrls');
      return repoUrls;
    }
  }).catch(function(err) {
    console.log('fail concatRepoUrls');
    console.log(err);
  })
}

function userRepoUrls (user, requestifyOptions) {
  console.log('start userRepoUrls');
  let page = 1;
  let repoUrls = [];
  return concatRepoUrls(repoUrls, user, page, requestifyOptions).then(function(response) {
    console.log('then userRepoUrls');
    console.log(response);
    let userRepoUrls = response;
    return userRepoUrls;
  }).catch(function(err) {
    console.log('fail userRepoUrls');
    console.log(err);
  });
}

for (var i = 0; i < arrUsers.length; i++) {
  let user = arrUsers[i];
  masterRepoUrls[user] = userRepoUrls(user, requestifyOptions);
}
let stringMasterRepoUrls = JSON.stringify(masterRepoUrls);
console.log(chalk.red(stringMasterRepoUrls));

// Chalk Example

// log(`
//   user: {red ${chalk.red(program.user)}}
//   folder: {blue ${program.folder}}
//   users: {green ${program.users}}
// `);

// log(program.user);
// log(program.folder);
// log(program.users);
// console.log(memo.length);

var url = 'https://api.github.com/users/tkbell51/repos?page=1';
// requestify.get('')
