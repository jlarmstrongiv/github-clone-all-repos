#!/usr/bin/env node
'use strict'
const cwd = process.cwd();
const program = require('commander')
, path = require('path')
, fse = require('fs-extra')
, jsonfile = require('jsonfile')
, tokenfile = path.join(__dirname, 'token.json')
, requestify = require('requestify')
, chalk = require('chalk')
, git = require('simple-git/promise')

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
  .option('-U, --users <users>', 'Github username list', list)
  .option('-o, --org <org>', 'Github organization', collect, [])
  .option('-O, --orgs <orgs>', 'Github organization list', list)
  .option('-t, --token <token>', 'Temporary Github token')
  .option('-T, --Token <Token>', 'Save Github token')
  .parse(process.argv);   // .action(mainFunction); ?

// ==========================
// User and Org Array Builders
// ==========================

function arrReposFunc (one, list) {
  let arrRepos = [];
  if (one) {
    arrRepos = arrRepos.concat(one);
  }
  if (list) {
    arrRepos = arrRepos.concat(list)
  }
  console.log(chalk.blue(arrRepos));
  return arrRepos;
}
let arrUsers = arrReposFunc(program.user, program.users);
let arrOrgs = arrReposFunc(program.org, program.orgs);
let arrRepos = arrReposFunc(arrUsers, arrOrgs);

// ==========================
// Token Verifyer
// ==========================

let token = 'cd998afc37e5104e2e1323343bd4cfd212e2887d';
let requestifyOptions = requestifyOptionsFunc(token);
// let requestifyOptions = requestifyOptionsFunc();

function validateToken(token) {
  let requestifyUrl = 'https://api.github.com'
  let requestifyOptions = requestifyOptionsFunc(token);

  return requestify.get(requestifyUrl, requestifyOptions, token).then(function(response) {
    return token;
  }).fail(function(response){
    // let body = response.getBody();
    // console.log(requestifyUrl);
    // console.log(response.getCode());
    // console.log(body.message);
    // console.log(body.documentation_url);
    // muted due to duplication and not necessary an end-all
    return null; //should handle error by gracefully stopping app
  }).catch(function(err){
    console.log('fail requestifyToken');
    console.log(err);
    return null; //should handle error by gracefully stopping app
  });
}

function readTokenFile() {
  let tokenObj = jsonfile.readFileSync(tokenfile);
  return tokenObj.token;
}

function writeTokenFile(token) {
  let tokenObj = {
    token: token
  }
  jsonfile.writeFileSync(tokenfile, tokenObj, {spaces: 2})
}

function validateTokens(token, Token) {
  if (token) {
    console.log('if token', token);
    return token;
  } else if (Token) {
    console.log('if Token', Token);
    writeTokenFile(Token);
    return Token;
  } else if ((program.token) && (program.Token)) {
    console.log('if both', Token);
    writeTokenFile(Token);
    return token;
  } else if (!(program.token) && !(program.Token)) {
    console.log('if none');
    let savedToken = readTokenFile();
    console.log(savedToken);
    if (savedToken) {
      console.log('if saved', savedToken);
      return savedToken;
    } else {
      console.log('not saved', savedToken);
      throw 'no token';
    }
  }
}
// validateTokens(validateToken(program.token), validateToken(program.Token));

function getMasterToken(token, Token) {
  let promises = [];
  promises.push(validateToken(program.token))
  promises.push(validateToken(program.Token))
  return Promise.all(promises).then(function(response) {
    let token = response[0];
    let Token = response[1];
    return validateTokens(token, Token);
  }).catch(function(err) {
    console.log('fail getMasterToken');
    console.log(err);
  })
}
// ==========================
// JSON Builder
// ==========================

function requestifyUserUrlFunc (user, page) {
  return 'https://api.github.com/users/' + user + '/repos?page=' + page + '&sort=created'; //perhaps make an option for sorting
}

