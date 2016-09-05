const hhAppParser = {
  // topListIndex 0 -> '/top100.htm', 1 -> '/sj100.htm'
  fetchTopComic(comicListType = 'top100', forceRefetch = false, fetchAndReplace = true) {
    if (comicListType == 'history') {
      return [];
    }
    if (hhApp.comicList[comicListType].length > 0 && !forceRefetch) {
      return hhApp.comicList[comicListType];
    }
    return hhAppParser.GM_xhr_get(hhAppConfig.comicListUrl(comicListType)).then(
      _comicListHTML => {
        const comicListHTML = _comicListHTML.responseText;
        let comicList = [];
        let comicsInfo = {};
        // get String segments which contain comic infomatiom from HTML"/top100.htm"
        if (comicListType == 'top100' || comicListType == 'sj100') {
          const topComicsInfo = comicListHTML.match(hhAppConfig.reg_TopComic);
          comicList = topComicsInfo.map(info => {
            // split the info String into a temp array
            // will get useless infomation except for those listed in return
            const arr = info.split(`"`);
            const comicid = arr[2].match(/\d+/)[0];
            Object.assign(comicsInfo, {
              [comicid]: {
                comicTitle: arr[10].indexOf('%u') > -1 ? unescape(arr[10]): arr[10],
                coverImageUrl: arr[6],
              }
            });
            return comicid;
          });
        }
        if (fetchAndReplace) {
          comicList.forEach(comicid => {
            if (hhApp.comicCache.hasOwnProperty(comicid)) {
              Object.assign(hhApp.comicCache[comicid], comicsInfo[comicid]);
            } else {
              Object.assign(hhApp.comicCache, {
                [comicid]: comicsInfo[comicid],
              })
            }
          })
          hhApp.comicList[comicListType] = comicList;
        }
        return comicList;
      },
      error => {
        return error;
      }
    );
  },
  fetchComicInfo(comicid, forceRefetch = false, fetchAndReplace = true) {
    if (hhApp.definedInDepth(hhApp.comicCache, [comicid, 'comicVolumnInfo'], true) && !forceRefetch) {
      return hhApp.comicCache[comicid];
    }
    // if (hhApp.comicCache.hasOwnProperty(comicid) && hhApp.comicCache[comicid].hasOwnProperty('comicVolumnInfo') && !forceRefetch) {
    //   return hhApp.comicCache[comicid];
    // }
    return hhAppParser.GM_xhr_get(hhAppConfig.comicPageUrl(comicid)).then(
      _comicPageHTML => {
        const comicPageHTML = _comicPageHTML.responseText;
        // reg to geta long string containing title, coverUrl, brief, author,
        // and useless part, which will be dropped by spliting the string
        const comicInfoSplit  = comicPageHTML.match(hhAppConfig.reg_ComicInfo)[0].split('"');
        //
        const coverImageUrl   = hhAppConfig.coverBaseUrl + comicInfoSplit[0];
        const comicTitle      = comicInfoSplit[2];
        const comicAuthor     = comicInfoSplit[15].match(hhAppConfig.reg_ComicInfoTitle)[1];
        const comicBrief      = comicInfoSplit[21].match(hhAppConfig.reg_ComicInfoBref)[1];
        // collection of <li> tag containing volumns info
        const comicVolumnLis  = comicPageHTML.match(hhAppConfig.reg_ComicVolumnLis);
        // volumn server, constant in the same comic
        let comicnServerId    = 0;
        let comicVolumns      = {};
        comicVolumnLis.forEach(comicVolumnLi => {
          const arr = comicVolumnLi.match(hhAppConfig.reg_ComicVolumnLi);
          comicnServerId = arr[2];
          const volumnid = arr[1];
          const volumnTitle = arr[3];
          Object.assign(comicVolumns, {
            [volumnid]: {
              volumnTitle
            }
          });
        });
        const comicInfo = {
          coverImageUrl,
          comicTitle,
          comicAuthor,
          comicBrief,
          comicnServerId,
          comicVolumns,
        };
        if (fetchAndReplace) {
          Object.assign(hhApp.comicCache, {
            [comicid]: comicInfo,
          })
        }
        return comicInfo;
      },
      error => {
        return error;
      }
    )
  },
  fetchVolumnImageUrls(comicid, volumnid, serverid, forceRefetch = false, fetchAndReplace = true) {
    if (hhApp.definedInDepth(hhApp.comicCache, [comicid, 'comciVolumns', volumnid, 'imageids'], true) && !forceRefetch) {
      return hhApp.comicCache[comicid].comicVolumns[volumnid].imageids;
    }
    return hhAppParser.GM_xhr_get(hhAppConfig.volumnUrl(comicid, volumnid, serverid)).then(
      _volumnHTML => {
        const volumnHTML        = _volumnHTML.responseText;
        // volumnPicList is long string like 'abczfgzghzjazjjaz...'
        // get salt 'abcdefghjkz' from [serverJsIndex].js
        // replace each character in the long string by char's index in the salt
        // notice the char 'z' in the salt, not replace it, but use it as a split flag
        // then split the replaced string by the flag and will get an array like:
        // [123, 78, ....], it is an ascii code array. get chars and join the array
        // will get `[imgUrl]|[imgUlr]...`, split it by '|'
        // get baseurl from [serverJsIndex].js, join it to [imgUrl] to get complete urls
        let volumnPicList       = volumnHTML.match(hhAppConfig.reg_VolumnPicList)[1];
        const serverJsIndex     = volumnHTML.match(hhAppConfig.reg_ServerJsIndex)[1];
        return hhAppParser.fetchServerUrls(serverJsIndex, serverid).then(
          ({ serverUrl, serverEncode }) => {
            for (let i = 0; i < 10; i++) {
              const reg = new RegExp(`${serverEncode.charAt(i)}`, 'g');
              volumnPicList = volumnPicList.replace(reg, i);
            }
            const volumnPicListSplit  = volumnPicList.split(serverEncode.charAt(10));
            const volumnPicListDecode = volumnPicListSplit.map(asc => String.fromCharCode(asc)).join('');
            const volumnPicListUrls   = volumnPicListDecode.split('|').map(url => serverUrl + url);

            return volumnPicListUrls;
          },
          () => {}
        )
      },
      () => {}
    );
  },
  fetchServerUrls(serverJsIndex, serverid) {
    if (hhApp.serverUrls.hasOwnProperty('serverJsIndex')) {
      return {
        serverUrl: hhApp.serverUrls[serverJsIndex][serverid],
        serverEncode: hhApp.serEncodes[serverJsIndex],
      };
    }
    return hhAppParser.GM_xhr_get(hhAppConfig.serverJsUrl(serverJsIndex)).then(
      _serverJsHTML => {
        const serverJsHTML  = _serverJsHTML.responseText;
        const serverEncode  = serverJsHTML.match(hhAppConfig.reg_ServerEncode)[1];
        let serverMatch     = '';
        let serverUrls      = [];
        while ((serverMatch = hhAppConfig.reg_ServerList.exec(serverJsHTML)) != null) {
          serverUrls.push(serverMatch[1]);
        }
        Object.assign(hhApp.serverUrls, {
          [serverJsIndex]: serverUrls
        });
        Object.assign(hhApp.serverEncodes, {
          [serverJsIndex]: serverEncode
        });
        return {
          serverUrl: serverUrls[serverid],
          serverEncode,
        };
      },
      () => {}
    );
  },
  // a promise version of GM_xmlhttpRequest GET
  GM_xhr_get(url) {
    return new Promise((resolve, reject) => {
      GM_xmlhttpRequest({
        url: hhAppConfig.baseUrl + url,
        method: 'GET',
        timeout: 20 * 1000,
        context: { resolve, reject },
        overrideMimeType: "text/html;charset=" + document.characterSet,
        onload: response => response.context.resolve(response),
        onerror: err => err.context.reject(err)
      })
    });
  },
};
