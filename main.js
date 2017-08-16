#!/usr/bin/env node
'use strict'
const cwd = process.cwd();
const program = require('commander')
, path = require('path')
, fse = require('fs-extra')
, requestify = require('requestify')
, cmd = require('node-cmd')
, chalk = require('chalk')
, fetch = require('node-fetch')
, simpleGit = require('simple-git')(cwd)
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

// ==========================
// JSON Builder
// ==========================

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
  // console.log('start getRequestify');
  return requestify.get(requestifyUrl, requestifyOptions, repoUrls)
  .then(function(response) {
    // console.log('then getRequestify');
    let body = response.getBody();
    let newRepoUrls = [];
    for (var i = 0; i < body.length; i++) {
      let htmlUrl = body[i].html_url;
      newRepoUrls.push(htmlUrl);
    }
    if (newRepoUrls.length) {
      // console.log('if getRequestify');
      repoUrls = repoUrls.concat(newRepoUrls);
    }
    return repoUrls;
  }).fail(function(response) {
    let body = response.getBody();
    console.log(requestifyUrl);
    console.log(response.getCode());
    console.log(body.message);
    console.log(body.documentation_url);
    return repoUrls;
  }).catch(function(err) {
    console.log('fail getRequestify');
    console.log(err);
  });
}

function concatRepoUrls (repoUrls, user, page, requestifyOptions) {
  // console.log('start concatRepoUrls');
  // console.log('user: ' + user + ', page: ' + page);
  let requestifyUrl = requestifyUrlFunc(user, page);
  return getRequestify(repoUrls, requestifyUrl, requestifyOptions).then(function(response) {
    // console.log('then concatRepoUrls');
    let addRepoUrls = response;
    // console.log('addRepoUrls.length ', addRepoUrls.length);
    // console.log('repoUrls.length ', repoUrls.length);
    if (addRepoUrls.length > repoUrls.length && !(addRepoUrls.length % 30)) {
      //ensure it only asks for more if the last request was full, saves 1 request per user
      // console.log('recursive getRepoUrls');
      page++;
      requestifyUrl = requestifyUrlFunc(user, page);
      return concatRepoUrls(addRepoUrls, user, page, requestifyOptions);
    } else {
      // console.log('else concatRepoUrls');
      return repoUrls;
    }
  }).catch(function(err) {
    console.log('fail concatRepoUrls');
    console.log(err);
  })
}

function userRepoUrls (user, requestifyOptions) {
  // console.log('start userRepoUrls');
  let page = 1;
  let repoUrls = [];
  return concatRepoUrls(repoUrls, user, page, requestifyOptions).then(function(userRepoUrls) {
    // console.log('then userRepoUrls');
    return userRepoUrls;
  }).catch(function(err) {
    console.log('fail userRepoUrls');
    console.log(err);
  });
}

function getMasterRepoUrls (arrUsers) {
  let promises = [];
  for (let i = 0; i < arrUsers.length; i++) {
    promises.push(userRepoUrls(arrUsers[i], requestifyOptions))
  }
  return Promise.all(promises).then(function(response) {
    let objUserUrls = {};
    for (var i = 0; i < arrUsers.length; i++) {
      objUserUrls[arrUsers[i]] = response[i];
    }
    return objUserUrls;
  }).catch(function(err) {
    console.log('fail promises');
    console.log(err);
  })
}
// ==========================
// Folder and File Creation
// ==========================

function checkFolder (originalPath, counter) {
  let path;
  if (counter) {
    path = cwd + '/' + originalPath + '-' + counter;
    console.log('checkPath', path);
  } else {
    path = cwd + '/' + originalPath;
    console.log('checkPath', path);
  }
  return fse.pathExists(path).then(function(response){
    console.log('checkPath', response);
    if (response) {
      counter++
      console.log('checkCounter', counter);
      return checkFolder(originalPath, counter);
    }
    return path;
  }).catch(function(err){
    console.log('fail checkFolder');
    console.log(err);
  })
}

function checkFolders (arrUsers) {
  let promises = [];
  for (var i = 0; i < arrUsers.length; i++) {
    promises.push(checkFolder(arrUsers[i], 0));
  }
  return Promise.all(promises).then(function(response){
    console.log('promiseAll', response);
    return response;
  }).catch(function(err){
    console.log('fail checkFolders');
    console.log(err);
  })
}

function createFolder (folderPath) {
  console.log('start createFolder');
  return fse.ensureDir(folderPath).then(function(){
    return true;
  }).catch(function(err){
    console.log('fail createFolder');
    console.log(err);
  })
}

function createFolders (arrFolderPath) {
  console.log('start createFolders');
  let promises = [];
  for (var i = 0; i < arrFolderPath.length; i++) {
    promises.push(createFolder(arrFolderPath[i]));
  }
  return Promise.all(promises).then(function(response){
    console.log('createFolders response', response);
    return response; // remove then entirely? 
  }).catch(function(err){
    console.log('fail createFolders');
    console.log(err);
  })
}

// clone with oath token https://stackoverflow.com/questions/42148841/github-clone-with-oauth-access-token
// check validity of api token https://stackoverflow.com/questions/22438805/github-api-oauth-token-validation
// think about implement for rate limiting with ocot https://github.com/pksunkara/octonode or just see if api endpoint exists
// sort project by last modified date
function gitCloning (arrFolderPath, arrUsers) {

}

function runCreation (arrUsers) {
  console.log('arrUsers', arrUsers);
  return checkFolders(arrUsers).then(function(arrFolderPath) {
    console.log('checkFolders response, ', arrFolderPath);
    return createFolders(arrFolderPath).then(function(arrIsCreated){
      for (var i = 0; i < arrIsCreated.length; i++) {
        if (!arrIsCreated[i]) {
          throw 'Error createFolders'
        }
      }
      console.log(chalk.red('help'));
      return gitCloning(arrFolderPath, arrUsers);
    });
  }).catch(function(err) {
    console.log();
  });
}

function main(arrUsers) {
  return getMasterRepoUrls(arrUsers).then(function(response){
    // console.log(response);
    return runCreation(arrUsers);
  }).catch(function(err) {
    console.log('main failed');
    console.log(err);
  })
}
main(arrUsers);




// for (let i = 0; i < arrUsers.length; i++) {
//   let user = arrUsers[i];
//   masterRepoUrls[user] = userRepoUrls(user, requestifyOptions);
// }

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