function requestifyOrgUrlFunc (org, page) {
  return 'https://api.github.com/orgs/' + org + '/repos?page=' + page + '&sort=created';
}

function requestifyOptionsFunc (token) {
  let requestifyOptions = {};
  if (token) {
    // console.log(token);
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

function concatRepoUrls (repoUrls, type, instance, page, requestifyOptions) {
  // console.log('start concatRepoUrls');
  // console.log('instance: ' + instance + ', page: ' + page);
  let requestifyUrl;
  if (type === 'users') {
    requestifyUrl = requestifyUserUrlFunc(instance, page);
  } else if (type === 'orgs') {
    requestifyUrl = requestifyOrgUrlFunc(instance, page);
  } else {
    throw 'must specify type'
  }
  return getRequestify(repoUrls, requestifyUrl, requestifyOptions).then(function(response) {
    // console.log('then concatRepoUrls');
    let addRepoUrls = response;
    // console.log('addRepoUrls.length ', addRepoUrls.length);
    // console.log('repoUrls.length ', repoUrls.length);
    if ((addRepoUrls.length > repoUrls.length) && !(addRepoUrls.length % 30)) {
      // && !(addRepoUrls.length % 30)
      // ensure it only asks for more if the last request was full, saves 1 request per instance
      // console.log('recursive getRepoUrls');
      page++;
      requestifyUrl = requestifyUserUrlFunc(instance, page);
      return concatRepoUrls(addRepoUrls, type, instance, page, requestifyOptions);
    } else {
      // console.log('else concatRepoUrls');
      return addRepoUrls;
    }
  }).catch(function(err) {
    console.log('fail concatRepoUrls');
    console.log(err);
  })
}

function repoUrls (type, instance, requestifyOptions) {
  // console.log('start repoUrls');
  let page = 1;
  let repoUrls = [];
  return concatRepoUrls(repoUrls, type, instance, page, requestifyOptions).then(function(repoUrls) {
    // console.log('then repoUrls');
    return repoUrls;
  }).catch(function(err) {
    console.log('fail repoUrls');
    console.log(err);
  });
}

function getMasterRepoUrls (arrUsers, arrOrgs, arrRepos, requestifyOptions) {
  let promises = [];
  for (let i = 0; i < arrUsers.length; i++) {
    promises.push(repoUrls('users', arrUsers[i], requestifyOptions))
  }
  for (let i = 0; i < arrOrgs.length; i++) {
    promises.push(repoUrls('orgs', arrOrgs[i], requestifyOptions))
  }
  return Promise.all(promises).then(function(response) {
    let objRepoUrls = {};
    for (var i = 0; i < arrRepos.length; i++) {
      objRepoUrls[arrRepos[i]] = response[i];
    }
    // console.log('objRepoUrls', objRepoUrls);
    return objRepoUrls;
  }).catch(function(err) {
    console.log('fail promises');
    console.log(err);
  })
}
// ==========================
// Folder Checker and Creator
// ==========================

function checkFolder (originalPath, counter) {
  let path;
  if (counter) {
    path = cwd + '/' + originalPath + '-' + counter;
    // console.log('checkPath', path);
  } else {
    path = cwd + '/' + originalPath;
    // console.log('checkPath', path);
  }
  return fse.pathExists(path).then(function(response){
    // console.log('checkPath', response);
    if (response) {
      counter++
      // console.log('checkCounter', counter);
      return checkFolder(originalPath, counter);
    }
    return path;
  }).catch(function(err){
    console.log('fail checkFolder');
    console.log(err);
  })
}

function checkFolders (arrRepos) {
  let promises = [];
  for (var i = 0; i < arrRepos.length; i++) {
    promises.push(checkFolder(arrRepos[i], 0));
  }
  return Promise.all(promises).then(function(response){
    // console.log('promiseAll', response);
    return response;
  }).catch(function(err){
    console.log('fail checkFolders');
    console.log(err);
  })
}

function createFolder (folderPath) {
  // console.log('start createFolder');
  return fse.ensureDir(folderPath).then(function(){
    return true;
  }).catch(function(err){
    console.log('fail createFolder');
    console.log(err);
  })
}

function createFolders (arrFolderPath) {
  // console.log('start createFolders');
  let promises = [];
  for (var i = 0; i < arrFolderPath.length; i++) {
    promises.push(createFolder(arrFolderPath[i]));
  }
  return Promise.all(promises).then(function(response){
    // console.log('createFolders response', response);
    return response; // remove then entirely?
  }).catch(function(err){
    console.log('fail createFolders');
    console.log(err);
  })
}

function createMasterFolders (arrRepos) {
  // console.log('arrRepos', arrRepos);
  return checkFolders(arrRepos).then(function(arrFolderPath) {
    // console.log('checkFolders response, ', arrFolderPath);
    return createFolders(arrFolderPath).then(function(arrIsCreated){
      for (var i = 0; i < arrIsCreated.length; i++) {
        if (!arrIsCreated[i]) {
          throw 'Error createFolders' //should handle error by gracefully stopping app
        }
      }
      return arrFolderPath;
    });
  }).catch(function(err) {
    console.log();
  });
}

// ==========================
// Git Cloning
// ==========================

// clone with oath token https://stackoverflow.com/questions/42148841/github-clone-with-oauth-access-token
// think about implement for rate limiting with ocot https://github.com/pksunkara/octonode or just see if api endpoint exists
// gitCloning(arrFolderPath, arrUsers)
// git vs npm ignore

function gitCloning (repoUrlsArry, folderPaths) {
  // console.log(repoUrlsArry);
  let regexpattern = new RegExp('.*\/');
  // create in case folder already exists
  let localPathPrefix = [];
  for (var i = 0; i < folderPaths.length; i++) {
    localPathPrefix.push(folderPaths[i].replace(regexpattern, ''))
  }
  console.log(localPathPrefix);
  let promises = [];
  for (let i = 0, keys = Object.keys(repoUrlsArry); i < keys.length; i++) {
    console.log(chalk.greenBright(keys[i]));
    let arrName = keys[i];
    for (let j = 0; j < repoUrlsArry[arrName].length; j++) {
      let remotePath = repoUrlsArry[arrName][j];
      let repoName = remotePath.replace(regexpattern, '')
      let localPath = localPathPrefix[i] + '/' + repoName;
      // console.log('mypath', remotePath, localPath)
      promises.push(git().silent(true)
      .clone(remotePath, localPath) // , [options], [handlerFn]
        .then(() => console.log('finished')) // 'mypath', remotePath, localPath
        .catch((err) => console.error('failed: ', err))
      )
    }
  }
  return Promise.all(promises);
}

// git().silent(false)
// .clone(remotePath, localPath) // , [options], [handlerFn]
//   .then(() => console.log('finished'))
//   .catch((err) => console.error('failed: ', err));



// ==========================
// Main
// ==========================

function main(arrUsers, arrOrgs, arrRepos, token, Token) {
  return getMasterToken(token, Token) // returns token to use
    .then(function(token) {
      let promises = [];
      console.log(chalk.greenBright(JSON.stringify(requestifyOptionsFunc(token))));
      promises.push(getMasterRepoUrls(arrUsers, arrOrgs, arrRepos, requestifyOptionsFunc(token)))
      promises.push(createMasterFolders(arrRepos));
      return Promise.all(promises);
    })
    .then(function(response){
      let repoUrlsArry = response[0];
      let folderPaths = response[1];
      // console.log('repoUrlsArry', repoUrlsArry);
      // console.log('folderPaths', folderPaths);
      return gitCloning(repoUrlsArry, folderPaths);
    })
    .then(function(response) {
      console.log('end');
    }).catch(function(err) {
      console.log('main failed');
      console.log(err);
    })
}
main(arrUsers, arrOrgs, arrRepos, program.token, program.Token);

// npmu node-fetch shelljs git-clone async node-cmd

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
