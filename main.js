#!/usr/bin/env node

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
  // console.log(chalk.blue(url));
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

function getRequestify (requestifyUrl, requestifyOptions) {
  console.log('start getRequestify');
  return requestify.get(requestifyUrl, requestifyOptions)
  .then(function(response) {
    console.log('then getRequestify');
    let body = response.getBody();
    let newRepoUrls = [];
    for (var i = 0; i < body.length; i++) {
      let htmlUrl = body[i].html_url;
      console.log(htmlUrl);
      newRepoUrls.push(htmlUrl);
    }
    return newRepoUrls;
  }).catch(function(err) {
    console.log('fail getRequestify');
    console.log(err);
  });
}

function getRepoUrls (repoUrls, requestifyUrl, requestifyOptions) {
  console.log('start repoUrls');
  return getRequestify(requestifyUrl, requestifyOptions).then(function(response){
    repoUrls.push(response);
    console.log('then getRepoUrls');
    return repoUrls;
  }).catch(function(err) {
    console.log('fail getRepoUrls');
    console.log(err);
  });
}
// function getRepoUrls (repoUrls, requestifyUrl, requestifyOptions) {
//   console.log(chalk.magenta('start getRepoUrls'));
//   repoUrls = repoUrls.push(getRequestify(requestifyUrl, requestifyOptions))
//   return repoUrls;
// }

function concatRepoUrls (repoUrls, user, page, requestifyOptions) {
  console.log('start concatRepoUrls');
  repoLen = repoUrls.length;
  let requestifyUrl = requestifyUrlFunc(user, page);
  return getRepoUrls(repoUrls, requestifyUrl, requestifyOptions).then(function(response) {
    console.log('then concatRepoUrls');
    let addRepoUrls = response;
    console.log(addRepoUrls.length);
    if (addRepoUrls.length) {
      console.log('recursive getRepoUrls');
      repoUrls.concat(addRepoUrls);
      page++;
      console.log('user: ' + user + ', page: ' + page);
      requestifyUrl = requestifyUrlFunc(user, page);
      return getRepoUrls(repoUrls, requestifyUrl, requestifyOptions);
    }
    return repoUrls;
  }).catch(function(err) {
    console.log('fail concatRepoUrls');
    console.log(err);
  })
}
// function concatRepoUrls (repoUrls, user, page, requestifyOptions) {
//   repoLen = repoUrls.length;
//   let requestifyUrl = requestifyUrlFunc(user, page);
//   let addRepoUrls = getRepoUrls(repoUrls, requestifyUrl, requestifyOptions);
//   if (addRepoUrls.length) {
//     repoUrls = repoUrls.concat(addRepoUrls);
//   }
//   if (repoUrls.length > repoLen) {
//     console.log(chalk.blue('go again'));
//     page++;
//     requestifyUrl = requestifyUrlFunc(user, page)
//     getRepoUrls(repoUrls, requestifyUrl, requestifyOptions);
//   }
//   console.log(repoUrls);
//   return repoUrls;
// }

function userRepoUrls (user, requestifyOptions) {
  console.log('start userRepoUrls');
  let page = 1;
  let repoUrls = [];
  return concatRepoUrls(repoUrls, user, page, requestifyOptions).then(function(response) {
    console.log('then userRepoUrls');
    let userRepoUrls = response;
    console.log(response); //broken here
    return userRepoUrls;
  }).catch(function(err) {
    console.log('fail userRepoUrls');
    console.log(err);
  });
}
// function userRepoUrls (user, requestifyOptions) {
//   let page = 1;
//   let repoUrls = [];
//   let oldLen = repoUrls.length;
//   let userRepoUrls = concatRepoUrls(repoUrls, user, page, requestifyOptions, oldLen)
//   return userRepoUrls;
// }

for (var i = 0; i < arrUsers.length; i++) {
  let user = arrUsers[i];
  masterRepoUrls[user] = userRepoUrls(user, requestifyOptions);
}

console.log('nope', masterRepoUrls.jlarmstrongiv[0]);
var really = JSON.stringify(masterRepoUrls);
console.log(really);
// Chalk Example

// log(`
//   user: {red ${chalk.red(program.user)}}
//   folder: {blue ${program.folder}}
//   users: {green ${program.users}}
// `);

console.log('hi');

// log(program.user);
// log(program.folder);
// log(program.users);
// console.log(memo.length);

var url = 'https://api.github.com/users/tkbell51/repos?page=1';
// requestify.get('')
