# github-clone-all-repos
![Compatibility not available](https://img.shields.io/badge/node%20compatibility-n%2Fa-lightgrey.svg)
![No tests written](https://img.shields.io/badge/test%20coverage-0%25-red.svg)
![Build might be working](https://img.shields.io/badge/build-passing%3F-yellow.svg)
![MIT License](https://img.shields.io/badge/license-MIT-blue.svg)

Node command line utility to clone all of a user’s or organization’s repositories.

## Why?
Even though it may not seem as necessary with Github, it would be nice to have a backup tool for all of one’s repositories (without having to clone each repository individually).

## Installation
You must have node installed.  

Run `$ npm install gcar -g`.

## How To
### Command
The base command is
`github-clone-all-repos`, or `gcar`, for short.

### Flags
```
-u, --user <user>    Github username
-U, --users <users>  Github username list

-o, --org <org>      Github organization
-O, --orgs <orgs>    Github organization list

-t, --token <token>  Temporary Github token
-T, --Token <Token>  Save Github token

-h, --help           output help information
```

### !important
**You must specify a Personal Github Token in order for the script to run**

These tokens can be generated at [https://github.com/settings/tokens](https://github.com/settings/tokens)

## Examples
*(The Personal Github Token used in the examples is not valid…)*

Clone a single user, without saving the token:

`gcar -u nick70 -t 4a68631afb82bala9f9c49892e0e3c82eaa7ef66`


Clone multple users, and save the token for later use:

`gcar -U BraxtonHath,nick70 -T 4a68631afb82bala9f9c49892e0e3c82eaa7ef66`


Clone a single organization:

`gcar -o tiy-greenville-summer-2017`


Mix-and-match multiple flags:

`gcar -o tiy-greenville-summer-2017 -U BraxtonHath,nick70 -u jennbowers`


## Notes
If you would like to contribute, see the TODO.md document.  Pull requests are welcome!

If there are any questions, comments, bugs, or issues, please use the [issues tab in Github](https://github.com/jlarmstrongiv/github-clone-all-repos/issues).

Hope you found this node script helpful!
