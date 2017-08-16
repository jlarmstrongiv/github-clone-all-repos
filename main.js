#!/usr/bin/env node
'use strict'
const cwd = process.cwd();
const program = require('commander')
, path = require('path')
, fse = require('fs-extra')
, jsonfile = require('jsonfile')
, tokenfile = path.join(__dirname, 'token.json')
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
  .option('-t, --token <token>', 'Temporary Github token')
  .option('-T, --Token <Token>', 'Save Github token')
  .parse(process.argv);   // .action(mainFunction); ?

let arrUsers = [];
if (program.user) {
  arrUsers = arrUsers.concat(program.user);
}
if (program.users) {
  arrUsers = arrUsers.concat(program.users)
}
console.log(chalk.blue(arrUsers));

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
  jsonfile.writeFileSync(tokenfile, tokenObject, {spaces: 2})
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
    writeTokenFile(Token);
    console.log('if both', Token);
    return token;
  } else if (!(program.token) && !(program.Token)) {
    console.log('if none');
    let savedToken = readTokenFile();
    if (savedToken) {
      console.log('if saved', savedToken);
      return savedToken;
    } else {
      console.log('not saved', );
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
  let url = 'https://api.github.com/users/' + user + '/repos?page=' + page;
  return url;
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

function concatRepoUrls (repoUrls, user, page, requestifyOptions) {
  // console.log('start concatRepoUrls');
  // console.log('user: ' + user + ', page: ' + page);
  let requestifyUrl = requestifyUserUrlFunc(user, page);
  return getRequestify(repoUrls, requestifyUrl, requestifyOptions).then(function(response) {
    // console.log('then concatRepoUrls');
    let addRepoUrls = response;
    // console.log('addRepoUrls.length ', addRepoUrls.length);
    // console.log('repoUrls.length ', repoUrls.length);
    if ((addRepoUrls.length > repoUrls.length) && !(addRepoUrls.length % 30)) {
      // && !(addRepoUrls.length % 30)
      // ensure it only asks for more if the last request was full, saves 1 request per user
      // console.log('recursive getRepoUrls');
      page++;
      requestifyUrl = requestifyUserUrlFunc(user, page);
      return concatRepoUrls(addRepoUrls, user, page, requestifyOptions);
    } else if (!(addRepoUrls.length)) {
      // console.log('no new urls');
      return repoUrls;
    }else {
      // console.log('else concatRepoUrls');
      repoUrls = repoUrls.concat(addRepoUrls);
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

function getMasterRepoUrls (arrUsers, requestifyOptions) {
  let promises = [];
  for (let i = 0; i < arrUsers.length; i++) {
    promises.push(userRepoUrls(arrUsers[i], requestifyOptions))
  }
  return Promise.all(promises).then(function(response) {
    let objUserUrls = {};
    for (var i = 0; i < arrUsers.length; i++) {
      objUserUrls[arrUsers[i]] = response[i];
    }
    // console.log(objUserUrls);
    return objUserUrls;
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

function checkFolders (arrUsers) {
  let promises = [];
  for (var i = 0; i < arrUsers.length; i++) {
    promises.push(checkFolder(arrUsers[i], 0));
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

function runCreation (arrUsers) {
  // console.log('arrUsers', arrUsers);
  return checkFolders(arrUsers).then(function(arrFolderPath) {
    // console.log('checkFolders response, ', arrFolderPath);
    return createFolders(arrFolderPath).then(function(arrIsCreated){
      for (var i = 0; i < arrIsCreated.length; i++) {
        if (!arrIsCreated[i]) {
          throw 'Error createFolders' //should handle error by gracefully stopping app
        }
      }
      console.log(chalk.red('help'));
      return gitCloning(arrFolderPath, arrUsers);
    });
  }).catch(function(err) {
    console.log();
  });
}

// ==========================
// Git Cloning
// ==========================

// clone with oath token https://stackoverflow.com/questions/42148841/github-clone-with-oauth-access-token
// check validity of api token https://stackoverflow.com/questions/22438805/github-api-oauth-token-validation
// think about implement for rate limiting with ocot https://github.com/pksunkara/octonode or just see if api endpoint exists
// sort project by last modified date


function gitCloning (arrFolderPath, arrUsers) {

}

function main(arrUsers, token, Token) {
  return getMasterToken(token, Token)
    .then(function(response) {
      console.log('getMasterRepoUrls');
      return getMasterRepoUrls(arrUsers, requestifyOptionsFunc(response));
    })
    .then(function(response){
      console.log('runCreation');
      // console.log(response);
      return runCreation(arrUsers);
    })
    .then(function(response) {
      console.log('end');
    }).catch(function(err) {
      console.log('main failed');
      console.log(err);
    })
}

// Nested thens
// function main(arrUsers, token, Token) {
//   return getMasterToken(token, Token)
//     .then(getMasterRepoUrls(arrUsers)
//       .then(runCreation(arrUsers))
//         .then(function(response) {
//           console.log('end');
//         }))
//     .catch(function(err) {
//       console.log('main failed');
//       console.log(err);
//     })
// }

// Before getMasterToken
// getMasterToken(program.token, program.Token);
// function main(arrUsers) {
//   // add tokens
//   return getMasterRepoUrls(arrUsers).then(function(response){
//     // console.log(response);
//     return runCreation(arrUsers);
//   }).catch(function(err) {
//     console.log('main failed');
//     console.log(err);
//   })
// }
main(arrUsers, program.token, program.Token);




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
